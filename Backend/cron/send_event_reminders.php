<?php
/**
 * Cron Job: Send Event Reminders to Pastors
 * 
 * This script runs daily and sends reminders to pastors about events
 * that are happening in 2 days, including the number of people registered.
 * 
 * Schedule: Run daily (e.g., via cron: 0 8 * * * php /path/to/send_event_reminders.php)
 */

require_once __DIR__ . '/../src/bootstrap.php';

use App\Database;
use App\Service\PastorNotificationService;
use PHPMailer\PHPMailer\PHPMailer;

class EventReminderCron {
    private $db;
    private $notificationService;
    
    public function __construct() {
        try {
            $this->db = Database::getInstance();
            $this->notificationService = new PastorNotificationService($this->db);
            log_message("EventReminderCron initialized");
        } catch (Exception $e) {
            log_message("Failed to initialize EventReminderCron: " . $e->getMessage(), "error");
            exit(1);
        }
    }
    
    /**
     * Run the cron job
     */
    public function run(): void {
        try {
            log_message("Starting event reminder cron job...");
            
            // Calculate the date for 2 days from now
            $reminderDate = new DateTime();
            $reminderDate->modify('+2 days');
            $reminderDate->setTime(0, 0, 0);
            
            $nextDay = clone $reminderDate;
            $nextDay->modify('+1 day');
            
            $startDate = $reminderDate->format('Y-m-d');
            $endDate = $nextDay->format('Y-m-d');
            
            log_message("Looking for events between $startDate and $endDate");
            
            // Query for events 2 days from now
            $events = $this->db->all(
                "SELECT e.*, COUNT(er.id) as registrations 
                 FROM events e
                 LEFT JOIN event_registrations er ON e.id = er.event_id
                 WHERE DATE(e.date) >= ? AND DATE(e.date) < ?
                 AND e.is_published = 1
                 GROUP BY e.id
                 ORDER BY e.date ASC",
                [$startDate, $endDate]
            );
            
            if (empty($events)) {
                log_message("No events found for reminder date");
                return;
            }
            
            log_message("Found " . count($events) . " event(s) to remind about");
            
            // Send reminders for each event
            foreach ($events as $event) {
                $this->sendEventReminder($event);
            }
            
            log_message("Event reminder cron job completed successfully");
        } catch (Exception $e) {
            log_message("Event reminder cron job failed: " . $e->getMessage(), "error");
        }
    }
    
    /**
     * Send reminder for a specific event
     */
    private function sendEventReminder(array $event): void {
        try {
            $eventId = $event['id'];
            $eventTitle = $event['title'];
            $eventDate = $event['date'];
            $eventTime = $event['time'];
            $eventLocation = $event['location'];
            $registrations = (int)$event['registrations'];
            
            log_message("Sending reminder for event: $eventTitle (ID: $eventId) with $registrations registrations");
            
            // Get pastors
            $pastors = $this->notificationService->getPastorEmails();
            
            if (empty($pastors)) {
                log_message("No pastors found to send reminder to");
                return;
            }
            
            // Format the date and time
            $dateObj = new DateTime($eventDate);
            $formattedDate = $dateObj->format('l, F jS Y');
            $formattedTime = $eventTime ? $this->formatTime($eventTime) : 'Time to be confirmed';
            
            // Create reminder message (plain text only)
            $subject = "Event reminder: $eventTitle";
            $body = $this->renderReminderTemplate([
                'eventTitle' => $eventTitle,
                'eventDate' => $formattedDate,
                'eventTime' => $formattedTime,
                'eventLocation' => $eventLocation,
                'registrations' => $registrations
            ]);

            $sentCount = 0;
            foreach ($pastors as $pastor) {
                if ($this->sendReminderEmail($pastor, $subject, $body)) {
                    $sentCount++;
                }
            }
            
            // Log the reminder
            $this->logReminder($eventId, $sentCount);
            
        } catch (Exception $e) {
            log_message("Failed to send reminder for event: " . $e->getMessage(), "error");
        }
    }
    
    /**
     * Format time from 24-hour to 12-hour format
     */
    private function formatTime(string $time24): string {
        try {
            $time = DateTime::createFromFormat('H:i:s', $time24) ?: DateTime::createFromFormat('H:i', $time24);
            return $time ? $time->format('g:i A') : $time24;
        } catch (Exception $e) {
            return $time24;
        }
    }

    /**
     * Send reminder email to a single pastor (plain text only, no HTML)
     */
    private function sendReminderEmail(array $pastor, string $subject, string $body): bool
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
            $mail->addAddress($pastor['email'], trim(($pastor['first_name'] ?? '') . ' ' . ($pastor['last_name'] ?? '')));
            $mail->Subject = $subject;
            $mail->Body = $body;   // plain text
            // No isHTML(true) – send as plain text
            
            if ($mail->send()) {
                log_message("Event reminder email sent successfully to: " . $pastor['email']);
                return true;
            }
            log_message("Event reminder email failed to: " . $pastor['email'] . " - " . $mail->ErrorInfo, "error");
            return false;
        } catch (Exception $e) {
            log_message("Exception sending to {$pastor['email']}: " . $e->getMessage(), "error");
            return false;
        }
    }
    
    /**
     * Render reminder email template – plain text only, no HTML, no emojis, simple wording
     */
    private function renderReminderTemplate(array $data): string {
        $eventTitle = $data['eventTitle'];
        $eventDate = $data['eventDate'];
        $eventTime = $data['eventTime'];
        $eventLocation = $data['eventLocation'];
        $registrations = $data['registrations'];
        
        return "Dear Pastor,\n\n"
             . "This is a gentle reminder about an upcoming event at Eternal Love Church:\n\n"
             . "Event: " . $eventTitle . "\n"
             . "Date: " . $eventDate . "\n"
             . "Time: " . $eventTime . "\n"
             . "Location: " . $eventLocation . "\n"
             . "Number of people registered so far: " . $registrations . "\n\n"
             . "The event is scheduled for 2 days from now. Please check if everything is ready.\n\n"
             . "You can view more details on your dashboard.\n\n"
             . "Blessings,\n"
             . "Eternal Love Church Admin";
    }
    
    /**
     * Log the reminder in the system
     */
    private function logReminder(int $eventId, int $pastorCount): void {
        try {
            $tableExists = $this->db->first(
                "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cron_logs'"
            );
            
            if ($tableExists) {
                $this->db->insert('cron_logs', [
                    'job_name' => 'send_event_reminders',
                    'event_id' => $eventId,
                    'pastors_notified' => $pastorCount,
                    'run_at' => date('Y-m-d H:i:s'),
                    'status' => 'success'
                ]);
            }
        } catch (Exception $e) {
            log_message("Database logging not available: " . $e->getMessage(), "warning");
        }
    }
}

/**
 * Log message helper
 */
function log_message(string $message, string $level = 'info'): void {
    $timestamp = date('Y-m-d H:i:s');
    $logLevel = strtoupper($level);
    $logFile = __DIR__ . '/../logs/event_reminders.log';
    
    $logMessage = "[$timestamp] [$logLevel] $message" . PHP_EOL;
    
    if (!is_dir(__DIR__ . '/../logs')) {
        mkdir(__DIR__ . '/../logs', 0755, true);
    }
    
    file_put_contents($logFile, $logMessage, FILE_APPEND);
    echo $logMessage;
}

// Run the cron job
try {
    $cron = new EventReminderCron();
    $cron->run();
} catch (Exception $e) {
    log_message("Failed to execute event reminder cron: " . $e->getMessage(), "error");
    exit(1);
}