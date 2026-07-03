-- Zone Leader Requests Table
-- Allows members to request to become zone leaders, requiring superadmin approval

CREATE TABLE IF NOT EXISTS zone_leader_requests (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id INTEGER NOT NULL,
    zone_id INTEGER NOT NULL,
    motivation TEXT NULLABLE,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER NULLABLE,
    reviewed_at TIMESTAMP NULL,
    rejection_reason TEXT NULLABLE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE INDEX idx_user_zone (user_id, zone_id),
    INDEX idx_status (status),
    INDEX idx_requested_at (requested_at),
    INDEX idx_zone_id (zone_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add to SQLite as well
-- For SQLite, use this alternative:

CREATE TABLE IF NOT EXISTS zone_leader_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    zone_id INTEGER NOT NULL,
    motivation TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER,
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE (user_id, zone_id)
);

CREATE INDEX IF NOT EXISTS idx_zone_requests_status ON zone_leader_requests(status);
CREATE INDEX IF NOT EXISTS idx_zone_requests_requested_at ON zone_leader_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_zone_requests_zone_id ON zone_leader_requests(zone_id);
