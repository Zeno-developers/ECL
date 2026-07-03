<?php

namespace App\Service;

use App\Services\MailService;
use App\Services\SMTPConfigService;
use App\Services\WhatsAppService;
use PHPMailer\PHPMailer\PHPMailer;
use Exception;

class PastorNotificationService
{
    private $db;
    private $mailService;

    public function __construct($db)
    {
        $this->db = $db;
        $this->mailService = new MailService();
    }

    /**
     * Notify pastors of a new website contact form submission
     */
    public function notifyNewWebsiteMessage(array $submissionData): bool
    {
        try {
            $pastors = $this->getPastorEmails();
            
            if (empty($pastors)) {
                error_log("No pastors found to notify of website message");
                return false;
            }

            $subject = "New Website Contact: " . ($submissionData['subject'] ?? 'Website Message');
            $body = $this->renderWebsiteMessageTemplate($submissionData);

            foreach ($pastors as $pastor) {
                $this->sendEmailViaPHPMailer(
                    $pastor['email'],
                    $subject,
                    $body,
                    $pastor['first_name'] . ' ' . $pastor['last_name']
                );
            }

            return true;
        } catch (Exception $e) {
            error_log("PastorNotificationService - notifyNewWebsiteMessage failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Notify pastors of a new member registration (used by AuthController)
     */
    public function notifyNewRegistration(array $registrationData): bool
    {
        try {
            $pastors = $this->getPastorEmails();
            
            if (empty($pastors)) {
                error_log("No pastors found to notify of new registration");
                return false;
            }

            $name = $registrationData['name'] ?? 'Unknown';
            $subject = "New Member Registration: $name";
            $body = $this->renderNewRegistrationTemplate($registrationData);

            foreach ($pastors as $pastor) {
                $this->sendEmailViaPHPMailer(
                    $pastor['email'],
                    $subject,
                    $body,
                    $pastor['first_name'] . ' ' . $pastor['last_name']
                );
            }

            return true;
        } catch (Exception $e) {
            error_log("PastorNotificationService - notifyNewRegistration failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Notify pastors of a new member registration
     */
    public function notifyNewMemberRegistration(array $memberData): bool
    {
        try {
            $pastors = $this->getPastorEmails();
            
            if (empty($pastors)) {
                error_log("No pastors found to notify of new member");
                return false;
            }

            $subject = "New Member Registration: " . $memberData['first_name'] . " " . $memberData['last_name'];
            $body = $this->renderNewMemberTemplate($memberData);

            foreach ($pastors as $pastor) {
                $this->sendEmailViaPHPMailer(
                    $pastor['email'],
                    $subject,
                    $body,
                    $pastor['first_name'] . ' ' . $pastor['last_name']
                );
            }

            return true;
        } catch (Exception $e) {
            error_log("PastorNotificationService - notifyNewMemberRegistration failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Notify pastors of new prayer requests
     */
    public function notifyPrayerRequest(array $prayerData): bool
    {
        try {
            $pastors = $this->getPastorEmails();
            
            if (empty($pastors)) {
                error_log("No pastors found to notify of prayer request");
                return false;
            }

            $subject = "New Prayer Request: " . (isset($prayerData['title']) ? $prayerData['title'] : 'Urgent Prayer Needed');
            $body = $this->renderPrayerRequestTemplate($prayerData);

            foreach ($pastors as $pastor) {
                $this->sendEmailViaPHPMailer(
                    $pastor['email'],
                    $subject,
                    $body,
                    $pastor['first_name'] . ' ' . $pastor['last_name']
                );
            }

            return true;
        } catch (Exception $e) {
            error_log("PastorNotificationService - notifyPrayerRequest failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Notify pastors of new announcement
     */
    public function notifyNewAnnouncement(array $announcementData): bool
    {
        try {
            $pastors = $this->getPastorEmails();
            
            if (empty($pastors)) {
                error_log("No pastors found to notify of new announcement");
                return false;
            }

            $subject = "New Announcement: " . $announcementData['title'];
            $body = $this->renderAnnouncementTemplate($announcementData);

            foreach ($pastors as $pastor) {
                $this->sendEmailViaPHPMailer(
                    $pastor['email'],
                    $subject,
                    $body,
                    $pastor['first_name'] . ' ' . $pastor['last_name']
                );
            }

            return true;
        } catch (Exception $e) {
            error_log("PastorNotificationService - notifyNewAnnouncement failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get all pastor emails from the database
     */
    public function getPastorEmails(): array
    {
        try {
            $pastors = $this->db->all(
                "SELECT id, email, first_name, last_name FROM users 
                 WHERE is_active = 1 AND role IN ('pastor', 'admin', 'superadmin') 
                 AND email IS NOT NULL 
                 ORDER BY first_name ASC"
            );

            // Also check for configured pastor email in settings
            $configuredEmail = $this->db->first(
                "SELECT value FROM settings WHERE key_name = 'pastor_report_email' LIMIT 1"
            );

            if (!empty($configuredEmail['value'])) {
                $email = trim($configuredEmail['value']);
                if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    // Add configured email if not already in pastors list
                    $existingEmails = array_column($pastors, 'email');
                    if (!in_array($email, $existingEmails)) {
                        $pastors[] = [
                            'id' => 0,
                            'email' => $email,
                            'first_name' => 'Church',
                            'last_name' => 'Pastor'
                        ];
                    }
                }
            }

            return $pastors;
        } catch (Exception $e) {
            error_log("PastorNotificationService - getPastorEmails failed: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Send email via PHPMailer directly with fallback options
     */
    public function sendEmailViaPHPMailer(string $to, string $subject, string $body, string $toName = ''): bool
    {
        try {
            $mail = SMTPConfigService::createFreshMailer();

            // Add recipient
            $mail->addAddress($to, $toName);

            // Set content
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $body;
            $mail->AltBody = strip_tags($body);

            // Send the email
            if ($mail->send()) {
                error_log("Email sent successfully to: $to");
                return true;
            } else {
                error_log("PHPMailer send failed: " . $mail->ErrorInfo);
                return false;
            }
        } catch (Exception $e) {
            error_log("PHPMailer exception to $to: " . $e->getMessage());
            error_log("SMTP Config: " . json_encode(SMTPConfigService::getConfig()));
            
            // Don't silent queue - let the error bubble up so we can see what's wrong
            return false;
        }
    }

    /**
     * Queue email for later sending if SMTP is unavailable
     */
    private function queueEmailNotification(string $email, string $name, string $subject, string $body): void
    {
        try {
            // Store failed email in database for retry
            $this->db->insert('email_queue', [
                'recipient_email' => $email,
                'recipient_name' => $name,
                'subject' => $subject,
                'body' => $body,
                'attempts' => 0,
                'status' => 'pending',
                'created_at' => date('Y-m-d H:i:s'),
                'error_message' => 'Initial SMTP connection failed'
            ]);
            
            error_log("Email queued for retry: $email - $subject");
        } catch (Exception $e) {
            error_log("Failed to queue email notification: " . $e->getMessage());
        }
    }

    /**
     * Render website message notification template
     */
    private function renderWebsiteMessageTemplate(array $data): string
    {
        $name = htmlspecialchars($data['name'] ?? 'Unknown');
        $email = htmlspecialchars($data['email'] ?? '');
        $phone = htmlspecialchars($data['phone'] ?? 'Not provided');
        $subject = htmlspecialchars($data['subject'] ?? 'Website Message');
        $message = nl2br(htmlspecialchars($data['message'] ?? ''));

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: #7c3aed; color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
        .header h2 { margin: 0; font-size: 24px; }
        .field { margin-bottom: 15px; }
        .field-label { font-weight: bold; color: #333; margin-bottom: 5px; }
        .field-value { color: #666; }
        .message-box { background: #f9f9f9; border-left: 4px solid #7c3aed; padding: 15px; margin: 15px 0; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>📧 New Website Contact Form Submission</h2>
        </div>
        
        <div class="field">
            <div class="field-label">Subject:</div>
            <div class="field-value">$subject</div>
        </div>

        <div class="field">
            <div class="field-label">From:</div>
            <div class="field-value">$name</div>
        </div>

        <div class="field">
            <div class="field-label">Email:</div>
            <div class="field-value"><a href="mailto:$email">$email</a></div>
        </div>

        <div class="field">
            <div class="field-label">Phone:</div>
            <div class="field-value">$phone</div>
        </div>

        <div class="message-box">
            <strong>Message:</strong><br>
            $message
        </div>

        <div class="footer">
            <p>This is an automated notification from your Eternal Love Church website contact form.</p>
            <p>Please reply to $email to respond to this message.</p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    /**
     * Render new registration notification template
     */
    private function renderNewRegistrationTemplate(array $data): string
    {
        $name = htmlspecialchars($data['name'] ?? 'Unknown');
        $email = htmlspecialchars($data['email'] ?? '');
        $phone = htmlspecialchars($data['phone'] ?? 'Not provided');
        $role = htmlspecialchars($data['role'] ?? 'member');

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
        .welcome-box { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .info-item { background: #f9f9f9; padding: 10px; border-radius: 4px; }
        .label { font-weight: bold; color: #059669; font-size: 12px; }
        .value { color: #333; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🎉 New Member Registration</h2>
            <p style="margin: 5px 0;">Welcome to Eternal Love Church Family</p>
        </div>
        
        <div class="welcome-box">
            <p><strong>A new person has just joined the church!</strong></p>
        </div>

        <div class="info-grid">
            <div class="info-item">
                <div class="label">NAME</div>
                <div class="value">$name</div>
            </div>
            <div class="info-item">
                <div class="label">Email</div>
                <div class="value"><a href="mailto:$email">$email</a></div>
            </div>
            <div class="info-item">
                <div class="label">PHONE</div>
                <div class="value">$phone</div>
            </div>
            <div class="info-item">
                <div class="label">ROLE</div>
                <div class="value">$role</div>
            </div>
        </div>

        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
            <p>Please reach out to welcome this new member to our community and help them get connected.</p>
            <p style="margin: 0; font-size: 12px; color: #999;">— Eternal Love Church Management System</p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    /**
     * Render new member notification template
     */
    private function renderNewMemberTemplate(array $data): string
    {
        $firstName = htmlspecialchars($data['first_name'] ?? 'Unknown');
        $lastName = htmlspecialchars($data['last_name'] ?? '');
        $email = htmlspecialchars($data['email'] ?? '');
        $phone = htmlspecialchars($data['phone'] ?? 'Not provided');
        $dateCreated = date('F j, Y', strtotime($data['created_at'] ?? date('Y-m-d H:i:s')));

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
        .welcome-box { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .info-item { background: #f9f9f9; padding: 10px; border-radius: 4px; }
        .label { font-weight: bold; color: #059669; font-size: 12px; }
        .value { color: #333; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🎉 New Member Registration</h2>
            <p style="margin: 5px 0;">Welcome to Eternal Love Church Family</p>
        </div>
        
        <div class="welcome-box">
            <p><strong>A new member has just joined the church!</strong></p>
        </div>

        <div class="info-grid">
            <div class="info-item">
                <div class="label">MEMBER NAME</div>
                <div class="value">$firstName $lastName</div>
            </div>
            <div class="info-item">
                <div class="label">EMAIL</div>
                <div class="value"><a href="mailto:$email">$email</a></div>
            </div>
            <div class="info-item">
                <div class="label">PHONE</div>
                <div class="value">$phone</div>
            </div>
            <div class="info-item">
                <div class="label">DATE JOINED</div>
                <div class="value">$dateCreated</div>
            </div>
        </div>

        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
            <p>Please reach out to welcome this new member to our community.</p>
            <p style="margin: 0; font-size: 12px; color: #999;">— Eternal Love Church Management System</p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    /**
     * Render announcement notification template
     */
    private function renderAnnouncementTemplate(array $data): string
    {
        $title = htmlspecialchars($data['title'] ?? 'Announcement');
        $content = nl2br(htmlspecialchars($data['content'] ?? ''));
        $category = htmlspecialchars($data['category'] ?? 'General');
        $dashboardUrl = rtrim(getenv('FRONTEND_URL') ?: getenv('APP_URL') ?: 'https://elchurch.site', '/') . '/dashboard';

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
        .announcement-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
        .category-badge { display: inline-block; background: #f59e0b; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; margin-left: 10px; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0;">📢 New Announcement</h2>
        </div>
        
        <div style="margin: 15px 0;">
            <h3 style="margin: 10px 0; color: #333;">$title<span class="category-badge">$category</span></h3>
        </div>

        <div class="announcement-box">
            $content
        </div>

        <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 4px;">
            <a href="$dashboardUrl" style="display: inline-block; background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">View in Dashboard</a>
        </div>

        <div class="footer">
            <p>This is an automated notification from Eternal Love Church.</p>
            <p style="margin: 0; font-size: 11px;">— Eternal Love Church Management System</p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    /**
     * Render prayer request notification template
     */
    private function renderPrayerRequestTemplate(array $data): string
    {
        $title = htmlspecialchars($data['title'] ?? 'Prayer Request');
        $desc = isset($data['description']) ? $data['description'] : (isset($data['content']) ? $data['content'] : '');
        $description = nl2br(htmlspecialchars($desc));
        $urgency = htmlspecialchars($data['urgency'] ?? 'Normal');
        $submitter = htmlspecialchars($data['submitted_by'] ?? 'Anonymous');

        $urgencyColor = match($urgency) {
            'urgent', 'critical' => '#ef4444',
            'high' => '#f59e0b',
            default => '#3b82f6'
        };

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: #6366f1; color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
        .urgency-badge { display: inline-block; background: $urgencyColor; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-left: 10px; }
        .prayer-box { background: #f0f4ff; border-left: 4px solid #6366f1; padding: 20px; margin: 20px 0; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0;">🙏 New Prayer Request<span class="urgency-badge">$urgency</span></h2>
        </div>
        
        <div class="prayer-box">
            <h3 style="margin-top: 0; color: #1f2937;">$title</h3>
            <p>$description</p>
        </div>

        <div style="margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 4px;">
            <p style="margin: 5px 0;"><strong>Submitted by:</strong> $submitter</p>
            <p style="margin: 5px 0;"><strong>Urgency Level:</strong> $urgency</p>
        </div>

        <div class="footer">
            <p>Please remember this prayer request in your intercessions.</p>
            <p style="margin: 0; font-size: 11px;">— Eternal Love Church Prayer Network</p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    /**
     * Notify a promoted leader (email + WhatsApp) and the pastoral inboxes (email).
     */
    public function notifyLeadershipPromotion(array $leaderData, string $newRole, array $context = []): bool
    {
        try {
            $fullName  = trim(($leaderData['first_name'] ?? '') . ' ' . ($leaderData['last_name'] ?? ''));
            $roleLabel = $this->formatRoleLabel($newRole);
            $subject   = "Promotion: {$fullName} is now a {$roleLabel}";
            $body      = $this->renderLeadershipPromotionTemplate($leaderData, $newRole, $context);

            // ── Email to promoted person ──────────────────────────────────
            $sentLeader = false;
            if (!empty($leaderData['email'])) {
                $sentLeader = $this->sendEmailViaPHPMailer(
                    $leaderData['email'],
                    $subject,
                    $body,
                    $fullName
                );
            }

            // ── Email to pastors ──────────────────────────────────────────
            foreach ($this->getPastorEmails() as $pastor) {
                if (!empty($leaderData['email']) && strcasecmp($pastor['email'] ?? '', $leaderData['email']) === 0) {
                    continue;
                }
                $this->sendEmailViaPHPMailer(
                    $pastor['email'],
                    "Leadership update: {$fullName} promoted to {$roleLabel}",
                    $this->renderLeadershipPromotionAdminTemplate($leaderData, $newRole, $context),
                    trim(($pastor['first_name'] ?? '') . ' ' . ($pastor['last_name'] ?? ''))
                );
            }

            // ── WhatsApp to promoted person ───────────────────────────────
            $phone = $leaderData['phone'] ?? null;
            if (empty($phone) && !empty($leaderData['id'])) {
                $row   = $this->db->first("SELECT phone FROM users WHERE id = ?", [$leaderData['id']]);
                $phone = $row['phone'] ?? null;
            }

            if (!empty($phone)) {
                $assignment = !empty($context['assignment']) ? "\nAssignment: {$context['assignment']}" : '';
                $waMessage  = "🎉 Congratulations {$fullName}!\n\nYou have been promoted to *{$roleLabel}* at Eternal Love Church.{$assignment}\n\nYour new role is effective immediately. We believe in you and are grateful for your service. 🙏\n\n— Eternal Love Church";

                $waService = new WhatsAppService();
                if ($waService->isConfigured()) {
                    $waService->send([['phone' => $phone]], $waMessage);
                }
            }

            return $sentLeader;
        } catch (Exception $e) {
            error_log("PastorNotificationService - notifyLeadershipPromotion failed: " . $e->getMessage());
            return false;
        }
    }

    private function formatRoleLabel(string $role): string
    {
        return match ($role) {
            'zone_leader' => 'Zone Leader',
            'cell_leader' => 'Cell Leader',
            'pastor' => 'Pastor',
            'admin' => 'Admin',
            'superadmin' => 'Super Admin',
            'elder' => 'Elder',
            'usher' => 'Usher',
            default => ucfirst(str_replace('_', ' ', $role)),
        };
    }

    private function renderLeadershipPromotionTemplate(array $leaderData, string $newRole, array $context = []): string
    {
        $fullName = htmlspecialchars(trim(($leaderData['first_name'] ?? '') . ' ' . ($leaderData['last_name'] ?? '')), ENT_QUOTES, 'UTF-8');
        $roleLabel = htmlspecialchars($this->formatRoleLabel($newRole), ENT_QUOTES, 'UTF-8');
        $assignment = !empty($context['assignment']) ? htmlspecialchars($context['assignment'], ENT_QUOTES, 'UTF-8') : '';
        $assignmentHtml = $assignment ? "<p><strong>Assignment:</strong> {$assignment}</p>" : '';

        return <<<HTML
<p>Hello {$fullName},</p>
<p>Congratulations, you have been promoted to <strong>{$roleLabel}</strong>.</p>
{$assignmentHtml}
<p>Your permissions have been updated immediately in the church system.</p>
<p>If you were not expecting this change, please contact the church office.</p>
HTML;
    }

    private function renderLeadershipPromotionAdminTemplate(array $leaderData, string $newRole, array $context = []): string
    {
        $fullName = htmlspecialchars(trim(($leaderData['first_name'] ?? '') . ' ' . ($leaderData['last_name'] ?? '')), ENT_QUOTES, 'UTF-8');
        $email = htmlspecialchars($leaderData['email'] ?? '', ENT_QUOTES, 'UTF-8');
        $roleLabel = htmlspecialchars($this->formatRoleLabel($newRole), ENT_QUOTES, 'UTF-8');
        $assignment = !empty($context['assignment']) ? htmlspecialchars($context['assignment'], ENT_QUOTES, 'UTF-8') : '';
        $assignmentHtml = $assignment ? "<p><strong>Assignment:</strong> {$assignment}</p>" : '';

        return <<<HTML
<p>A leadership promotion was completed.</p>
<p><strong>Name:</strong> {$fullName}<br>
<strong>Email:</strong> {$email}<br>
<strong>New Role:</strong> {$roleLabel}</p>
{$assignmentHtml}
<p>The promoted leader and pastoral inboxes have been notified.</p>
HTML;
    }
}
