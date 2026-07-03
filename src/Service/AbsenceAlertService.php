<?php

namespace App\Service;

use App\Database;
use App\Services\SMTPConfigService;
use DateTime;
use Exception;
use PHPMailer\PHPMailer\PHPMailer;

class AbsenceAlertService
{
    private $db;
    private array $emailQueueColumns = [];
    private ?MemberFollowUpEmailService $memberEmailLogger = null;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->memberEmailLogger = new MemberFollowUpEmailService($this->db);
    }

    /**
     * Recalculate absence flags and send follow-up notifications.
     *
     * This flags members when:
     * - they miss at least 2 consecutive Sunday services, or
     * - they are assigned to a cell and miss at least 2 consecutive cell meetings.
     *
     * Cell-based absence tracking is skipped for members who are not assigned to a cell.
     */
    public function process(string $referenceDate = null): array
    {
        $referenceDate = $referenceDate ?: date('Y-m-d');
        $results = [
            'evaluated' => 0,
            'flagged' => 0,
            'notified' => 0,
            'queued' => 0,
            'errors' => [],
        ];

        $members = $this->db->all(
            "SELECT u.id, u.first_name, u.last_name, u.email, u.cell_id, u.zone_id,
                    c.name as cell_name, c.cell_leader_id, c.meeting_day, c.meeting_time
             FROM users u
             LEFT JOIN cells c ON u.cell_id = c.id
             WHERE u.is_active = 1 AND u.role IN ('member', 'cell_leader')"
        );

        foreach ($members as $member) {
            $results['evaluated']++;

            try {
                $sundayMisses = $this->getConsecutiveMisses(
                    (int)$member['id'],
                    'attendance_sunday',
                    'attendance_date',
                    'Sunday',
                    $referenceDate
                );

                $cellMisses = 0;
                $cellMeetingDay = null;
                if (!empty($member['cell_id']) && !empty($member['meeting_day'])) {
                    $cellMeetingDay = strtolower((string)$member['meeting_day']);
                    $cellMisses = $this->getConsecutiveMisses(
                        (int)$member['id'],
                        'attendance_cell',
                        'meeting_date',
                        $cellMeetingDay,
                        $referenceDate,
                        (int)$member['cell_id']
                    );
                }

                $shouldFlagSunday = $sundayMisses >= 2;
                $shouldFlagCell = !empty($member['cell_id']) && $cellMisses >= 2;

                if (!$shouldFlagSunday && !$shouldFlagCell) {
                    continue;
                }

                $flagType = $shouldFlagSunday && $shouldFlagCell
                    ? 'combined'
                    : ($shouldFlagCell ? 'cell' : 'sunday');

                $existingFlag = $this->db->first(
                    "SELECT * FROM absence_flags WHERE user_id = ? AND resolved_at IS NULL ORDER BY flagged_at DESC LIMIT 1",
                    [$member['id']]
                );

                $flagData = [
                    'user_id' => (int)$member['id'],
                    'consecutive_sunday_misses' => $sundayMisses,
                    'consecutive_cell_misses' => $cellMisses,
                    'absence_type' => $flagType,
                    'flagged_at' => date('Y-m-d H:i:s'),
                    'notification_sent' => 0,
                ];

                if ($existingFlag) {
                    $this->db->update('absence_flags', $flagData, 'id = ?', [$existingFlag['id']]);
                    $flagId = (int)$existingFlag['id'];
                    $notificationAlreadySent = !empty($existingFlag['notification_sent']);
                } else {
                    $flagId = (int)$this->db->insert('absence_flags', $flagData);
                    $notificationAlreadySent = false;
                    $results['flagged']++;
                }

                if (!$notificationAlreadySent) {
                    $notificationStats = $this->sendAbsenceNotifications([
                        'id' => $flagId,
                        'user_id' => (int)$member['id'],
                        'first_name' => $member['first_name'] ?? '',
                        'last_name' => $member['last_name'] ?? '',
                        'email' => $member['email'] ?? '',
                        'cell_id' => $member['cell_id'] ?? null,
                        'cell_name' => $member['cell_name'] ?? null,
                        'cell_leader_id' => $member['cell_leader_id'] ?? null,
                        'meeting_day' => $member['meeting_day'] ?? null,
                        'meeting_time' => $member['meeting_time'] ?? null,
                        'sunday_misses' => $sundayMisses,
                        'cell_misses' => $cellMisses,
                        'absence_type' => $flagType,
                        'reference_date' => $referenceDate,
                    ]);

                    $results['notified'] += $notificationStats['sent'];
                    $results['queued'] += $notificationStats['queued'];
                }

                $this->db->update('absence_flags', [
                    'notification_sent' => 1,
                ], 'id = ?', [$flagId]);
            } catch (Exception $e) {
                $results['errors'][] = sprintf(
                    'Member %s %s: %s',
                    $member['first_name'] ?? 'Unknown',
                    $member['last_name'] ?? '',
                    $e->getMessage()
                );
                error_log('AbsenceAlertService - ' . end($results['errors']));
            }
        }

        return $results;
    }

    private function getConsecutiveMisses(int $userId, string $attendanceTable, string $dateColumn, string $meetingDay, string $referenceDate, ?int $cellId = null): int
    {
        $scheduledDates = $this->getRecentScheduledDates($meetingDay, 8, $referenceDate);
        $misses = 0;

        foreach ($scheduledDates as $scheduledDate) {
            if ($attendanceTable === 'attendance_cell') {
                $attended = $this->db->first(
                    "SELECT id FROM attendance_cell WHERE user_id = ? AND cell_id = ? AND meeting_date = ? LIMIT 1",
                    [$userId, $cellId, $scheduledDate]
                );
            } else {
                $attended = $this->db->first(
                    "SELECT id FROM attendance_sunday WHERE user_id = ? AND attendance_date = ? LIMIT 1",
                    [$userId, $scheduledDate]
                );
            }

            if ($attended) {
                break;
            }

            $misses++;
        }

        return $misses;
    }

    private function getRecentScheduledDates(string $meetingDay, int $limit, string $referenceDate): array
    {
        $meetingDay = strtolower(trim($meetingDay));
        $allowedDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        if (!in_array($meetingDay, $allowedDays, true)) {
            return [];
        }

        $reference = new DateTime($referenceDate);
        $scheduled = new DateTime($referenceDate);
        $scheduled->modify('this ' . $meetingDay);
        if ($scheduled > $reference) {
            $scheduled->modify('last ' . $meetingDay);
        }

        $dates = [];
        for ($i = 0; $i < $limit; $i++) {
            $dates[] = (clone $scheduled)->modify("-{$i} week")->format('Y-m-d');
        }

        return $dates;
    }

    private function sendAbsenceNotifications(array $member): array
    {
        $results = ['sent' => 0, 'queued' => 0];
        $fullName = trim(($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? ''));
        $memberEmail = trim((string)($member['email'] ?? ''));
        $hasCell = !empty($member['cell_id']);
        $sundayMisses = (int)($member['sunday_misses'] ?? 0);
        $cellMisses = (int)($member['cell_misses'] ?? 0);
        $absenceType = (string)($member['absence_type'] ?? 'sunday');

        $memberSubject = $this->buildMemberSubject($absenceType, $sundayMisses, $cellMisses);
        $memberHtml = $this->renderMemberEmail($member, $absenceType, $sundayMisses, $cellMisses);
        $memberText = $this->renderMemberEmailText($member, $absenceType, $sundayMisses, $cellMisses);

        $this->createNotification(
            (int)$member['user_id'],
            'We missed you',
            trim(strip_tags($memberText)),
            'absence_member_alert'
        );

        if ($memberEmail !== '') {
            $sent = $this->sendEmailOrQueue($memberEmail, $fullName, $memberSubject, $memberHtml, 'absence_member', $memberText);
            $this->recordMemberEmailHistory([
                'member_id' => (int)$member['user_id'],
                'recipient_email' => $memberEmail,
                'recipient_name' => $fullName,
                'recipient_type' => 'member',
                'subject' => $memberSubject,
                'html_body' => $memberHtml,
                'text_body' => $memberText,
                'email_type' => 'absence_member',
                'source' => 'absence_alert',
                'status' => $sent ? 'sent' : 'queued',
                'sent_by' => null,
            ]);

            if ($sent) {
                $results['sent']++;
            } else {
                $results['queued']++;
            }
        }

        $leaderRecipients = [];
        if ($hasCell && !empty($member['cell_leader_id'])) {
            $cellLeader = $this->db->first(
                "SELECT id, email, first_name, last_name FROM users WHERE id = ? AND is_active = 1",
                [$member['cell_leader_id']]
            );
            if ($cellLeader && !empty($cellLeader['email'])) {
                $leaderRecipients[] = [
                    'email' => $cellLeader['email'],
                    'name' => trim(($cellLeader['first_name'] ?? '') . ' ' . ($cellLeader['last_name'] ?? '')),
                    'type' => 'cell_leader',
                    'title' => 'Absence follow-up needed',
                ];
            }
        }

        foreach ($this->getPastorRecipients() as $pastor) {
            $leaderRecipients[] = [
                'email' => $pastor['email'],
                'name' => trim(($pastor['first_name'] ?? '') . ' ' . ($pastor['last_name'] ?? '')),
                'type' => 'pastor',
                'title' => 'Pastoral care follow-up',
            ];
        }

        $leaderRecipients = $this->dedupeRecipients($leaderRecipients);

        foreach ($leaderRecipients as $recipient) {
            $subject = $this->buildLeaderSubject($recipient['type'], $member, $absenceType, $sundayMisses, $cellMisses);
            $html = $this->renderLeaderEmail($member, $recipient['type'], $absenceType, $sundayMisses, $cellMisses);
            $text = $this->renderLeaderEmailText($member, $recipient['type'], $absenceType, $sundayMisses, $cellMisses);

            $sent = $this->sendEmailOrQueue($recipient['email'], $recipient['name'], $subject, $html, 'absence_followup', $text);
            $this->recordMemberEmailHistory([
                'member_id' => (int)$member['user_id'],
                'recipient_email' => $recipient['email'],
                'recipient_name' => $recipient['name'],
                'recipient_type' => $recipient['type'] ?? 'pastor',
                'subject' => $subject,
                'html_body' => $html,
                'text_body' => $text,
                'email_type' => 'absence_followup',
                'source' => 'absence_alert',
                'status' => $sent ? 'sent' : 'queued',
                'sent_by' => null,
            ]);

            if ($sent) {
                $results['sent']++;
            } else {
                $results['queued']++;
            }

            $this->createNotification(
                $this->getUserIdByEmail($recipient['email']),
                $subject,
                trim(strip_tags($text)),
                $recipient['type'] === 'cell_leader' ? 'absence_alert' : 'pastoral_care_alert'
            );
        }

        return $results;
    }

    private function buildMemberSubject(string $absenceType, int $sundayMisses, int $cellMisses): string
    {
        return match ($absenceType) {
            'combined' => 'We missed you at church and cell',
            'cell' => 'We missed you at cell group',
            default => 'We missed you at Sunday service',
        };
    }

    private function buildLeaderSubject(string $recipientType, array $member, string $absenceType, int $sundayMisses, int $cellMisses): string
    {
        $fullName = trim(($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? ''));
        $needs = [];
        if ($sundayMisses >= 2) {
            $needs[] = 'Sunday';
        }
        if ($cellMisses >= 2) {
            $needs[] = 'cell';
        }
        $needsLabel = implode(' and ', $needs) ?: 'attendance';

        return $recipientType === 'cell_leader'
            ? "Follow up needed: {$fullName} missed {$needsLabel}"
            : "Pastoral care follow-up: {$fullName} missed {$needsLabel}";
    }

    private function renderMemberEmail(array $member, string $absenceType, int $sundayMisses, int $cellMisses): string
    {
        $fullName = htmlspecialchars(trim(($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? '')), ENT_QUOTES, 'UTF-8');
        $missSummary = $this->buildMissSummary($sundayMisses, $cellMisses);
        $supportLink = $this->getPrayerRequestLink();

        $supportSection = $supportLink
            ? '<div style="margin-top:18px;"><a href="' . htmlspecialchars($supportLink, ENT_QUOTES, 'UTF-8') . '" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:bold;">Send a Prayer Request</a><p style="margin-top:12px;">If you would like prayer or a private conversation with a pastor, you can also visit the prayer page: <a href="' . htmlspecialchars($supportLink, ENT_QUOTES, 'UTF-8') . '">' . htmlspecialchars($supportLink, ENT_QUOTES, 'UTF-8') . '</a></p></div>'
            : '<p style="margin-top:16px;">If you would like prayer or a private conversation with a pastor, please reply to this email and we will follow up gently.</p>';

        return <<<HTML
<html>
<body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
  <div style="max-width: 640px; margin: 0 auto; padding: 24px;">
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); color: white; padding: 24px; border-radius: 20px 20px 0 0;">
      <h2 style="margin: 0; font-size: 24px;">We missed you, {$fullName}</h2>
      <p style="margin: 8px 0 0; opacity: 0.95;">Eternal Love Church wants to walk with you.</p>
    </div>
    <div style="border: 1px solid #e5e7eb; border-top: 0; padding: 24px; border-radius: 0 0 20px 20px; background: #fff;">
      <p>Hello {$fullName},</p>
      <p>We noticed that you have {$missSummary}. We care about you and wanted to check in kindly.</p>
      <p>If you have been away because of a difficult season, know that you are not alone. We would love to welcome you back, pray with you, and help you reconnect at a pace that feels right for you.</p>
      <p>There is no pressure. If you would like a pastor to contact you, simply reply to this email or send a prayer request.</p>
      {$supportSection}
      <p style="margin-top: 20px;">With love,<br>Eternal Love Church Pastoral Team</p>
    </div>
  </div>
</body>
</html>
HTML;
    }

    private function renderMemberEmailText(array $member, string $absenceType, int $sundayMisses, int $cellMisses): string
    {
        $fullName = trim(($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? ''));
        $supportLink = $this->getPrayerRequestLink();
        $missSummary = $this->buildMissSummary($sundayMisses, $cellMisses);

        return trim(
            "Hello {$fullName},\n\n" .
            "We noticed that you have {$missSummary}. We care about you and wanted to check in kindly.\n\n" .
            "If you have been away because of a difficult season, know that you are not alone. We would love to welcome you back, pray with you, and help you reconnect at a pace that feels right for you.\n\n" .
            "There is no pressure. If you would like a pastor to contact you, please reply to this email" .
            ($supportLink ? " or send a prayer request here: {$supportLink}" : '') .
            ".\n\nWith love,\nEternal Love Church Pastoral Team"
        );
    }

    private function renderLeaderEmail(array $member, string $recipientType, string $absenceType, int $sundayMisses, int $cellMisses): string
    {
        $fullName = htmlspecialchars(trim(($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? '')), ENT_QUOTES, 'UTF-8');
        $cellName = htmlspecialchars((string)($member['cell_name'] ?? 'their cell'), ENT_QUOTES, 'UTF-8');
        $summary = htmlspecialchars($this->buildMissSummary($sundayMisses, $cellMisses), ENT_QUOTES, 'UTF-8');
        $supportLink = $this->getPrayerRequestLink();
        $supportSentence = $supportLink
            ? 'You can also encourage the member to submit a prayer request through the church prayer form.'
            : 'You can also encourage the member to reply to the email and request prayer.';

        $intro = $recipientType === 'cell_leader'
            ? 'Your cell member needs follow-up.'
            : 'Pastoral follow-up has been requested.';

        return <<<HTML
<html>
<body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
  <div style="max-width: 640px; margin: 0 auto; padding: 24px;">
    <div style="background: linear-gradient(135deg, #0f172a 0%, #4f46e5 100%); color: white; padding: 24px; border-radius: 20px 20px 0 0;">
      <h2 style="margin: 0; font-size: 24px;">Attendance follow-up</h2>
      <p style="margin: 8px 0 0; opacity: 0.95;">{$intro}</p>
    </div>
    <div style="border: 1px solid #e5e7eb; border-top: 0; padding: 24px; border-radius: 0 0 20px 20px; background: #fff;">
      <p><strong>Member:</strong> {$fullName}</p>
      <p><strong>Cell:</strong> {$cellName}</p>
      <p><strong>Concern:</strong> {$summary}</p>
      <p>Please reach out with prayer and encouragement. If appropriate, help arrange a short check-in with the pastor.</p>
      <p>{$supportSentence}</p>
      <p style="margin-top: 20px;">Thank you for caring for the flock.</p>
    </div>
  </div>
</body>
</html>
HTML;
    }

    private function renderLeaderEmailText(array $member, string $recipientType, string $absenceType, int $sundayMisses, int $cellMisses): string
    {
        $fullName = trim(($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? ''));
        $cellName = (string)($member['cell_name'] ?? 'their cell');
        $summary = $this->buildMissSummary($sundayMisses, $cellMisses);

        return trim(
            ($recipientType === 'cell_leader' ? 'Your cell member needs follow-up.' : 'Pastoral follow-up has been requested.') . "\n\n" .
            "Member: {$fullName}\n" .
            "Cell: {$cellName}\n" .
            "Concern: {$summary}\n\n" .
            "Please reach out with prayer and encouragement. If appropriate, help arrange a short check-in with the pastor."
        );
    }

    private function buildMissSummary(int $sundayMisses, int $cellMisses): string
    {
        $parts = [];
        if ($sundayMisses >= 2) {
            $parts[] = "{$sundayMisses} missed Sunday services";
        }
        if ($cellMisses >= 2) {
            $parts[] = "{$cellMisses} missed cell meetings";
        }
        return implode(' and ', $parts) ?: 'recent attendance concerns';
    }

    private function sendEmailOrQueue(string $to, string $name, string $subject, string $html, string $emailType, string $textBody): bool
    {
        $to = trim($to);
        if ($to === '') {
            return false;
        }

        try {
            $mail = SMTPConfigService::createFreshMailer();
            $mail->addAddress($to, $name);
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $html;
            $mail->AltBody = $textBody ?: strip_tags($html);

            if ($mail->send()) {
                return true;
            }
        } catch (Exception $e) {
            error_log('AbsenceAlertService email send failed: ' . $e->getMessage());
        }

        $this->queueEmail($to, $name, $subject, $html, $emailType, 'SMTP unavailable or failed to send');
        return false;
    }

    private function queueEmail(string $recipientEmail, string $recipientName, string $subject, string $body, string $emailType, string $errorMessage): void
    {
        try {
            $columns = $this->getEmailQueueColumns();
            $payload = [
                'recipient_email' => $recipientEmail,
                'recipient_name' => $recipientName ?: null,
                'subject' => $subject,
                'body' => $body,
                'status' => 'pending',
            ];

            if (isset($columns['email_type'])) {
                $payload['email_type'] = $emailType;
            }

            if (isset($columns['retry_count'])) {
                $payload['retry_count'] = 0;
                $payload['max_retries'] = 5;
                $payload['last_error'] = $errorMessage;
            } elseif (isset($columns['attempts'])) {
                $payload['attempts'] = 0;
                $payload['max_attempts'] = 5;
                $payload['error_message'] = $errorMessage;
            }

            if (isset($columns['created_at'])) {
                $payload['created_at'] = date('Y-m-d H:i:s');
            }

            if (isset($columns['updated_at'])) {
                $payload['updated_at'] = date('Y-m-d H:i:s');
            }

            $this->db->insert('email_queue', $payload);
        } catch (Exception $e) {
            error_log('AbsenceAlertService queue failure: ' . $e->getMessage());
        }
    }

    private function getEmailQueueColumns(): array
    {
        if (!empty($this->emailQueueColumns)) {
            return $this->emailQueueColumns;
        }

        try {
            $columns = $this->db->all('SHOW COLUMNS FROM email_queue');
            foreach ($columns as $column) {
                $field = $column['Field'] ?? null;
                if ($field) {
                    $this->emailQueueColumns[$field] = true;
                }
            }
        } catch (Exception $e) {
            error_log('AbsenceAlertService failed to inspect email_queue schema: ' . $e->getMessage());
        }

        return $this->emailQueueColumns;
    }

    private function createNotification(int $userId, string $title, string $message, string $type): void
    {
        if ($userId <= 0) {
            return;
        }

        try {
            $this->db->insert('notifications', [
                'user_id' => $userId,
                'title' => $title,
                'message' => $message,
                'type' => $type,
            ]);
        } catch (Exception $e) {
            error_log('AbsenceAlertService notification insert failed: ' . $e->getMessage());
        }
    }

    private function getPastorRecipients(): array
    {
        try {
            $pastors = $this->db->all(
                "SELECT id, email, first_name, last_name
                 FROM users
                 WHERE is_active = 1 AND role IN ('pastor', 'admin', 'superadmin')
                 AND email IS NOT NULL AND email <> ''"
            );

            $configuredEmail = $this->db->first(
                "SELECT value FROM settings WHERE key_name = 'pastor_report_email' LIMIT 1"
            );

            if (!empty($configuredEmail['value'])) {
                $email = trim($configuredEmail['value']);
                if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $pastors[] = [
                        'id' => 0,
                        'email' => $email,
                        'first_name' => 'Church',
                        'last_name' => 'Pastor',
                    ];
                }
            }

            return $this->dedupeRecipients(array_map(function ($pastor) {
                return [
                    'email' => $pastor['email'],
                    'name' => trim(($pastor['first_name'] ?? '') . ' ' . ($pastor['last_name'] ?? '')),
                    'type' => 'pastor',
                ];
            }, $pastors));
        } catch (Exception $e) {
            error_log('AbsenceAlertService failed to load pastors: ' . $e->getMessage());
            return [];
        }
    }

    private function dedupeRecipients(array $recipients): array
    {
        $seen = [];
        $unique = [];

        foreach ($recipients as $recipient) {
            $email = strtolower(trim((string)($recipient['email'] ?? '')));
            if ($email === '' || isset($seen[$email])) {
                continue;
            }
            $seen[$email] = true;
            $unique[] = $recipient;
        }

        return $unique;
    }

    private function getUserIdByEmail(string $email): int
    {
        try {
            $user = $this->db->first("SELECT id FROM users WHERE email = ? LIMIT 1", [$email]);
            return (int)($user['id'] ?? 0);
        } catch (Exception $e) {
            return 0;
        }
    }

    private function getPrayerRequestLink(): string
    {
        $base = getenv('FRONTEND_URL') ?: getenv('APP_URL') ?: '';
        if ($base === '') {
            return '/prayer';
        }

        return rtrim($base, '/') . '/prayer';
    }

    private function recordMemberEmailHistory(array $data): void
    {
        if (!$this->memberEmailLogger) {
            return;
        }

        try {
            $this->memberEmailLogger->recordEmailLog($data);
        } catch (Exception $e) {
            error_log('AbsenceAlertService failed to record email history: ' . $e->getMessage());
        }
    }
}
