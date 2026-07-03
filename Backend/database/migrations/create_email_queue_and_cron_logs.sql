-- Optional: Email Queue Table for Failed Email Retries
-- This table is used to queue emails that failed to send via SMTP
-- They can be retried later via a separate cron job

CREATE TABLE IF NOT EXISTS `email_queue` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `recipient_email` VARCHAR(255) NOT NULL,
  `recipient_name` VARCHAR(255),
  `subject` VARCHAR(255) NOT NULL,
  `body` LONGTEXT NOT NULL,
  `email_type` VARCHAR(50) NOT NULL COMMENT 'Type: notification, event_reminder, welcome, etc.',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Cron Logs Table for Audit Trail
-- This table tracks when cron jobs run and their results

CREATE TABLE IF NOT EXISTS `cron_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `job_name` VARCHAR(100) NOT NULL,
  `event_id` INT,
  `pastors_notified` INT DEFAULT 0,
  `run_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('success', 'failed', 'partial') DEFAULT 'success',
  `message` TEXT,
  INDEX `idx_job_name` (`job_name`),
  INDEX `idx_event_id` (`event_id`),
  INDEX `idx_run_at` (`run_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
