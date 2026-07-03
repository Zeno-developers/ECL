<?php

namespace App\Services;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;

/**
 * Centralized SMTP configuration service
 * Provides a singleton PHPMailer instance with consistent SMTP settings
 */
class SMTPConfigService
{
    private static ?PHPMailer $instance = null;

    /**
     * Get or create PHPMailer instance with SMTP configured
     */
    public static function getInstance(): PHPMailer
    {
        if (self::$instance === null) {
            self::$instance = self::createMailer();
        }
        return self::$instance;
    }

    /**
     * Create a fresh PHPMailer instance with SMTP configuration
     */
    private static function createMailer(): PHPMailer
    {
        $mail = new PHPMailer(true);
        
        $mail->isSMTP();
        $mail->Host        = self::getHost();
        $mail->Port        = self::getPort();
        $mail->SMTPAuth    = true;
        $mail->Username    = self::getUsername();
        $mail->Password    = self::getPassword();
        $mail->SMTPSecure  = self::getEncryption();
        $mail->Timeout = 15;
        
        $mail->setFrom(self::getFromAddress(), self::getFromName());
        
        return $mail;
    }

    /**
     * Get host from environment or default to Gmail
     */
    public static function getHost(): string
    {
        return getenv('MAIL_HOST') ?: 'smtp.gmail.com';
    }

    /**
     * Get port from environment or default
     */
    public static function getPort(): int
    {
        return (int)(getenv('MAIL_PORT') ?: 587);
    }

    /**
     * Get username from environment
     */
    public static function getUsername(): string
    {
        return getenv('MAIL_USERNAME') ?: '';
    }

    /**
     * Get password from environment
     */
    public static function getPassword(): string
    {
        return getenv('MAIL_PASSWORD') ?: '';
    }

    /**
     * Get encryption from environment or default to TLS
     */
    public static function getEncryption(): string
    {
        return getenv('MAIL_ENCRYPTION') ?: 'tls';
    }

    /**
     * Get from address from environment
     */
    public static function getFromAddress(): string
    {
        return getenv('MAIL_FROM_ADDRESS') ?: 'noreply@elchurch.site';
    }

    /**
     * Get from name from environment
     */
    public static function getFromName(): string
    {
        return getenv('MAIL_FROM_NAME') ?: 'Eternal Love Church';
    }

    /**
     * Create a fresh mailer instance for each email (to avoid conflicts between recipients)
     */
    public static function createFreshMailer(): PHPMailer
    {
        return self::createMailer();
    }

    /**
     * Get SMTP configuration array for logging/debugging
     */
    public static function getConfig(): array
    {
        return [
            'host' => self::getHost(),
            'port' => self::getPort(),
            'username' => self::getUsername(),
            'encryption' => self::getEncryption(),
            'from_address' => self::getFromAddress(),
            'from_name' => self::getFromName()
        ];
    }
}
?>
