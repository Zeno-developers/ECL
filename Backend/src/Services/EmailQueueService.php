<?php

namespace App\Services;

use App\Database;
use PHPMailer\PHPMailer\PHPMailer;
use Exception;

/**
 * Email Queue Service
 * Handles queuing and retrying of failed emails
 */
class EmailQueueService
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Queue an email for retry
     */
    public function queueEmail(
        string $recipientEmail,
        ?string $recipientName,
        string $subject,
        string $body,
        ?string $emailType = null,
        ?string $errorMessage = null
    ): int {
        return $this->db->insert('email_queue', [
            'recipient_email' => $recipientEmail,
            'recipient_name' => $recipientName,
            'subject' => $subject,
            'body' => $body,
            'email_type' => $emailType ?? 'general',
            'status' => 'pending',
            'retry_count' => 0,
            'max_retries' => 5,
            'last_error' => $errorMessage,
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }

    /**
     * Process queued emails - retry failed ones
     * Call this from a cron job every 5-15 minutes
     */
    public function processQueue(): array
    {
        $results = [
            'processed' => 0,
            'sent' => 0,
            'failed' => 0,
            'messages' => []
        ];

        try {
            // Get pending emails (not yet max retries)
            $pendingEmails = $this->db->all(
                "SELECT * FROM email_queue 
                 WHERE status='pending' AND retry_count < max_retries 
                 ORDER BY created_at ASC 
                 LIMIT 10",
                []
            );

            foreach ($pendingEmails as $email) {
                $results['processed']++;
                
                try {
                    // Attempt to send
                    $sent = $this->sendEmailFromQueue($email);
                    
                    if ($sent) {
                        // Mark as sent
                        $this->db->update('email_queue', [
                            'status' => 'sent',
                            'sent_at' => date('Y-m-d H:i:s')
                        ], 'id = ?', [$email['id']]);
                        
                        $results['sent']++;
                        $results['messages'][] = "✓ Email sent to {$email['recipient_email']}";
                    } else {
                        // Increment retry count
                        $this->db->update('email_queue', [
                            'retry_count' => $email['retry_count'] + 1,
                            'last_error' => 'SMTP connection failed'
                        ], 'id = ?', [$email['id']]);
                        
                        $results['failed']++;
                        $nextRetry = $email['retry_count'] + 1;
                        $results['messages'][] = "✗ Retry $nextRetry/5 for {$email['recipient_email']}";
                    }
                } catch (Exception $e) {
                    // Log error and increment retry
                    $this->db->update('email_queue', [
                        'retry_count' => $email['retry_count'] + 1,
                        'last_error' => $e->getMessage()
                    ], 'id = ?', [$email['id']]);
                    
                    $results['failed']++;
                    $results['messages'][] = "✗ Error for {$email['recipient_email']}: " . $e->getMessage();
                }
            }
            
            // Mark permanently failed emails (exceeded max retries)
            $this->db->query(
                "UPDATE email_queue SET status='failed' 
                 WHERE status='pending' AND retry_count >= max_retries",
                []
            );
            
            error_log("Email Queue Processing - Sent: {$results['sent']}, Failed: {$results['failed']}, Processed: {$results['processed']}");
            
        } catch (Exception $e) {
            $results['messages'][] = "Queue processor error: " . $e->getMessage();
            error_log("Email Queue Processor Error: " . $e->getMessage());
        }

        return $results;
    }

    /**
     * Send email from queue record
     */
    private function sendEmailFromQueue(array $emailRecord): bool
    {
        try {
            $mail = SMTPConfigService::createFreshMailer();
            
            $mail->addAddress($emailRecord['recipient_email'], $emailRecord['recipient_name']);
            $mail->Subject = $emailRecord['subject'];
            $mail->isHTML(true);
            $mail->Body = $emailRecord['body'];
            $mail->AltBody = strip_tags($emailRecord['body']);
            
            return $mail->send();
        } catch (Exception $e) {
            error_log("Queue email failed for " . $emailRecord['recipient_email'] . ": " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get queue statistics
     */
    public function getStats(): array
    {
        $pending = $this->db->first(
            "SELECT COUNT(*) as count FROM email_queue WHERE status='pending'",
            []
        );
        
        $sent = $this->db->first(
            "SELECT COUNT(*) as count FROM email_queue WHERE status='sent'",
            []
        );
        
        $failed = $this->db->first(
            "SELECT COUNT(*) as count FROM email_queue WHERE status='failed'",
            []
        );

        return [
            'pending' => $pending['count'] ?? 0,
            'sent' => $sent['count'] ?? 0,
            'failed' => $failed['count'] ?? 0,
            'total' => ($pending['count'] ?? 0) + ($sent['count'] ?? 0) + ($failed['count'] ?? 0)
        ];
    }
}
?>
