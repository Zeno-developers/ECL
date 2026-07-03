<?php

namespace App\Service;

use App\Database;
use App\Services\WhatsAppService;
use App\Services\SMTPConfigService;
use PHPMailer\PHPMailer\PHPMailer;
use Exception;

class MemberFollowUpEmailService
{
    private $db;
    private array $queueColumns = [];

    public function __construct($db = null)
    {
        $this->db = $db ?: Database::getInstance();
        $this->ensureSchema();
    }

    public function ensureSchema(): void
    {
        try {
            $isSqlite = $this->db->getDriver() === 'sqlite';

            if ($isSqlite) {
                $this->db->query(
                    "CREATE TABLE IF NOT EXISTS member_email_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        member_id INTEGER NULL,
                        sent_by INTEGER NULL,
                        recipient_email TEXT NOT NULL,
                        recipient_name TEXT,
                        recipient_type TEXT DEFAULT 'member',
                        subject TEXT NOT NULL,
                        html_body TEXT,
                        text_body TEXT,
                        email_type TEXT DEFAULT 'follow_up',
                        source TEXT DEFAULT 'manual',
                        status TEXT DEFAULT 'sent',
                        related_absence_flag_id INTEGER NULL,
                        related_follow_up_note_id INTEGER NULL,
                        queue_id INTEGER NULL,
                        error_message TEXT,
                        sent_at DATETIME NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )"
                );
                foreach ([
                    'CREATE INDEX IF NOT EXISTS idx_member_email_logs_member ON member_email_logs (member_id)',
                    'CREATE INDEX IF NOT EXISTS idx_member_email_logs_sent_by ON member_email_logs (sent_by)',
                    'CREATE INDEX IF NOT EXISTS idx_member_email_logs_status ON member_email_logs (status)',
                    'CREATE INDEX IF NOT EXISTS idx_member_email_logs_created_at ON member_email_logs (created_at)',
                    'CREATE INDEX IF NOT EXISTS idx_member_email_logs_sent_at ON member_email_logs (sent_at)',
                    'CREATE INDEX IF NOT EXISTS idx_member_email_logs_source ON member_email_logs (source)',
                    'CREATE INDEX IF NOT EXISTS idx_member_email_logs_recipient_type ON member_email_logs (recipient_type)',
                ] as $idx) {
                    $this->db->query($idx);
                }
            } else {
                $this->db->query(
                    "CREATE TABLE IF NOT EXISTS member_email_logs (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        member_id INT NULL,
                        sent_by INT NULL,
                        recipient_email VARCHAR(255) NOT NULL,
                        recipient_name VARCHAR(255),
                        recipient_type VARCHAR(50) DEFAULT 'member',
                        subject VARCHAR(255) NOT NULL,
                        html_body LONGTEXT,
                        text_body LONGTEXT,
                        email_type VARCHAR(100) DEFAULT 'follow_up',
                        source VARCHAR(100) DEFAULT 'manual',
                        status VARCHAR(20) DEFAULT 'sent',
                        related_absence_flag_id INT NULL,
                        related_follow_up_note_id INT NULL,
                        queue_id INT NULL,
                        error_message TEXT,
                        sent_at DATETIME NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_member_email_logs_member (member_id),
                        INDEX idx_member_email_logs_sent_by (sent_by),
                        INDEX idx_member_email_logs_status (status),
                        INDEX idx_member_email_logs_created_at (created_at),
                        INDEX idx_member_email_logs_sent_at (sent_at),
                        INDEX idx_member_email_logs_source (source),
                        INDEX idx_member_email_logs_recipient_type (recipient_type),
                        FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE SET NULL,
                        FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL
                    )"
                );
            }
        } catch (Exception $e) {
            error_log('MemberFollowUpEmailService ensureSchema failed: ' . $e->getMessage());
        }
    }

    public function getOverview(array $viewer): array
    {
        $scope = $this->buildScopeSql($viewer);
        $params = $scope['params'];

        $totalMembers = $this->db->first(
            "SELECT COUNT(*) as count
             FROM users u
             WHERE u.is_active = 1 {$scope['where']}",
            $params
        );

        $flaggedMembers = $this->db->first(
            "SELECT COUNT(DISTINCT af.user_id) as count
             FROM absence_flags af
             JOIN users u ON af.user_id = u.id
             WHERE af.resolved_at IS NULL {$scope['member_where']}",
            $params
        );

        $emailsSentToday = $this->db->first(
            "SELECT COUNT(*) as count
             FROM member_email_logs mel
             JOIN users u ON mel.member_id = u.id
             WHERE DATE(COALESCE(mel.sent_at, mel.created_at)) = CURRENT_DATE
             {$scope['member_where']}",
            $params
        );

        $queuedEmails = $this->db->first(
            "SELECT COUNT(*) as count
             FROM member_email_logs mel
             JOIN users u ON mel.member_id = u.id
             WHERE mel.status = 'queued'
             {$scope['member_where']}",
            $params
        );

        $membersWithHistory = $this->db->first(
            "SELECT COUNT(DISTINCT mel.member_id) as count
             FROM member_email_logs mel
             JOIN users u ON mel.member_id = u.id
             {$scope['member_where']}",
            $params
        );

        return [
            'total_members' => (int)($totalMembers['count'] ?? 0),
            'flagged_members' => (int)($flaggedMembers['count'] ?? 0),
            'emails_sent_today' => (int)($emailsSentToday['count'] ?? 0),
            'queued_emails' => (int)($queuedEmails['count'] ?? 0),
            'members_with_history' => (int)($membersWithHistory['count'] ?? 0),
        ];
    }

    public function getMembers(array $viewer, string $search = '', int $page = 1, int $limit = 20): array
    {
        $this->ensureSchema();

        $page = max(1, $page);
        $limit = max(5, min(50, $limit));
        $offset = ($page - 1) * $limit;
        $scope = $this->buildScopeSql($viewer);

        $searchSql = '';
        $params = $scope['params'];
        $isSqlite = $this->db->getDriver() === 'sqlite';
        if ($search !== '') {
            $concatExpr = $isSqlite
                ? "(u.first_name || ' ' || u.last_name)"
                : "CONCAT(u.first_name, ' ', u.last_name)";
            $searchSql = " AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR {$concatExpr} LIKE ?)";
            $searchTerm = '%' . $search . '%';
            array_push($params, $searchTerm, $searchTerm, $searchTerm, $searchTerm);
        }

        $sql = "
            SELECT
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
                u.role,
                u.cell_id,
                u.zone_id,
                c.name as cell_name,
                z.name as zone_name,
                COALESCE(flag_data.open_flags, 0) as open_flags,
                flag_data.last_flagged_at,
                flag_data.consecutive_sunday_misses,
                flag_data.consecutive_cell_misses,
                COALESCE(email_data.total_emails, 0) as total_emails,
                email_data.last_email_at,
                email_data.last_email_subject,
                email_data.last_email_status,
                email_data.last_recipient_type
            FROM users u
            LEFT JOIN cells c ON u.cell_id = c.id
            LEFT JOIN zones z ON u.zone_id = z.id
            LEFT JOIN (
                SELECT
                    af.user_id,
                    COUNT(*) as open_flags,
                    MAX(af.flagged_at) as last_flagged_at,
                    MAX(af.consecutive_sunday_misses) as consecutive_sunday_misses,
                    MAX(af.consecutive_cell_misses) as consecutive_cell_misses
                FROM absence_flags af
                WHERE af.resolved_at IS NULL
                GROUP BY af.user_id
            ) flag_data ON flag_data.user_id = u.id
            LEFT JOIN (
                SELECT
                    mel.member_id,
                    COUNT(*) as total_emails,
                    MAX(COALESCE(mel.sent_at, mel.created_at)) as last_email_at,
                    (SELECT mel2.subject FROM member_email_logs mel2 WHERE mel2.member_id = mel.member_id ORDER BY COALESCE(mel2.sent_at, mel2.created_at) DESC LIMIT 1) as last_email_subject,
                    (SELECT mel2.status FROM member_email_logs mel2 WHERE mel2.member_id = mel.member_id ORDER BY COALESCE(mel2.sent_at, mel2.created_at) DESC LIMIT 1) as last_email_status,
                    (SELECT mel2.recipient_type FROM member_email_logs mel2 WHERE mel2.member_id = mel.member_id ORDER BY COALESCE(mel2.sent_at, mel2.created_at) DESC LIMIT 1) as last_recipient_type
                FROM member_email_logs mel
                GROUP BY mel.member_id
            ) email_data ON email_data.member_id = u.id
            WHERE u.is_active = 1 {$scope['where']}{$searchSql}
            ORDER BY COALESCE(flag_data.open_flags, 0) DESC, COALESCE(email_data.last_email_at, u.created_at) DESC, u.first_name ASC
            LIMIT ? OFFSET ?
        ";

        $countSql = "
            SELECT COUNT(*) as count
            FROM users u
            WHERE u.is_active = 1 {$scope['where']}{$searchSql}
        ";

        $rows = $this->db->all($sql, array_merge($params, [$limit, $offset]));
        $total = $this->db->first($countSql, $params)['count'] ?? 0;

        return [
            'members' => array_map([$this, 'normalizeMemberRow'], $rows),
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => (int)$total,
                'pages' => (int)ceil(((int)$total) / $limit),
            ],
        ];
    }

    public function getMemberByIdForViewer(int $memberId, array $viewer): ?array
    {
        $member = $this->db->first(
            "SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, u.cell_id, u.zone_id, c.name as cell_name, z.name as zone_name
             FROM users u
             LEFT JOIN cells c ON u.cell_id = c.id
             LEFT JOIN zones z ON u.zone_id = z.id
             WHERE u.id = ? AND u.is_active = 1",
            [$memberId]
        );

        if (!$member || !$this->canViewMember($viewer, $member)) {
            return null;
        }

        return $this->normalizeMemberRow($member);
    }

    public function getMemberEmailHistory(int $memberId, int $page = 1, int $limit = 15): array
    {
        $this->ensureSchema();

        $page = max(1, $page);
        $limit = max(5, min(50, $limit));
        $offset = ($page - 1) * $limit;

        $rows = $this->db->all(
            "SELECT
                mel.*,
                (COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) as sender_name
             FROM member_email_logs mel
             LEFT JOIN users u ON mel.sent_by = u.id
             WHERE mel.member_id = ?
             ORDER BY COALESCE(mel.sent_at, mel.created_at) DESC
             LIMIT ? OFFSET ?",
            [$memberId, $limit, $offset]
        );

        $total = $this->db->first(
            "SELECT COUNT(*) as count FROM member_email_logs WHERE member_id = ?",
            [$memberId]
        )['count'] ?? 0;

        return [
            'emails' => $rows,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => (int)$total,
                'pages' => (int)ceil(((int)$total) / $limit),
            ],
        ];
    }

    public function sendMemberEmail(array $member, string $subject, string $message, int $sentByUserId = 0, array $meta = []): array
    {
        $this->ensureSchema();

        $recipientEmail = trim((string)($member['email'] ?? ''));
        $recipientName = trim(($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? ''));
        if ($recipientEmail === '') {
            return [
                'success' => false,
                'status' => 'failed',
                'message' => 'Selected member does not have an email address.',
            ];
        }

        $cleanSubject = trim($subject) !== '' ? $subject : 'A note from Eternal Love Church';
        $htmlBody = $this->renderEmailTemplate($recipientName ?: 'member', $cleanSubject, $message);
        $textBody = $this->renderPlainText($recipientName ?: 'member', $cleanSubject, $message);

        $sendResult = $this->deliverEmail($recipientEmail, $recipientName, $cleanSubject, $htmlBody, $textBody);
        $status = $sendResult['status'];
        $queueId = null;

        if ($status === 'queued') {
            $queueId = $this->queueEmail(
                $recipientEmail,
                $recipientName,
                $cleanSubject,
                $htmlBody,
                $textBody,
                $sendResult['error_message'] ?? 'SMTP unavailable'
            );
        }

        $logId = $this->recordEmailLog([
            'member_id' => (int)($member['id'] ?? 0),
            'sent_by' => $sentByUserId > 0 ? $sentByUserId : null,
            'recipient_email' => $recipientEmail,
            'recipient_name' => $recipientName ?: null,
            'recipient_type' => $meta['recipient_type'] ?? 'member',
            'subject' => $cleanSubject,
            'html_body' => $htmlBody,
            'text_body' => $textBody,
            'email_type' => $meta['email_type'] ?? 'follow_up',
            'source' => $meta['source'] ?? 'manual_follow_up',
            'status' => $status,
            'related_absence_flag_id' => isset($meta['related_absence_flag_id']) ? (int)$meta['related_absence_flag_id'] : null,
            'related_follow_up_note_id' => isset($meta['related_follow_up_note_id']) ? (int)$meta['related_follow_up_note_id'] : null,
            'queue_id' => $queueId,
            'error_message' => $sendResult['error_message'] ?? null,
            'sent_at' => $status === 'sent' ? date('Y-m-d H:i:s') : null,
        ]);

        // SMS pastoral follow-up (fires alongside email)
        if (!empty($member['phone'])) {
            try {
                $wa = new WhatsAppService();
                $firstName = trim($member['first_name'] ?? $recipientName);
                $snippet   = mb_substr(strip_tags((string)$message), 0, 300);
                if (mb_strlen(strip_tags((string)$message)) > 300) $snippet .= '...';
                $smsBody = "Hi $firstName, pastoral message from ELC:\n\n$snippet";
                $wa->send([['phone' => $member['phone']]], $smsBody);
            } catch (Exception $smsErr) {
                error_log('Pastoral follow-up WhatsApp failed: ' . $smsErr->getMessage());
            }
        }

        return [
            'success' => in_array($status, ['sent', 'queued'], true),
            'status' => $status,
            'message' => $status === 'sent'
                ? 'Email sent successfully.'
                : ($status === 'queued' ? 'SMTP is unavailable right now. The email was queued.' : 'Unable to send the email.'),
            'log_id' => $logId,
            'queue_id' => $queueId,
            'email' => [
                'recipient_email' => $recipientEmail,
                'recipient_name' => $recipientName,
                'subject' => $cleanSubject,
            ],
        ];
    }

    public function recordEmailLog(array $data): int
    {
        $payload = [
            'member_id' => $data['member_id'] ?? null,
            'sent_by' => $data['sent_by'] ?? null,
            'recipient_email' => $data['recipient_email'] ?? '',
            'recipient_name' => $data['recipient_name'] ?? null,
            'recipient_type' => $data['recipient_type'] ?? 'member',
            'subject' => $data['subject'] ?? 'Follow-up email',
            'html_body' => $data['html_body'] ?? null,
            'text_body' => $data['text_body'] ?? null,
            'email_type' => $data['email_type'] ?? 'follow_up',
            'source' => $data['source'] ?? 'manual_follow_up',
            'status' => $data['status'] ?? 'sent',
            'related_absence_flag_id' => $data['related_absence_flag_id'] ?? null,
            'related_follow_up_note_id' => $data['related_follow_up_note_id'] ?? null,
            'queue_id' => $data['queue_id'] ?? null,
            'error_message' => $data['error_message'] ?? null,
            'sent_at' => $data['sent_at'] ?? null,
            'created_at' => $data['created_at'] ?? date('Y-m-d H:i:s'),
        ];

        return (int)$this->db->insert('member_email_logs', $payload);
    }

    private function deliverEmail(string $to, string $name, string $subject, string $htmlBody, string $textBody): array
    {
        try {
            $mail = SMTPConfigService::createFreshMailer();
            $mail->addAddress($to, $name);
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $htmlBody;
            $mail->AltBody = $textBody ?: strip_tags($htmlBody);

            if ($mail->send()) {
                return [
                    'status' => 'sent',
                    'error_message' => null,
                ];
            }

            return [
                'status' => 'queued',
                'error_message' => $mail->ErrorInfo ?: 'SMTP send failed',
            ];
        } catch (Exception $e) {
            error_log('MemberFollowUpEmailService send failed: ' . $e->getMessage());
            return [
                'status' => 'queued',
                'error_message' => $e->getMessage(),
            ];
        }
    }

    private function queueEmail(string $recipientEmail, string $recipientName, string $subject, string $body, string $textBody, string $errorMessage): ?int
    {
        try {
            $columns = $this->getQueueColumns();
            if (empty($columns)) {
                return null;
            }

            $payload = [];
            if (isset($columns['recipient_email'])) {
                $payload['recipient_email'] = $recipientEmail;
            }
            if (isset($columns['recipient_name'])) {
                $payload['recipient_name'] = $recipientName ?: null;
            }
            if (isset($columns['subject'])) {
                $payload['subject'] = $subject;
            }
            if (isset($columns['body'])) {
                $payload['body'] = $body;
            }
            if (isset($columns['message'])) {
                $payload['message'] = $body;
            }
            if (isset($columns['text_body'])) {
                $payload['text_body'] = $textBody;
            }
            if (isset($columns['email_type'])) {
                $payload['email_type'] = 'follow_up';
            }
            if (isset($columns['status'])) {
                $payload['status'] = 'pending';
            }
            if (isset($columns['attempts'])) {
                $payload['attempts'] = 0;
            }
            if (isset($columns['max_attempts'])) {
                $payload['max_attempts'] = 5;
            }
            if (isset($columns['retry_count'])) {
                $payload['retry_count'] = 0;
            }
            if (isset($columns['max_retries'])) {
                $payload['max_retries'] = 5;
            }
            if (isset($columns['error_message'])) {
                $payload['error_message'] = $errorMessage;
            }
            if (isset($columns['last_error'])) {
                $payload['last_error'] = $errorMessage;
            }
            if (isset($columns['created_at'])) {
                $payload['created_at'] = date('Y-m-d H:i:s');
            }
            if (isset($columns['updated_at'])) {
                $payload['updated_at'] = date('Y-m-d H:i:s');
            }

            return (int)$this->db->insert('email_queue', $payload);
        } catch (Exception $e) {
            error_log('MemberFollowUpEmailService queue failed: ' . $e->getMessage());
            return null;
        }
    }

    private function getQueueColumns(): array
    {
        if (!empty($this->queueColumns)) {
            return $this->queueColumns;
        }

        try {
            if ($this->db->getDriver() === 'sqlite') {
                $rows = $this->db->all('PRAGMA table_info(email_queue)');
                foreach ($rows as $row) {
                    if (!empty($row['name'])) {
                        $this->queueColumns[$row['name']] = true;
                    }
                }
            } else {
                $rows = $this->db->all('SHOW COLUMNS FROM email_queue');
                foreach ($rows as $row) {
                    if (!empty($row['Field'])) {
                        $this->queueColumns[$row['Field']] = true;
                    }
                }
            }
        } catch (Exception $e) {
            error_log('MemberFollowUpEmailService queue schema inspection failed: ' . $e->getMessage());
        }

        return $this->queueColumns;
    }

    private function renderEmailTemplate(string $memberName, string $subject, string $message): string
    {
        $safeName = htmlspecialchars($memberName, ENT_QUOTES, 'UTF-8');
        $safeSubject = htmlspecialchars($subject, ENT_QUOTES, 'UTF-8');
        $safeMessage = nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8'));
        $prayerLink = htmlspecialchars($this->getPrayerLink(), ENT_QUOTES, 'UTF-8');

        return <<<HTML
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#1f2937;">
  <div style="max-width:680px;margin:0 auto;padding:32px 18px;">
    <div style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);color:#fff;padding:28px;border-radius:24px 24px 0 0;">
      <div style="font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;opacity:0.9;">Pastoral follow-up</div>
      <h2 style="margin:10px 0 0;font-size:28px;line-height:1.2;">{$safeSubject}</h2>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 24px 24px;padding:28px;">
      <p style="font-size:16px;margin-top:0;">Dear {$safeName},</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:20px;margin:20px 0;">
        {$safeMessage}
      </div>
      <p style="margin:20px 0 10px;">If you would like prayer or a private conversation with a pastor, please visit our prayer page.</p>
      <p style="margin:0 0 24px;"><a href="{$prayerLink}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700;">Send a Prayer Request</a></p>
      <p style="margin-bottom:0;">With care,<br><strong>Eternal Love Church Pastoral Team</strong></p>
    </div>
  </div>
</body>
</html>
HTML;
    }

    private function renderPlainText(string $memberName, string $subject, string $message): string
    {
        return trim(
            "Dear {$memberName},\n\n" .
            $message . "\n\n" .
            "If you would like prayer or a private conversation with a pastor, please visit: " . $this->getPrayerLink() . "\n\n" .
            "With care,\nEternal Love Church Pastoral Team"
        );
    }

    private function getPrayerLink(): string
    {
        $base = getenv('FRONTEND_URL') ?: getenv('APP_URL') ?: '';
        if ($base === '') {
            return '/prayer';
        }

        return rtrim($base, '/') . '/prayer';
    }

    private function buildScopeSql(array $viewer): array
    {
        $role = (string)($viewer['role'] ?? '');
        $zoneId = (int)($viewer['zone_id'] ?? 0);
        $cellId = (int)($viewer['cell_id'] ?? 0);

        if (in_array($role, ['admin', 'pastor', 'superadmin', 'elder'], true)) {
            return [
                'where' => '',
                'member_where' => '',
                'params' => [],
            ];
        }

        if ($role === 'zone_leader' && $zoneId > 0) {
            return [
                'where' => ' AND u.zone_id = ?',
                'member_where' => ' AND u.zone_id = ?',
                'params' => [$zoneId],
            ];
        }

        if ($role === 'cell_leader' && $cellId > 0) {
            return [
                'where' => ' AND u.cell_id = ?',
                'member_where' => ' AND u.cell_id = ?',
                'params' => [$cellId],
            ];
        }

        return [
            'where' => ' AND 1 = 0',
            'member_where' => ' AND 1 = 0',
            'params' => [],
        ];
    }

    private function canViewMember(array $viewer, array $member): bool
    {
        $role = (string)($viewer['role'] ?? '');
        if (in_array($role, ['admin', 'pastor', 'superadmin', 'elder'], true)) {
            return true;
        }

        if ($role === 'zone_leader' && (int)($viewer['zone_id'] ?? 0) > 0) {
            return (int)($viewer['zone_id'] ?? 0) === (int)($member['zone_id'] ?? 0);
        }

        if ($role === 'cell_leader' && (int)($viewer['cell_id'] ?? 0) > 0) {
            return (int)($viewer['cell_id'] ?? 0) === (int)($member['cell_id'] ?? 0);
        }

        return false;
    }

    private function normalizeMemberRow(array $member): array
    {
        $member['id'] = (int)($member['id'] ?? 0);
        $member['name'] = trim(($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? ''));
        $member['open_flags'] = (int)($member['open_flags'] ?? 0);
        $member['total_emails'] = (int)($member['total_emails'] ?? 0);
        $member['consecutive_sunday_misses'] = (int)($member['consecutive_sunday_misses'] ?? 0);
        $member['consecutive_cell_misses'] = (int)($member['consecutive_cell_misses'] ?? 0);
        return $member;
    }
}
