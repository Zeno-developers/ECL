-- SnapScan online giving tables
-- Apply this migration after the core church schema exists.

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
    donation_uuid VARCHAR(36) NOT NULL,
    user_id INT NULL,
    amount DECIMAL(10,2) NOT NULL,
    fund_id INT NULL,
    status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    snapscan_transaction_id VARCHAR(255) NULL,
    snapscan_payment_url TEXT NULL,
    webhook_received_at DATETIME NULL,
    webhook_payload LONGTEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    receipt_sent TINYINT(1) NOT NULL DEFAULT 0,
    UNIQUE KEY uq_snapscan_donation_uuid (donation_uuid),
    UNIQUE KEY uq_snapscan_transaction_id (snapscan_transaction_id),
    KEY idx_snapscan_donations_user_id (user_id),
    KEY idx_snapscan_donations_status (status),
    KEY idx_snapscan_donations_fund_id (fund_id),
    KEY idx_snapscan_donations_created_at (created_at),
    KEY idx_snapscan_donations_completed_at (completed_at),
    CONSTRAINT fk_snapscan_donations_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_snapscan_donations_fund
        FOREIGN KEY (fund_id) REFERENCES giving_funds(id)
        ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS snapscan_webhook_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    raw_headers LONGTEXT NOT NULL,
    raw_body LONGTEXT NOT NULL,
    processed TINYINT(1) NOT NULL DEFAULT 0,
    error_message TEXT NULL,
    KEY idx_snapscan_webhook_log_received_at (received_at),
    KEY idx_snapscan_webhook_log_processed (processed)
);
