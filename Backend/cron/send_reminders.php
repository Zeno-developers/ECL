<?php
/**
 * Cron Job: Send Meeting Reminders (REAL EMAILS)
 * 
 * Sends email reminders for:
 * - Cell meetings (1 day before)
 * - Sunday service (1 day before)
 * - Absence follow-up (for flagged members)
 * - Announcements
 * 
 * Usage: php backend/cron/send_reminders.php
 */

require_once __DIR__ . '/../src/bootstrap.php';

use App\Database;
use PHPMailer\PHPMailer\PHPMailer;

class ReminderSender
{
    private $db;
    
    public function __construct()
    {
        $this->db = Database::getInstance();
    }
    
    public function sendReminders()
    {
        echo "[" . date('Y-m-d H:i:s') . "] Starting reminder processing (real emails)...\n";
        
        try {
            // 0. Generate tomorrow's polls (in-app only – optional)
            $this->generateTomorrowPolls();
            
            $tomorrow = date('Y-m-d', strtotime('tomorrow'));
            $today = date('l');
            
            // 1. Send cell meeting reminders (EMAILS to members + cell leader)
            $this->sendCellMeetingReminders($tomorrow);
            
            // 2. Send Sunday service reminders (EMAILS to members)
            if (date('w', strtotime($tomorrow)) == 0 || $today == 'Monday') {
                $this->sendSundayReminders($tomorrow);
            }
            
            // 3. Send absence follow-up reminders (EMAILS)
            $this->sendAbsenceFollowUpReminders();
            
            // 4. Send announcement notifications (EMAILS)
            $this->sendAnnouncementNotifications();
            
            echo "[" . date('Y-m-d H:i:s') . "] Reminder processing completed.\n";
            
        } catch (Exception $e) {
            echo "ERROR: " . $e->getMessage() . "\n";
            error_log('Reminder processing failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Generate polls for tomorrow's meetings (in-app only – optional)
     */
    private function generateTomorrowPolls(): void
    {
        echo "Generating polls for tomorrow's meetings (in-app)...\n";
        
        try {
            $targetDate = date('Y-m-d', strtotime('+1 day'));
            $targetDay = strtolower(date('l', strtotime($targetDate)));
            
            $cells = $this->db->all(
                "SELECT c.id, c.name, c.meeting_day, c.meeting_time, c.meeting_location, c.cell_leader_id
                 FROM cells c
                 WHERE c.is_active = 1 AND c.meeting_day = ?",
                [$targetDay]
            );
            
            $created = 0;
            $emailed = 0;
            
            foreach ($cells as $cell) {
                $existingPoll = $this->db->first(
                    "SELECT id FROM meeting_polls 
                     WHERE audience_type = 'cell' AND audience_id = ? AND meeting_date = ?",
                    [(int)$cell['id'], $targetDate]
                );
                
                if ($existingPoll) {
                    continue;
                }
                
                $pollId = $this->db->insert('meeting_polls', [
                    'audience_type' => 'cell',
                    'audience_id' => (int)$cell['id'],
                    'title' => $cell['name'] . ' Weekly Cell Meeting',
                    'description' => 'Please confirm whether you will attend this cell meeting.',
                    'meeting_date' => $targetDate,
                    'meeting_time' => $cell['meeting_time'] ?? null,
                    'meeting_location' => $cell['meeting_location'] ?? null,
                    'status' => 'open',
                    'created_by' => $cell['cell_leader_id'] ?? 1,
                ]);
                
                $members = $this->db->all(
                    "SELECT id, first_name, last_name, email FROM users 
                     WHERE cell_id = ? AND is_active = 1",
                    [(int)$cell['id']]
                );
                
                $leaderName = 'Your Cell Leader';
                if ($cell['cell_leader_id']) {
                    $leader = $this->db->first(
                        "SELECT first_name, last_name FROM users WHERE id = ?",
                        [(int)$cell['cell_leader_id']]
                    );
                    if ($leader) {
                        $leaderName = trim(($leader['first_name'] ?? '') . ' ' . ($leader['last_name'] ?? ''));
                    }
                }
                
                foreach ($members as $member) {
                    if ((int)$member['id'] === (int)$cell['cell_leader_id']) {
                        continue;
                    }
                    
                    $this->db->insert('meeting_poll_responses', [
                        'poll_id' => $pollId,
                        'user_id' => (int)$member['id'],
                    ]);
                    
                    $this->createNotification(
                        (int)$member['id'],
                        'Cell Meeting RSVP - ' . $cell['name'],
                        $leaderName . ' is requesting you to confirm your attendance for the ' . $cell['name'] . ' meeting on ' . $targetDate,
                        'meeting_poll'
                    );
                    $emailed++;
                }
                $created++;
            }
            
            if ($created > 0) {
                echo "Generated $created polls and sent $emailed in-app notifications for $targetDate\n";
            }
        } catch (Exception $e) {
            echo "ERROR generating polls: " . $e->getMessage() . "\n";
            error_log('Poll generation failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Send cell meeting reminders (REAL EMAILS to members and cell leader)
     */
    private function sendCellMeetingReminders(string $meetingDate): void
    {
        echo "Sending cell meeting reminders (real emails) for $meetingDate...\n";
        
        $dayName = date('l', strtotime($meetingDate));
        $dayLower = strtolower($dayName);
        
        $cells = $this->db->all(
            "SELECT c.id, c.name, c.meeting_time, c.meeting_location, c.cell_leader_id
             FROM cells c
             WHERE c.is_active = 1 
             AND c.meeting_day = ?
             AND c.cell_leader_id IS NOT NULL",
            [$dayLower]
        );
        
        $emailCount = 0;
        foreach ($cells as $cell) {
            // Get members in this cell (with email)
            $members = $this->db->all(
                "SELECT u.id, u.first_name, u.last_name, u.email
                 FROM users u
                 WHERE u.cell_id = ? AND u.is_active = 1 AND u.email IS NOT NULL AND u.email != ''",
                [$cell['id']]
            );
            
            // Send email to each member
            foreach ($members as $member) {
                $subject = "Cell meeting reminder for tomorrow";
                $body = "Hello " . trim(($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? '')) . ",\n\n"
                      . "This is a reminder that your cell meeting is tomorrow ($dayName at {$cell['meeting_time']}) at {$cell['meeting_location']}.\n\n"
                      . "We look forward to seeing you.\n\n"
                      . "Blessings,\n"
                      . "Eternal Love Church";
                if ($this->sendEmail($member['email'], $subject, $body)) {
                    $emailCount++;
                }
                
                // Also create in-app notification (optional)
                $this->createNotification(
                    $member['id'],
                    'Cell Meeting Reminder',
                    "Your cell meeting is scheduled for tomorrow ($dayName at {$cell['meeting_time']}) at {$cell['meeting_location']}. Please attend!",
                    'cell_meeting_reminder'
                );
            }
            
            // Send email to cell leader
            $leader = $this->db->first(
                "SELECT id, first_name, last_name, email
                 FROM users
                 WHERE id = ? AND is_active = 1 AND email IS NOT NULL AND email != ''",
                [$cell['cell_leader_id']]
            );
            if ($leader) {
                $subject = "Your cell meeting is tomorrow";
                $body = "Hello " . trim(($leader['first_name'] ?? '') . ' ' . ($leader['last_name'] ?? '')) . ",\n\n"
                      . "This is a reminder that you have a cell meeting tomorrow ($dayName at {$cell['meeting_time']}) at {$cell['meeting_location']}.\n"
                      . "Number of members in your cell: " . count($members) . "\n\n"
                      . "Blessings,\n"
                      . "Eternal Love Church";
                if ($this->sendEmail($leader['email'], $subject, $body)) {
                    $emailCount++;
                }
                
                $this->createNotification(
                    $leader['id'],
                    'Cell Meeting Tomorrow',
                    "Reminder: You have a cell meeting tomorrow ($dayName at {$cell['meeting_time']}) at {$cell['meeting_location']}. There are " . count($members) . " members in your cell.",
                    'cell_leader_reminder'
                );
            }
        }
        
        echo "Sent $emailCount cell meeting reminder emails\n";
    }
    
    /**
     * Send Sunday service reminders (REAL EMAILS to all active members)
     */
    private function sendSundayReminders(string $sundayDate): void
    {
        echo "Sending Sunday service reminders (real emails) for $sundayDate...\n";
        
        $members = $this->db->all(
            "SELECT u.id, u.first_name, u.last_name, u.email
             FROM users u
             WHERE u.is_active = 1 AND u.role IN ('member', 'cell_leader')
             AND u.email IS NOT NULL AND u.email != ''"
        );
        
        $emailCount = 0;
        foreach ($members as $member) {
            $subject = "Sunday service reminder";
            $body = "Hello " . trim(($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? '')) . ",\n\n"
                  . "This is a reminder that Sunday service is tomorrow at 9:00 AM.\n\n"
                  . "We look forward to worshipping with you.\n\n"
                  . "Blessings,\n"
                  . "Eternal Love Church";
            if ($this->sendEmail($member['email'], $subject, $body)) {
                $emailCount++;
            }
            
            $this->createNotification(
                $member['id'],
                'Sunday Service Reminder',
                "Don't forget about Sunday service this week! Service time: 9:00 AM.",
                'sunday_reminder'
            );
        }
        
        echo "Sent $emailCount Sunday service reminder emails\n";
    }
    
    /**
     * Send absence follow-up reminders (REAL EMAILS)
     */
    private function sendAbsenceFollowUpReminders(): void
    {
        echo "Sending absence follow-up reminders (real emails)...\n";
        
        $threeDaysAgo = date('Y-m-d H:i:s', strtotime('-3 days'));
        $fiveDaysAgo = date('Y-m-d H:i:s', strtotime('-5 days'));
        
        $flags = $this->db->all(
            "SELECT af.*, u.first_name, u.last_name, u.cell_id, u.email, u.zone_id,
                    c.name as cell_name, c.cell_leader_id
             FROM absence_flags af
             JOIN users u ON af.user_id = u.id
             LEFT JOIN cells c ON u.cell_id = c.id
             WHERE af.resolved_at IS NULL 
             AND af.notification_sent = 1
             AND af.flagged_at >= ?
             AND af.flagged_at <= ?
             AND (af.followup_reminder_sent_at IS NULL)
             AND (af.consecutive_sunday_misses >= 2 OR af.consecutive_cell_misses >= 2)",
            [$fiveDaysAgo, $threeDaysAgo]
        );
        
        $emailCount = 0;
        foreach ($flags as $flag) {
            $memberName = trim(($flag['first_name'] ?? '') . ' ' . ($flag['last_name'] ?? ''));
            $isCellMember = !empty($flag['cell_id']);
            $reasons = [];
            if ((int)($flag['consecutive_sunday_misses'] ?? 0) >= 2) {
                $reasons[] = (int)$flag['consecutive_sunday_misses'] . ' missed Sunday services';
            }
            if ((int)($flag['consecutive_cell_misses'] ?? 0) >= 2) {
                $reasons[] = (int)$flag['consecutive_cell_misses'] . ' missed cell meetings';
            }
            $summary = implode(' and ', $reasons);
            $prayerLink = rtrim(getenv('FRONTEND_URL') ?: getenv('APP_URL') ?: '', '/') . '/prayer';
            
            // Email to the member
            if (!empty($flag['email'])) {
                $subject = "We miss you";
                $body = "Hello $memberName,\n\n"
                      . "We wanted to gently follow up because you have $summary.\n\n"
                      . "You matter to us, and we would love to pray with you. If you need support, you can submit a prayer request here: $prayerLink\n\n"
                      . "Blessings,\n"
                      . "Eternal Love Church";
                if ($this->sendEmail($flag['email'], $subject, $body)) {
                    $emailCount++;
                }
            }
            
            // Email to cell leader
            if ($isCellMember && !empty($flag['cell_leader_id'])) {
                $cellLeader = $this->db->first(
                    "SELECT id, first_name, last_name, email
                     FROM users
                     WHERE id = ? AND is_active = 1 AND email IS NOT NULL AND email != ''",
                    [$flag['cell_leader_id']]
                );
                if ($cellLeader) {
                    $subject = "Follow up needed: $memberName";
                    $body = "Hello " . trim(($cellLeader['first_name'] ?? '') . ' ' . ($cellLeader['last_name'] ?? '')) . ",\n\n"
                          . "$memberName needs follow-up: $summary.\n\n"
                          . "Please reach out with prayer and encouragement, and consider arranging a pastoral check-in if needed.\n\n"
                          . "Thank you,\n"
                          . "Eternal Love Church Admin";
                    if ($this->sendEmail($cellLeader['email'], $subject, $body)) {
                        $emailCount++;
                    }
                    $this->createNotification(
                        $cellLeader['id'],
                        'Follow-up Required',
                        "$memberName has missed $summary. Please follow up with them.",
                        'absence_followup'
                    );
                }
            }
            
            // Email to pastors
            $pastors = $this->db->all(
                "SELECT id, email, first_name, last_name
                 FROM users
                 WHERE is_active = 1 AND role IN ('pastor', 'admin', 'superadmin')
                 AND email IS NOT NULL AND email <> ''"
            );
            foreach ($pastors as $pastor) {
                $subject = "Pastoral follow-up: $memberName";
                $body = "Hello " . trim(($pastor['first_name'] ?? '') . ' ' . ($pastor['last_name'] ?? '')) . ",\n\n"
                      . "$memberName has been flagged for $summary.\n\n"
                      . "You may want to pray with them or arrange a pastoral visit.\n\n"
                      . "Blessings,\n"
                      . "Eternal Love Church Admin";
                $this->sendEmail($pastor['email'], $subject, $body);
                $emailCount++;
            }
            
            // Mark this flag as reminded
            $this->db->query(
                "UPDATE absence_flags SET followup_reminder_sent_at = NOW() WHERE id = ?",
                [$flag['id']]
            );
        }
        
        echo "Sent $emailCount absence follow-up emails\n";
    }
    
    /**
     * Send announcement notifications (REAL EMAILS to target users)
     */
    private function sendAnnouncementNotifications(): void
    {
        echo "Sending announcement notifications (real emails)...\n";
        
        $yesterday = date('Y-m-d H:i:s', strtotime('-24 hours'));
        
        $announcements = $this->db->all(
            "SELECT a.*, u.first_name as creator_first, u.last_name as creator_last
             FROM announcements a
             JOIN users u ON a.created_by = u.id
             WHERE a.is_active = 1 
             AND a.created_at >= ?
             AND (a.expires_at IS NULL OR a.expires_at >= NOW())",
            [$yesterday]
        );
        
        $emailCount = 0;
        foreach ($announcements as $announcement) {
            $targetUsers = $this->getAnnouncementTargetUsers($announcement);
            foreach ($targetUsers as $user) {
                // Get user email
                $userData = $this->db->first(
                    "SELECT email, first_name, last_name FROM users WHERE id = ?",
                    [$user['id']]
                );
                if ($userData && !empty($userData['email'])) {
                    $subject = "New announcement: " . substr($announcement['title'], 0, 60);
                    $body = "Hello " . trim(($userData['first_name'] ?? '') . ' ' . ($userData['last_name'] ?? '')) . ",\n\n"
                          . "A new announcement has been posted:\n\n"
                          . "Title: " . $announcement['title'] . "\n"
                          . "Message: " . strip_tags(substr($announcement['content'], 0, 500)) . "\n\n"
                          . "Log in to your dashboard to view the full announcement.\n\n"
                          . "Blessings,\n"
                          . "Eternal Love Church";
                    if ($this->sendEmail($userData['email'], $subject, $body)) {
                        $emailCount++;
                    }
                }
                
                $this->createNotification(
                    $user['id'],
                    'New Announcement: ' . substr($announcement['title'], 0, 50),
                    strip_tags(substr($announcement['content'], 0, 200)),
                    'announcement'
                );
            }
        }
        
        echo "Sent $emailCount announcement emails\n";
    }
    
    private function getAnnouncementTargetUsers(array $announcement): array
    {
        $sql = "SELECT u.id FROM users u WHERE u.is_active = 1";
        $params = [];
        
        switch ($announcement['audience']) {
            case 'all':
                break;
            case 'zone_leaders':
                $sql .= " AND u.role = 'zone_leader'";
                break;
            case 'cell_leaders':
                $sql .= " AND u.role = 'cell_leader'";
                break;
            case 'members':
                $sql .= " AND u.role = 'member'";
                break;
            case 'specific_zones':
                if ($announcement['zone_id']) {
                    $sql .= " AND u.zone_id = ?";
                    $params[] = $announcement['zone_id'];
                }
                break;
            case 'specific_cells':
                if ($announcement['cell_id']) {
                    $sql .= " AND u.cell_id = ?";
                    $params[] = $announcement['cell_id'];
                }
                break;
        }
        
        return $this->db->all($sql, $params);
    }
    
    private function createNotification(int $userId, string $title, string $message, string $type): void
    {
        try {
            $recent = $this->db->first(
                "SELECT id FROM notifications 
                 WHERE user_id = ? 
                 AND title = ? 
                 AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)",
                [$userId, $title]
            );
            if (!$recent) {
                $this->db->insert('notifications', [
                    'user_id' => $userId,
                    'title' => $title,
                    'message' => $message,
                    'type' => $type
                ]);
            }
        } catch (Exception $e) {
            error_log('Failed to create notification: ' . $e->getMessage());
        }
    }
    
    /**
     * Send a real email (plain text only) using PHPMailer.
     */
    private function sendEmail(string $to, string $subject, string $body): bool
    {
        try {
            $mail = new PHPMailer(true);
            $mail->isSMTP();
            $host = getenv('MAIL_HOST') ?: 'smtp.gmail.com';
            $port = (int)(getenv('MAIL_PORT') ?: 587);
            $encryption = getenv('MAIL_ENCRYPTION') ?: 'tls';
            $mail->Host = $host;
            $mail->Port = $port;
            $mail->SMTPSecure = $encryption;
            $mail->SMTPAuth = true;
            $mail->Username = getenv('MAIL_USERNAME');
            $mail->Password = getenv('MAIL_PASSWORD');
            $mail->setFrom(
                getenv('MAIL_FROM_ADDRESS') ?: 'noreply@eternallovechurch.org',
                'Eternal Love Church'
            );
            $mail->addAddress($to);
            $mail->Subject = $subject;
            $mail->Body = $body;
            $mail->send();
            echo "  Email sent to $to\n";
            return true;
        } catch (Exception $e) {
            error_log("sendEmail failed to $to: " . $e->getMessage());
            echo "  Email FAILED to $to: " . $e->getMessage() . "\n";
            return false;
        }
    }
}

// Run the reminder sender
$sender = new ReminderSender();
$sender->sendReminders();