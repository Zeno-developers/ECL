<?php
/**
 * Create email system tables
 */
require 'src/bootstrap.php';

use App\Database;

try {
    $db = Database::getInstance();
    
    // Create email_queue table
    $sql1 = "CREATE TABLE IF NOT EXISTS `email_queue` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `recipient_email` VARCHAR(255) NOT NULL,
      `recipient_name` VARCHAR(255),
      `subject` VARCHAR(255) NOT NULL,
      `body` LONGTEXT NOT NULL,
      `email_type` VARCHAR(50),
      `status` ENUM('pending', 'sent', 'failed', 'bounced') DEFAULT 'pending',
      `retry_count` INT DEFAULT 0,
      `max_retries` INT DEFAULT 5,
      `last_error` TEXT,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      `sent_at` TIMESTAMP NULL,
      `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX `idx_status` (`status`),
      INDEX `idx_email_type` (`email_type`),
      INDEX `idx_created_at` (`created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $db->query($sql1);
    echo "[✓] email_queue table created successfully\n";
    
    // Create cron_logs table
    $sql2 = "CREATE TABLE IF NOT EXISTS `cron_logs` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `job_name` VARCHAR(100) NOT NULL,
      `event_id` INT,
      `pastors_notified` INT DEFAULT 0,
      `run_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      `status` ENUM('success', 'failed', 'partial') DEFAULT 'success',
      `message` TEXT,
      INDEX `idx_job_name` (`job_name`),
      INDEX `idx_run_at` (`run_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $db->query($sql2);
    echo "[✓] cron_logs table created successfully\n";
    
    echo "\n✅ Email system database setup complete!\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>
