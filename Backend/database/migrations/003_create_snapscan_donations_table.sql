-- Migration: Create SnapScan Donations Table
-- Version: 2026-04-18
-- Purpose: Store SnapScan online donation records
-- Note: This legacy migration now creates giving_funds first so the FK is valid

CREATE TABLE IF NOT EXISTS giving_funds (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    goal_amount DECIMAL(10,2) NULL DEFAULT 0.00,
    current_amount DECIMAL(10,2) NULL DEFAULT 0.00,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_giving_funds_name (name),
    KEY idx_giving_funds_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS snapscan_donations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    donation_uuid VARCHAR(36) UNIQUE NOT NULL,
    user_id INT NULL COMMENT 'Logged-in user (nullable for anonymous donors)',
    amount DECIMAL(10, 2) NOT NULL COMMENT 'Donation amount in Rands',
    fund_id INT NULL COMMENT 'Optional link to giving_funds table',
    status VARCHAR(50) DEFAULT 'pending' COMMENT 'pending, completed, failed, cancelled',
    snapscan_transaction_id VARCHAR(100) NULL COMMENT 'Transaction ID from SnapScan API',
    snapscan_payment_url VARCHAR(500) NULL COMMENT 'SnapScan payment URL for donor',
    webhook_payload LONGTEXT NULL COMMENT 'Full webhook and API response data (JSON)',
    donor_name VARCHAR(255) NULL,
    donor_email VARCHAR(255) NULL,
    notes TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at DATETIME NULL COMMENT 'When payment was completed/verified',

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (fund_id) REFERENCES giving_funds(id) ON DELETE SET NULL,
    
    INDEX idx_donation_uuid (donation_uuid),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_completed_at (completed_at),
    INDEX idx_snapscan_transaction (snapscan_transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SQLite alternative (for SQLite databases):
-- CREATE TABLE IF NOT EXISTS snapscan_donations (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     donation_uuid VARCHAR(36) UNIQUE NOT NULL,
--     user_id INTEGER NULL,
--     amount DECIMAL(10, 2) NOT NULL,
--     fund_id INTEGER NULL,
--     status VARCHAR(50) DEFAULT 'pending',
--     snapscan_transaction_id VARCHAR(100) NULL,
--     snapscan_payment_url VARCHAR(500) NULL,
--     webhook_payload TEXT NULL,
--     donor_name VARCHAR(255) NULL,
--     donor_email VARCHAR(255) NULL,
--     notes TEXT NULL,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--     completed_at DATETIME NULL,
--
--     FOREIGN KEY (user_id) REFERENCES users(id),
--     FOREIGN KEY (fund_id) REFERENCES giving_funds(id)
-- );
--
-- CREATE INDEX IF NOT EXISTS idx_snapscan_uuid ON snapscan_donations(donation_uuid);
-- CREATE INDEX IF NOT EXISTS idx_snapscan_user ON snapscan_donations(user_id);
-- CREATE INDEX IF NOT EXISTS idx_snapscan_status ON snapscan_donations(status);
-- CREATE INDEX IF NOT EXISTS idx_snapscan_created ON snapscan_donations(created_at);
