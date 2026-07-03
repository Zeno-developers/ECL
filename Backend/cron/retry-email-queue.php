<?php

/**
 * Retry Email Queue Processor
 * 
 * This script processes emails that failed to send and retries them.
 * Intended to be run every 5-10 minutes via cron.
 * 
 * Usage: php retry-email-queue.php
 */

require_once __DIR__ . '/../src/bootstrap.php';

use App\Database;
use PHPMailer\PHPMailer\PHPMailer;

class EmailQueueRetry
{
    private $db;
    private $processed = 0;
    private $sent = 0;
    private $failed = 0;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function process(): void
    {
        try {
            echo "[" . date('Y-m-d H:i:s') . "] Starting email queue processing...\n";
            
            // Get all pending emails that haven't exceeded max attempts
            $pendingEmails = $this->db->all(
                "SELECT * FROM email_queue 
                 WHERE status = 'pending' AND retry_count < max_retries
                 ORDER BY created_at ASC
                 LIMIT 10"
            );

            if (empty($pendingEmails)) {
                echo "[INFO] No pending emails to process.\n";
                return;
            }

            echo "[INFO] Found " . count($pendingEmails) . " pending email(s) to retry.\n\n";

            foreach ($pendingEmails as $email) {
                $this->processed++;
                $result = $this->sendEmail($email);

                if ($result) {
                    $this->sent++;
                    $this->updateStatus($email['id'], 'sent', 'Email sent successfully');
                    echo "[SUCCESS] Email #{$email['id']} sent to {$email['recipient_email']}\n";
                } else {
                    $this->failed++;
                    $this->incrementAttempt($email['id']);
                    echo "[FAILED] Email #{$email['id']} - Retrying later\n";
                }
            }

            echo "\n[SUMMARY] Processed: {$this->processed} | Sent: {$this->sent} | Failed: {$this->failed}\n";

        } catch (Exception $e) {
            echo "[ERROR] " . $e->getMessage() . "\n";
            error_log("Email queue processing failed: " . $e->getMessage());
        }
    }

    private function sendEmail(array $email): bool
    {
        try {
            $mail = new PHPMailer(true);
            
            // SMTP Configuration from .env
            $mail->isSMTP();
            $mail->Host = getenv('MAIL_HOST') ?: 'smtp.gmail.com';
            $mail->Port = (int)(getenv('MAIL_PORT') ?: 587);
            $mail->SMTPAuth = true;
            $mail->Username = getenv('MAIL_USERNAME');
            $mail->Password = getenv('MAIL_PASSWORD');
            $mail->SMTPSecure = getenv('MAIL_ENCRYPTION') ?: 'tls';
            $mail->Timeout = 10;

            // Set sender
            $mail->setFrom(
                getenv('MAIL_FROM_ADDRESS') ?: 'noreply@eternallovechurch.org',
                getenv('MAIL_FROM_NAME') ?: 'Eternal Love Church'
            );

            // Set recipient
            $mail->addAddress($email['recipient_email'], $email['recipient_name']);

            // Set email content
            $mail->isHTML(true);
            $mail->Subject = $email['subject'];
            $mail->Body = $email['body'];
            $mail->AltBody = strip_tags($email['body']);

            // Attempt to send
            if ($mail->send()) {
                return true;
            } else {
                error_log("Failed to send queued email #{$email['id']}: " . $mail->ErrorInfo);
                return false;
            }

        } catch (Exception $e) {
            error_log("Exception sending queued email #{$email['id']}: " . $e->getMessage());
            return false;
        }
    }

    private function updateStatus(int $emailId, string $status, string $message): void
    {
        try {
            $this->db->update(
                'email_queue',
                [
                    'status' => $status,
                    'last_error' => $message,
                    'sent_at' => $status === 'sent' ? date('Y-m-d H:i:s') : null
                ],
                'id = ?',
                [$emailId]
            );
        } catch (Exception $e) {
            error_log("Failed to update email queue status: " . $e->getMessage());
        }
    }

    private function incrementAttempt(int $emailId): void
    {
        try {
            $this->db->query(
                "UPDATE email_queue SET retry_count = retry_count + 1, last_error = ?, updated_at = NOW() WHERE id = ?",
                ['SMTP send failed', $emailId]
            );
        } catch (Exception $e) {
            error_log("Failed to increment attempt count: " . $e->getMessage());
        }
    }
}

// Run the processor
$processor = new EmailQueueRetry();
$processor->process();
