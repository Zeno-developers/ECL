-- Compatibility table for fund-based giving workflows.
-- If your install already has a different funds table, this can be skipped.

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

INSERT IGNORE INTO giving_funds (name, description, goal_amount, current_amount, is_active)
SELECT 'General Giving', 'Default church giving fund', 0.00, 0.00, 1
WHERE NOT EXISTS (
    SELECT 1 FROM giving_funds WHERE name = 'General Giving'
);
