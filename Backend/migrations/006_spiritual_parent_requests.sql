-- Migration 006: Spiritual parent self-claim requests
-- Members can submit a claim saying "this person brought me to faith"
-- Admins/pastors review and approve or reject

CREATE TABLE IF NOT EXISTS spiritual_parent_requests (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    requester_id    INT UNSIGNED NOT NULL,
    claimed_parent_id INT UNSIGNED NOT NULL,
    status          ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    note            TEXT NULL,
    reviewed_by     INT UNSIGNED NULL,
    reviewed_at     DATETIME NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_requester (requester_id),
    KEY idx_parent    (claimed_parent_id),
    KEY idx_status    (status)
);
