-- Optional: Add personal_email field to users table
-- This stores each pastor's personal/private email address
-- for event reminders to reach them on both channels

ALTER TABLE `users` ADD COLUMN `personal_email` VARCHAR(255) NULL AFTER `email`;

-- Optional: Add index for faster lookups
ALTER TABLE `users` ADD INDEX `idx_personal_email` (`personal_email`);
