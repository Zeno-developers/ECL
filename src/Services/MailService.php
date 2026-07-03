<?php

namespace App\Services;

use Exception;
use App\Services\SMTPConfigService;
use App\Services\LoggerService;

class MailService
{

    /**
     * Send welcome email to new member
     */
    public function sendWelcomeEmail(string $email, string $firstName, string $lastName, string $loginUrl = 'https://elchurch.site/login'): bool
    {
        try {
            // Use centralized SMTP config
            $mail = SMTPConfigService::createFreshMailer();
            
            $mail->addAddress($email, "$firstName $lastName");
            $mail->isHTML(true);
            $mail->Subject = 'Welcome to Eternal Love Church!';
            
            $html = $this->renderWelcomeTemplate($firstName, $loginUrl);
            $mail->Body = $html;
            $mail->AltBody = strip_tags($html);

            $logger = new LoggerService();
            if ($mail->send()) {
                $logger->info('Welcome email sent successfully', ['email' => $email]);
                return true;
            } else {
                $logger->warning('Failed to send welcome email', ['email' => $email, 'error' => $mail->ErrorInfo, 'smtp' => SMTPConfigService::getConfig()]);
                return false;
            }
        } catch (Exception $e) {
            $logger = new LoggerService();
            $logger->error('Exception sending welcome email', ['email' => $email, 'error' => $e->getMessage(), 'smtp' => SMTPConfigService::getConfig()]);
            return false;
        }
    }

    /**
     * Send poll to members
     */
    public function sendPollEmail(
        array $recipients,
        string $pollTitle,
        string $pollDescription,
        string $meetingDate,
        string $meetingTime,
        string $meetingLocation,
        string $pollLink,
        ?string $senderName = null
    ): int {
        if (!$this->isConfigured() || empty($recipients)) {
            return 0;
        }

        $sent = 0;
        $mail = SMTPConfigService::createFreshMailer();
        $mail->SMTPKeepAlive = true;
        $mail->isHTML(true);
        $mail->Subject = "Action Required: Confirm your attendance for " . $pollTitle;

        foreach ($recipients as $recipient) {
            try {
                $mail->clearAddresses();
                $mail->addAddress($recipient['email'], $recipient['name']);

                $html = $this->renderPollTemplate(
                    $recipient['name'],
                    $pollTitle,
                    $pollDescription,
                    $meetingDate,
                    $meetingTime,
                    $meetingLocation,
                    $pollLink,
                    $senderName
                );

                $mail->Body = $html;
                $mail->AltBody = strip_tags($html);

                if ($mail->send()) {
                    $sent++;
                }
            } catch (Exception $e) {
                error_log("Failed to send poll email to {$recipient['email']}: " . $e->getMessage());
            }
        }

        $mail->smtpClose();
        return $sent;
    }

    /**
     * Send announcement notification
     */
    public function sendAnnouncementEmail(
        array $recipients,
        string $announcementTitle,
        string $announcementContent,
        ?string $expiresAt = null
    ): int {
        if (!$this->isConfigured() || empty($recipients)) {
            return 0;
        }

        $sent = 0;
        $mail = SMTPConfigService::createFreshMailer();
        $mail->SMTPKeepAlive = true;
        $mail->isHTML(true);
        $mail->Subject = "Announcement: " . $announcementTitle;

        foreach ($recipients as $recipient) {
            try {
                $mail->clearAddresses();
                $mail->addAddress($recipient['email'], $recipient['name']);

                $html = $this->renderAnnouncementTemplate(
                    $recipient['name'],
                    $announcementTitle,
                    $announcementContent,
                    $expiresAt
                );

                $mail->Body = $html;
                $mail->AltBody = strip_tags($html);

                if ($mail->send()) {
                    $sent++;
                }
            } catch (Exception $e) {
                error_log("Failed to send announcement email to {$recipient['email']}: " . $e->getMessage());
            }
        }

        $mail->smtpClose();
        return $sent;
    }

    /**
     * Send a custom email to multiple recipients using the shared SMTP flow.
     */
    public function sendCustomEmail(array $recipients, string $subject, string $body): int
    {
        if (!$this->isConfigured() || empty($recipients)) {
            return 0;
        }

        $sent   = 0;
        $logger = new LoggerService();
        $mail   = SMTPConfigService::createFreshMailer();
        $mail->SMTPKeepAlive = true;
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $body;
        $mail->AltBody = strip_tags($body);

        foreach ($recipients as $recipient) {
            if (empty($recipient['email'])) {
                continue;
            }
            try {
                $mail->clearAddresses();
                $mail->addAddress($recipient['email'], $recipient['name'] ?? '');

                if ($mail->send()) {
                    $sent++;
                    $logger->info('Custom email sent successfully', [
                        'email' => $recipient['email'],
                        'subject' => $subject,
                    ]);
                } else {
                    $logger->warning('Failed to send custom email', [
                        'email' => $recipient['email'],
                        'subject' => $subject,
                        'error' => $mail->ErrorInfo,
                        'smtp' => SMTPConfigService::getConfig(),
                    ]);
                }
            } catch (Exception $e) {
                $logger->error('Exception sending custom email', [
                    'email' => $recipient['email'],
                    'subject' => $subject,
                    'error' => $e->getMessage(),
                    'smtp' => SMTPConfigService::getConfig(),
                ]);
            }
        }

        $mail->smtpClose();
        return $sent;
    }

    /**
     * Send password reset email
     */
    public function sendPasswordResetEmail(
        string $email,
        string $firstName,
        string $lastName,
        string $resetLink
    ): bool {
        try {
            // Use centralized fresh mailer for consistency with other sends
            $mail = SMTPConfigService::createFreshMailer();

            $mail->addAddress($email, "$firstName $lastName");
            $mail->isHTML(true);
            $mail->Subject = 'Reset Your Password - Eternal Love Church';

            $html = $this->renderPasswordResetTemplate($firstName, $resetLink);
            $mail->Body = $html;
            $mail->AltBody = strip_tags($html);

            $logger = new LoggerService();
            if ($mail->send()) {
                $logger->info('Password reset email sent', ['email' => $email]);
                return true;
            }

            $logger->warning('Failed to send password reset email', ['email' => $email, 'error' => ($mail->ErrorInfo ?? 'unknown'), 'smtp' => SMTPConfigService::getConfig()]);
            return false;
        } catch (Exception $e) {
            $logger = new LoggerService();
            $logger->error('Exception sending password reset email', ['email' => $email, 'error' => $e->getMessage(), 'smtp' => SMTPConfigService::getConfig()]);
            return false;
        }
    }

    /**
     * Send new account credentials to visitor (auto-created account)
     */
    public function sendVisitorAccountCreatedEmail(
        string $email,
        string $firstName,
        string $lastName,
        string $temporaryPassword,
        string $loginUrl = 'https://elchurch.site/login',
        ?string $memberNumber = null
    ): bool {
        try {
            // Use centralized fresh mailer for consistency with other send paths
            $mail = SMTPConfigService::createFreshMailer();

            $mail->addAddress($email, "$firstName $lastName");
            $mail->isHTML(true);
            $mail->Subject = 'Your Church Account Has Been Created - Eternal Love Church';

            $html = $this->renderVisitorAccountTemplate(
                $firstName,
                $lastName,
                $email,
                $temporaryPassword,
                $loginUrl,
                $memberNumber
            );
            $mail->Body = $html;
            $mail->AltBody = strip_tags($html);

            $logger = new LoggerService();
            if ($mail->send()) {
                $logger->info('Visitor account creation email sent', ['email' => $email, 'member_number' => $memberNumber]);
                return true;
            }

            $logger->warning('Failed to send visitor account creation email', ['email' => $email, 'error' => ($mail->ErrorInfo ?? 'unknown'), 'smtp' => SMTPConfigService::getConfig()]);
            return false;
        } catch (Exception $e) {
            $logger = new LoggerService();
            $logger->error('Exception sending visitor account creation email', ['email' => $email, 'error' => $e->getMessage(), 'smtp' => SMTPConfigService::getConfig()]);
            return false;
        }
    }

    private function isConfigured(): bool
    {
        return !empty(getenv('MAIL_USERNAME')) && !empty(getenv('MAIL_PASSWORD'));
    }

    private function renderWelcomeTemplate(string $firstName, string $loginUrl): string
    {
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6; }
        .wrapper { background-color: #f3f4f6; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 60px 40px; text-align: center; position: relative; overflow: hidden; }
        .header::before { content: ''; position: absolute; top: -50%; right: -10%; width: 300px; height: 300px; background: rgba(255, 255, 255, 0.1); border-radius: 50%; }
        .header h1 { font-size: 32px; font-weight: 700; margin-bottom: 10px; position: relative; z-index: 1; }
        .header p { font-size: 16px; margin-top: 8px; opacity: 0.95; position: relative; z-index: 1; }
        .content { padding: 40px; }
        .greeting { font-size: 18px; color: #1f2937; margin-bottom: 20px; font-weight: 500; }
        .message-block { background: linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 100%); border-left: 4px solid #7c3aed; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .message-block p { color: #374151; line-height: 1.8; }
        .cta-section { text-align: center; margin: 40px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3); }
        .button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4); }
        .footer-section { background: #f9fafb; padding: 20px 40px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
        .footer-section p { margin: 5px 0; }
        .signature { margin: 30px 0 0 0; font-weight: 500; color: #1f2937; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>🙏 Welcome Home</h1>
                <p>You're now part of our family</p>
            </div>
            <div class="content">
                <p class="greeting">Hi $firstName,</p>
                <p style="color: #4b5563; line-height: 1.8; margin-bottom: 20px;">We're absolutely thrilled to have you join the Eternal Love Church community! Your account has been successfully created, and we can't wait for you to experience everything our church family has to offer.</p>
                
                <div class="message-block">
                    <p>✨ Your journey with us starts now. Access your personalized dashboard to stay connected with sermons, events, announcements, and our vibrant community.</p>
                </div>
                
                <div class="cta-section">
                    <a href="$loginUrl" class="button">Access Your Dashboard</a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 25px;">
                    <strong style="color: #1f2937;">Need help getting started?</strong><br>
                    Check out our getting started guide or contact us anytime at info@elchurch.site
                </p>
                
                <div style="margin-top: 35px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p class="signature">With warmest blessings,<br><strong>The Eternal Love Church Family</strong></p>
                </div>
            </div>
            <div class="footer-section">
                <p>&copy; 2026 Eternal Love Church. All rights reserved.</p>
                <p>A3313 Rd 3935, Mtubatuba, South Africa</p>
            </div>
        </div>
    </div>
</body>
</html>
HTML;
    }

    private function renderPollTemplate(
        string $recipientName,
        string $pollTitle,
        string $pollDescription,
        string $meetingDate,
        string $meetingTime,
        string $meetingLocation,
        string $pollLink,
        ?string $senderName
    ): string {
        $senderLine = $senderName ? "sent by <strong>$senderName</strong>" : "sent by your church leadership";
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6; }
        .wrapper { background-color: #f3f4f6; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; padding: 50px 40px; text-align: center; }
        .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
        .header p { font-size: 15px; opacity: 0.95; }
        .content { padding: 40px; }
        .poll-title { font-size: 22px; font-weight: 700; color: #1f2937; margin: 20px 0 10px 0; }
        .poll-description { color: #4b5563; line-height: 1.8; margin-bottom: 30px; }
        .details-grid { display: grid; gap: 15px; margin: 30px 0; }
        .detail-card { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #06b6d4; padding: 15px; border-radius: 8px; }
        .detail-label { font-weight: 600; color: #0891b2; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .detail-value { font-size: 16px; color: #1f2937; font-weight: 500; }
        .cta-section { text-align: center; margin: 40px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; padding: 16px 45px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3); }
        .button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(6, 182, 212, 0.4); }
        .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .info-box p { color: #92400e; font-size: 14px; }
        .footer-section { background: #f9fafb; padding: 20px 40px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
        .footer-section p { margin: 5px 0; }
        .signature { margin-top: 30px; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>📋 Your Response Needed</h1>
                <p>Confirm your attendance for an upcoming event</p>
            </div>
            <div class="content">
                <p style="color: #4b5563; margin-bottom: 20px;">Dear $recipientName,</p>
                
                <p style="color: #4b5563; line-height: 1.8; margin-bottom: 15px;">An attendance poll has been $senderLine. Your response will help us plan effectively.</p>
                
                <div class="poll-title">$pollTitle</div>
                <p class="poll-description">$pollDescription</p>
                
                <div class="details-grid">
                    <div class="detail-card">
                        <div class="detail-label">📅 Date</div>
                        <div class="detail-value">$meetingDate</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">🕐 Time</div>
                        <div class="detail-value">$meetingTime</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">📍 Location</div>
                        <div class="detail-value">$meetingLocation</div>
                    </div>
                </div>
                
                <div class="cta-section">
                    <a href="$pollLink" class="button">Respond Now →</a>
                </div>
                
                <div class="info-box">
                    <p><strong>💡 Tip:</strong> Click the button above to view all available response options and submit your attendance status.</p>
                </div>
                
                <div style="margin-top: 35px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #4b5563;">
                    <p>Thank you for being part of our community!</p>
                    <p class="signature" style="margin-top: 15px;"><strong>Eternal Love Church</strong></p>
                </div>
            </div>
            <div class="footer-section">
                <p>&copy; 2026 Eternal Love Church. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
HTML;
    }

    private function renderAnnouncementTemplate(
        string $recipientName,
        string $announcementTitle,
        string $announcementContent,
        ?string $expiresAt
    ): string {
        $dashboardUrl = rtrim(getenv('FRONTEND_URL') ?: getenv('APP_URL') ?: 'https://elchurch.site', '/') . '/dashboard';
        $expiresLine = $expiresAt ? "<div style='background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 6px; margin-top: 15px;'><p style='color: #92400e; font-size: 13px; margin: 0;'><strong>⏰ Valid until:</strong> $expiresAt</p></div>" : '';
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6; }
        .wrapper { background-color: #f3f4f6; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 50px 40px; text-align: center; }
        .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
        .header p { font-size: 15px; opacity: 0.95; }
        .content { padding: 40px; }
        .announcement-title { font-size: 24px; font-weight: 700; color: #1f2937; margin: 20px 0 15px 0; }
        .announcement-box { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-left: 4px solid #f59e0b; padding: 25px; border-radius: 8px; margin: 20px 0; }
        .announcement-content { color: #4b5563; line-height: 1.8; font-size: 15px; }
        .cta-section { text-align: center; margin: 35px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3); }
        .button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4); }
        .footer-section { background: #f9fafb; padding: 20px 40px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
        .footer-section p { margin: 5px 0; }
        .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>📢 Announcement</h1>
                <p>Important message from Eternal Love Church</p>
            </div>
            <div class="content">
                <p style="color: #4b5563; margin-bottom: 15px;">Dear $recipientName,</p>
                
                <div class="announcement-title">$announcementTitle</div>
                
                <div class="announcement-box">
                    <div class="announcement-content">$announcementContent</div>
                    $expiresLine
                </div>
                
                <div class="cta-section">
                    <a href="$dashboardUrl" class="button">View More in Dashboard →</a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 25px;">
                    Stay connected with all church announcements and updates through your personal dashboard.
                </p>
                
                <div class="signature">
                    <p style="color: #4b5563;">In Christ's love,</p>
                    <p style="color: #1f2937; font-weight: 600; margin-top: 5px;">Eternal Love Church</p>
                </div>
            </div>
            <div class="footer-section">
                <p>&copy; 2026 Eternal Love Church. All rights reserved.</p>
                <p>A3313 Rd 3935, Mtubatuba, South Africa</p>
            </div>
        </div>
    </div>
</body>
</html>
HTML;
    }

    private function renderPasswordResetTemplate(string $firstName, string $resetLink): string
    {
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6; }
        .wrapper { background-color: #f3f4f6; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 50px 40px; text-align: center; }
        .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
        .header p { font-size: 15px; opacity: 0.95; }
        .content { padding: 40px; }
        .security-box { background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .security-box p { color: #991b1b; font-size: 14px; margin: 5px 0; font-weight: 500; }
        .cta-section { text-align: center; margin: 40px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3); }
        .button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4); }
        .link-box { background: #f3f4f6; border: 2px dashed #d1d5db; padding: 15px; border-radius: 8px; margin: 20px 0; word-break: break-all; }
        .link-box p { font-family: 'Courier New', monospace; font-size: 12px; color: #4b5563; margin: 0; }
        .info-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .info-box p { color: #1e40af; font-size: 14px; margin: 5px 0; }
        .footer-section { background: #f9fafb; padding: 20px 40px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
        .footer-section p { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>🔐 Password Reset</h1>
                <p>Secure your account now</p>
            </div>
            <div class="content">
                <p style="color: #4b5563; margin-bottom: 20px;">Hi $firstName,</p>
                
                <p style="color: #4b5563; line-height: 1.8; margin-bottom: 20px;">We received a password reset request for your Eternal Love Church account. Click the button below to create a new password:</p>
                
                <div class="cta-section">
                    <a href="$resetLink" class="button">Reset Password Securely</a>
                </div>
                
                <p style="text-align: center; color: #6b7280; font-size: 13px; margin: 15px 0; text-decoration: underline;">Or copy and paste this link into your browser:</p>
                <div class="link-box">
                    <p>$resetLink</p>
                </div>
                
                <div class="security-box">
                    <p>⚠️ <strong>Security Information:</strong></p>
                    <p>• This link expires in 24 hours for your security</p>
                    <p>• Never share this link with anyone</p>
                    <p>• Eternal Love Church staff will never ask for your password</p>
                </div>
                
                <div class="info-box">
                    <p><strong>💡 Didn't request a password reset?</strong></p>
                    <p>If you didn't make this request, you can safely ignore this email. Your account remains secure.</p>
                </div>
                
                <div style="margin-top: 35px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #4b5563;">
                    <p>For security questions or concerns, contact us at info@elchurch.site</p>
                    <p style="margin-top: 15px; font-weight: 600; color: #1f2937;">Blessings,<br>Eternal Love Church</p>
                </div>
            </div>
            <div class="footer-section">
                <p>&copy; 2026 Eternal Love Church. All rights reserved.</p>
                <p>© All rights reserved | Your security is our priority</p>
            </div>
        </div>
    </div>
</body>
</html>
HTML;
    }

    private function renderVisitorAccountTemplate(
        string $firstName,
        string $lastName,
        string $email,
        string $temporaryPassword,
        string $loginUrl,
        ?string $memberNumber
    ): string {
        $memberNumberHtml = $memberNumber ? "<div class='cred-row'><span class='cred-label'>👥 Member Number:</span><div class='cred-value'>$memberNumber</div></div>" : '';
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6; }
        .wrapper { background-color: #f3f4f6; padding: 40px 20px; }
        .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 60px 40px; text-align: center; position: relative; overflow: hidden; }
        .header::before { content: ''; position: absolute; top: -50%; right: -10%; width: 300px; height: 300px; background: rgba(255, 255, 255, 0.1); border-radius: 50%; }
        .header h1 { font-size: 32px; font-weight: 700; margin-bottom: 5px; position: relative; z-index: 1; }
        .header p { font-size: 16px; margin-top: 8px; opacity: 0.95; position: relative; z-index: 1; }
        .content { padding: 40px; }
        .intro-text { color: #4b5563; line-height: 1.8; margin-bottom: 30px; font-size: 15px; }
        .section-title { font-size: 18px; font-weight: 700; color: #1f2937; margin: 25px 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #10b981; }
        .credentials { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #10b981; padding: 25px; border-radius: 10px; margin: 20px 0; }
        .cred-row { margin: 18px 0; }
        .cred-label { font-weight: 600; color: #059669; display: block; margin-bottom: 6px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
        .cred-value { background: white; padding: 12px 15px; border-radius: 6px; font-family: 'Courier New', monospace; word-break: break-all; color: #1f2937; border: 1px solid #d1fae5; }
        .steps { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .steps h4 { color: #0c4a6e; margin-bottom: 12px; font-size: 15px; }
        .steps ol { margin-left: 20px; }
        .steps li { color: #1f2937; margin: 10px 0; line-height: 1.7; }
        .steps li strong { color: #0c4a6e; }
        .safety-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .safety-box p { color: #92400e; font-size: 14px; margin: 5px 0; }
        .cta-section { text-align: center; margin: 35px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 45px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); }
        .button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4); }
        .welcome-note { background: linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%); border-left: 4px solid #6366f1; padding: 18px; border-radius: 8px; margin: 20px 0; }
        .welcome-note p { color: #3730a3; font-size: 14px; margin: 5px 0; }
        .footer-section { background: #f9fafb; padding: 25px 40px; border-top: 1px solid #e5e7eb; }
        .footer-text { font-size: 13px; color: #6b7280; text-align: center; margin: 8px 0; }
        .contact-info { font-size: 12px; color: #9ca3af; margin-top: 15px; text-align: center; padding-top: 15px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome to Our Family!</h1>
                <p>Your Church Account is Ready</p>
            </div>
            <div class="content">
                <p class="intro-text">Dear $firstName,</p>
                <p class="intro-text">We're absolutely thrilled to have you visit Eternal Love Church! Your account has been successfully created, and you now have access to our online community portal. Below are your login credentials and instructions to get started.</p>
                
                <div class="section-title">Your Login Information</div>
                <div class="credentials">
                    <div class="cred-row">
                        <span class="cred-label">✉️ Email (Username)</span>
                        <div class="cred-value">$email</div>
                    </div>
                    <div class="cred-row">
                        <span class="cred-label">🔐 Temporary Password</span>
                        <div class="cred-value">$temporaryPassword</div>
                    </div>
                    $memberNumberHtml
                </div>
                
                <div class="section-title">Getting Started - 5 Easy Steps</div>
                <div class="steps">
                    <h4>Follow these steps to access your dashboard:</h4>
                    <ol>
                        <li><strong>Click the button below</strong> or visit $loginUrl</li>
                        <li><strong>Enter your email</strong> as the username</li>
                        <li><strong>Enter the temporary password</strong> provided above</li>
                        <li><strong>Create a new password</strong> that you can remember</li>
                        <li><strong>Complete your profile</strong> to personalize your experience</li>
                    </ol>
                </div>
                
                <div class="cta-section">
                    <a href="$loginUrl" class="button">Access Your Dashboard Now →</a>
                </div>
                
                <div class="safety-box">
                    <p><strong>🔒 Security Reminder:</strong></p>
                    <p>• Change your temporary password on your first login</p>
                    <p>• Never share your password with anyone</p>
                    <p>• Church staff will never ask for your password</p>
                </div>
                
                <div class="welcome-note">
                    <p><strong>💜 What's Next?</strong></p>
                    <p>Once you log in, you'll be able to view our latest sermons, connect with events, respond to announcements, and be part of our vibrant online community!</p>
                </div>
                
                <p style="color: #4b5563; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <strong style="color: #1f2937;">Need help?</strong><br>
                    If you have any questions or encounter any issues accessing your account, please don't hesitate to contact us. We're here to help!
                </p>
                
                <p style="color: #1f2937; font-weight: 600; margin-top: 25px; font-size: 16px;">
                    Warmest blessings,<br>
                    <span style="color: #10b981;">Eternal Love Church Family</span>
                </p>
            </div>
            <div class="footer-section">
                <p class="footer-text">&copy; 2026 Eternal Love Church. All rights reserved.</p>
                <p class="footer-text">A3313 Rd 3935, Mtubatuba, South Africa</p>
                <div class="contact-info">
                    <p>📧 Email: info@elchurch.site | 📍 Visit us during service hours</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
HTML;
    }
}
