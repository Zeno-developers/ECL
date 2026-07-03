<?php
/**
 * Cron Job: Send Weekly Pastor and Zone Leader Reports
 *
 * Usage: php backend/cron/send_weekly_reports.php
 */

require_once __DIR__ . '/../src/bootstrap.php';

use App\Database;

class WeeklyReportMailer
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function run(): void
    {
        $endDate = date('Y-m-d');
        $startDate = date('Y-m-d', strtotime('-6 days'));
        $sundayDate = $this->getMostRecentSunday($endDate);

        echo "[" . date('Y-m-d H:i:s') . "] Sending weekly reports for {$startDate} to {$endDate}\n";

        $this->sendPastorReports($startDate, $endDate, $sundayDate);
        $this->sendZoneLeaderReports($startDate, $endDate);
    }

    private function sendPastorReports(string $startDate, string $endDate, string $sundayDate): void
    {
        $pastors = $this->db->all(
            "SELECT id, email, first_name, last_name FROM users
             WHERE is_active = 1 AND role IN ('pastor', 'admin', 'superadmin') AND email IS NOT NULL"
        );

        $summary = $this->db->first(
            "SELECT
                COUNT(DISTINCT s.user_id) as sunday_attendees,
                COUNT(DISTINCT c.user_id) as cell_attendees
             FROM users u
             LEFT JOIN attendance_sunday s ON s.user_id = u.id AND s.attendance_date BETWEEN ? AND ?
             LEFT JOIN attendance_cell c ON c.user_id = u.id AND c.meeting_date BETWEEN ? AND ?
             WHERE u.is_active = 1 AND u.role IN ('member', 'cell_leader')",
            [$startDate, $endDate, $startDate, $endDate]
        );

        $flags = $this->db->first(
            "SELECT COUNT(*) as count FROM absence_flags WHERE resolved_at IS NULL"
        )['count'] ?? 0;

        $newMembers = $this->db->first(
            "SELECT COUNT(*) as count FROM users
             WHERE is_active = 1 AND role IN ('member', 'cell_leader') AND DATE(created_at) BETWEEN ? AND ?",
            [$startDate, $endDate]
        )['count'] ?? 0;

        $newCells = $this->db->first(
            "SELECT COUNT(*) as count FROM cells WHERE DATE(created_at) BETWEEN ? AND ?",
            [$startDate, $endDate]
        )['count'] ?? 0;

        $promotions = $this->db->first(
            "SELECT COUNT(*) as count FROM activity_logs
             WHERE action = 'leader_promoted' AND DATE(created_at) BETWEEN ? AND ?",
            [$startDate, $endDate]
        )['count'] ?? 0;

        $sundayCollections = $this->getSundayCollectionSummary($sundayDate);

        $body = "Weekly Attendance Summary\n\n"
            . "Period: {$startDate} to {$endDate}\n"
            . "Sunday attendees: " . (int)($summary['sunday_attendees'] ?? 0) . "\n"
            . "Cell meeting attendees: " . (int)($summary['cell_attendees'] ?? 0) . "\n"
            . "Open absence flags: {$flags}\n"
            . "New members: {$newMembers}\n"
            . "New cells formed: {$newCells}\n"
            . "Leadership promotions: {$promotions}\n\n"
            . "Sunday Collection Summary ({$sundayDate})\n"
            . "Total amount: R " . number_format((float)($sundayCollections['total_amount'] ?? 0), 2) . "\n"
            . "Total entries: " . (int)($sundayCollections['total_entries'] ?? 0) . "\n";

        if (!empty($sundayCollections['by_fund'])) {
            $body .= "By fund:\n";
            foreach ($sundayCollections['by_fund'] as $fundRow) {
                $body .= "- " . ($fundRow['fund'] ?: 'General')
                    . ": R " . number_format((float)($fundRow['total'] ?? 0), 2) . "\n";
            }
        }

        $configuredPastorEmail = $this->db->first(
            "SELECT value FROM settings WHERE key_name = 'pastor_report_email' LIMIT 1"
        )['value'] ?? null;

        $emailRecipients = [];
        if ($configuredPastorEmail && filter_var($configuredPastorEmail, FILTER_VALIDATE_EMAIL)) {
            $emailRecipients[] = strtolower(trim($configuredPastorEmail));
        }

        foreach ($pastors as $pastor) {
            if (!empty($pastor['email']) && filter_var($pastor['email'], FILTER_VALIDATE_EMAIL)) {
                $emailRecipients[] = strtolower(trim($pastor['email']));
            }
        }

        $emailRecipients = array_values(array_unique($emailRecipients));

        foreach ($pastors as $pastor) {
            $this->createNotification((int)$pastor['id'], 'Weekly Attendance Report', $body, 'weekly_pastor_report');
        }

        foreach ($emailRecipients as $recipientEmail) {
            $this->sendEmail($recipientEmail, 'Weekly Attendance Report', $body);
        }
    }

    private function sendZoneLeaderReports(string $startDate, string $endDate): void
    {
        $zoneLeaders = $this->db->all(
            "SELECT u.id, u.email, u.first_name, u.last_name, z.id as zone_id, z.name as zone_name
             FROM users u
             JOIN zones z ON z.zone_leader_id = u.id
             WHERE u.is_active = 1 AND u.role = 'zone_leader' AND u.email IS NOT NULL"
        );

        foreach ($zoneLeaders as $leader) {
            $summary = $this->db->first(
                "SELECT
                    COUNT(DISTINCT u.id) as total_members,
                    COUNT(DISTINCT s.user_id) as sunday_attendees,
                    COUNT(DISTINCT c.user_id) as cell_attendees
                 FROM users u
                 LEFT JOIN attendance_sunday s ON s.user_id = u.id AND s.attendance_date BETWEEN ? AND ?
                 LEFT JOIN attendance_cell c ON c.user_id = u.id AND c.meeting_date BETWEEN ? AND ?
                 WHERE u.is_active = 1 AND u.zone_id = ?",
                [$startDate, $endDate, $startDate, $endDate, $leader['zone_id']]
            );

            $flags = $this->db->first(
                "SELECT COUNT(*) as count
                 FROM absence_flags af
                 JOIN users u ON u.id = af.user_id
                 WHERE af.resolved_at IS NULL AND u.zone_id = ?",
                [$leader['zone_id']]
            )['count'] ?? 0;

            $cellChanges = $this->db->first(
                "SELECT COUNT(*) as count
                 FROM cell_change_requests ccr
                 JOIN users u ON u.id = ccr.user_id
                 JOIN cells requested_cell ON requested_cell.id = ccr.requested_cell_id
                 WHERE ccr.status = 'pending' AND (u.zone_id = ? OR requested_cell.zone_id = ?)",
                [$leader['zone_id'], $leader['zone_id']]
            )['count'] ?? 0;

            $body = "Weekly Zone Summary: {$leader['zone_name']}\n\n"
                . "Period: {$startDate} to {$endDate}\n"
                . "Total members: " . (int)($summary['total_members'] ?? 0) . "\n"
                . "Sunday attendees: " . (int)($summary['sunday_attendees'] ?? 0) . "\n"
                . "Cell meeting attendees: " . (int)($summary['cell_attendees'] ?? 0) . "\n"
                . "Open absence flags: {$flags}\n"
                . "Pending cell change requests: {$cellChanges}\n";

            $this->createNotification((int)$leader['id'], 'Weekly Zone Summary', $body, 'weekly_zone_report');
            $this->sendEmail($leader['email'], 'Weekly Zone Summary', $body);
        }
    }

    private function createNotification(int $userId, string $title, string $message, string $type): void
    {
        $this->db->insert('notifications', [
            'user_id' => $userId,
            'title' => $title,
            'message' => $message,
            'type' => $type
        ]);
    }

    private function sendEmail(string $to, string $subject, string $body): bool
    {
        $mailHost = getenv('MAIL_HOST');
        if (!$mailHost || !class_exists('PHPMailer\PHPMailer\PHPMailer')) {
            error_log("Mail not configured. Would send {$subject} to {$to}");
            return false;
        }

        try {
            $mail = new PHPMailer\PHPMailer\PHPMailer(true);
            $mail->isSMTP();
            $mail->Host = $mailHost;
            $mail->SMTPAuth = true;
            $mail->Username = getenv('MAIL_USERNAME');
            $mail->Password = getenv('MAIL_PASSWORD');
            $mail->SMTPSecure = getenv('MAIL_ENCRYPTION') ?: 'tls';
            $mail->Port = getenv('MAIL_PORT') ?: 587;
            $mail->setFrom(getenv('MAIL_FROM_ADDRESS'), getenv('MAIL_FROM_NAME'));
            $mail->addAddress($to);
            $mail->isHTML(false);
            $mail->Subject = $subject;
            $mail->Body = $body;

            return $mail->send();
        } catch (Exception $e) {
            error_log('Weekly report email failed: ' . $e->getMessage());
            return false;
        }
    }

    private function getTableColumns(string $table): array
    {
        try {
            if (defined('DB_CONNECTION') && DB_CONNECTION === 'sqlite') {
                $rows = $this->db->all("PRAGMA table_info($table)");
                return array_values(array_filter(array_map(fn($r) => $r['name'] ?? null, $rows)));
            }

            $rows = $this->db->all("SHOW COLUMNS FROM $table");
            return array_values(array_filter(array_map(fn($r) => $r['Field'] ?? null, $rows)));
        } catch (Throwable $e) {
            return [];
        }
    }

    private function getMostRecentSunday(string $referenceDate): string
    {
        $timestamp = strtotime($referenceDate);
        if (date('w', $timestamp) === '0') {
            return date('Y-m-d', $timestamp);
        }

        return date('Y-m-d', strtotime('last sunday', $timestamp));
    }

    private function getSundayCollectionSummary(string $serviceDate): array
    {
        $givingColumns = $this->getTableColumns('giving');
        $hasEntrySource = in_array('entry_source', $givingColumns, true);
        $hasServiceDate = in_array('service_date', $givingColumns, true);
        $dateExpr = $hasServiceDate ? 'service_date' : 'DATE(created_at)';
        $entryFilter = $hasEntrySource ? " AND entry_source = 'sunday_service'" : '';

        $summary = $this->db->first(
            "SELECT
                COALESCE(SUM(amount), 0) as total_amount,
                COUNT(*) as total_entries
             FROM giving
             WHERE {$dateExpr} = ?{$entryFilter}",
            [$serviceDate]
        );

        $byFund = $this->db->all(
            "SELECT fund, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
             FROM giving
             WHERE {$dateExpr} = ?{$entryFilter}
             GROUP BY fund
             ORDER BY total DESC",
            [$serviceDate]
        );

        return [
            'service_date' => $serviceDate,
            'total_amount' => (float)($summary['total_amount'] ?? 0),
            'total_entries' => (int)($summary['total_entries'] ?? 0),
            'by_fund' => $byFund,
        ];
    }
}

$mailer = new WeeklyReportMailer();
$mailer->run();
