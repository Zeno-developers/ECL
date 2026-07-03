-- ============================================
-- ETERNAL LOVE CHURCH - COMPLETE DATABASE INSTALLATION
-- ============================================
-- For: Afrihost Hosting
-- Database: elchurf5h4a2_elchurch_db
-- User: elchurf5h4a2_dbuser1
-- Version: 1.0 - April 2026
-- 
-- INSTALLATION INSTRUCTIONS:
-- 1. Connect to phpMyAdmin on Afrihost cPanel
-- 2. Select the database: elchurf5h4a2_elchurch_db
-- 3. Go to SQL tab
-- 4. Copy and paste this entire file
-- 5. Click Go/Execute
-- ============================================

-- Set SQL mode for compatibility
SET SQL_MODE='STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CRITICAL: Disable foreign key checks during import to avoid constraint errors
SET FOREIGN_KEY_CHECKS=0;

-- ============================================
-- CORE AUTHENTICATION & USER MANAGEMENT
-- ============================================

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS `users` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'member',
    is_active BOOLEAN DEFAULT 1,
    email_verified BOOLEAN DEFAULT 0,
    verification_token VARCHAR(100),
    reset_token VARCHAR(100),
    reset_token_expires DATETIME,
    must_change_password BOOLEAN DEFAULT 0,
    temp_password_sent_at DATETIME,
    last_login DATETIME,
    cell_id INT NULL,
    zone_id Int NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_users_email (email),
    KEY idx_users_role (role),
    KEY idx_users_cell (cell_id),
    KEY idx_users_zone (zone_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Members table
CREATE TABLE IF NOT EXISTS `members` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    member_number VARCHAR(50) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    date_of_birth DATE,
    gender ENUM('male','female','other') DEFAULT 'male',
    marital_status ENUM('single','married','widowed','divorced') DEFAULT 'single',
    membership_date DATE,
    baptism_date DATE,
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(20),
    notes TEXT,
    cell_id INT NULL,
    zone_id Int NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (cell_id) REFERENCES cells(id) ON DELETE SET NULL,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL,
    KEY idx_members_user_id (user_id),
    KEY idx_members_cell (cell_id),
    KEY idx_members_zone (zone_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CHURCH HIERARCHY - ZONES & CELLS
-- ============================================

-- Zones table (hierarchical structure)
CREATE TABLE IF NOT EXISTS `zones` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    zone_leader_id INT NULL,
    description TEXT,
    area TEXT,
    churches TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_leader_id) REFERENCES users(id) ON DELETE SET NULL,
    KEY idx_zones_zone_leader (zone_leader_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cells table
CREATE TABLE IF NOT EXISTS `cells` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    cell_leader_id INT NULL,
    zone_id INT NULL,
    max_members INT DEFAULT 5,
    meeting_day ENUM('monday','tuesday','wednesday','thursday','friday','saturday','sunday') DEFAULT 'monday',
    meeting_time TIME DEFAULT '19:00:00',
    meeting_location TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_date DATE DEFAULT CURRENT_DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cell_leader_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL,
    KEY idx_cells_cell_leader (cell_leader_id),
    KEY idx_cells_zone (zone_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ATTENDANCE TRACKING
-- ============================================

-- Sunday attendance table
CREATE TABLE IF NOT EXISTS `attendance_sunday` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    checked_in_by INT NULL,
    is_visitor BOOLEAN DEFAULT 0,
    check_in_time TIME DEFAULT CURRENT_TIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (checked_in_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_sunday_attendance (user_id, attendance_date),
    KEY idx_attendance_sunday_user_date (user_id, attendance_date),
    KEY idx_attendance_sunday_date (attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cell meeting attendance table
CREATE TABLE IF NOT EXISTS `attendance_cell` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    cell_id INT NOT NULL,
    meeting_date DATE NOT NULL,
    recorded_by INT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (cell_id) REFERENCES cells(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cell_attendance (user_id, meeting_date),
    KEY idx_attendance_cell_user_date (user_id, meeting_date),
    KEY idx_attendance_cell_cell_date (cell_id, meeting_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ABSENCE MANAGEMENT
-- ============================================

-- Absence tracking table
CREATE TABLE IF NOT EXISTS `absence_flags` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    consecutive_sunday_misses INT DEFAULT 1,
    flagged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notification_sent BOOLEAN DEFAULT 0,
    resolved_at DATETIME NULL,
    resolved_by INT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    KEY idx_absence_flags_user (user_id),
    KEY idx_absence_flags_resolved (resolved_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Absence requests (pre-marking future absences)
CREATE TABLE IF NOT EXISTS `absence_requests` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    absence_date DATE NOT NULL,
    reason TEXT,
    status ENUM('pending','approved','declined') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_by INT NULL,
    processed_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_absence_request (user_id, absence_date),
    KEY idx_absence_requests_user_date (user_id, absence_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CELL MANAGEMENT
-- ============================================

-- Cell change requests
CREATE TABLE IF NOT EXISTS `cell_change_requests` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    current_cell_id INT NULL,
    requested_cell_id INT NOT NULL,
    reason TEXT,
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_by INT NULL,
    processed_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (current_cell_id) REFERENCES cells(id) ON DELETE SET NULL,
    FOREIGN KEY (requested_cell_id) REFERENCES cells(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
    KEY idx_cell_change_requests_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Announcements table
CREATE TABLE IF NOT EXISTS `announcements` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_by INT NOT NULL,
    audience VARCHAR(50) NOT NULL DEFAULT 'all',
    zone_id INT NULL,
    cell_id INT NULL,
    expires_at DATE NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL,
    FOREIGN KEY (cell_id) REFERENCES cells(id) ON DELETE SET NULL,
    INDEX idx_announcements_audience (audience),
    INDEX idx_announcements_zone (zone_id),
    INDEX idx_announcements_cell (cell_id),
    INDEX idx_announcements_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ENGAGEMENT & SCORING
-- ============================================

-- Meeting polls table
CREATE TABLE IF NOT EXISTS `meeting_polls` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    audience_type TEXT NOT NULL DEFAULT 'cell',
    audience_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    meeting_date DATE NOT NULL,
    meeting_time TIME,
    meeting_location VARCHAR(255),
    status TEXT NOT NULL DEFAULT 'open',
    created_by INT,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Meeting poll responses
CREATE TABLE IF NOT EXISTS `meeting_poll_responses` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    poll_id INT NOT NULL,
    user_id INT NOT NULL,
    response_status TEXT NOT NULL DEFAULT 'no_response',
    excuse_text TEXT,
    responded_at DATETIME,
    attendance_status TEXT NOT NULL DEFAULT 'pending',
    confirmed_by INT,
    confirmed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_meeting_poll_response (poll_id, user_id),
    FOREIGN KEY (poll_id) REFERENCES meeting_polls(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Engagement scores table (monthly rollup)
CREATE TABLE IF NOT EXISTS `engagement_scores` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    month_year DATE NOT NULL,
    sunday_attendance_count INT DEFAULT 0,
    cell_attendance_count INT DEFAULT 0,
    total_score INT DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_monthly_score (user_id, month_year),
    KEY idx_engagement_scores_user_month (user_id, month_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- EVENTS & SERMONS
-- ============================================

-- Events table
CREATE TABLE IF NOT EXISTS `events` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME,
    location VARCHAR(255) DEFAULT 'A3313 Rd 3935, Mtubatuba, South Africa',
    type VARCHAR(100),
    category VARCHAR(100),
    speaker VARCHAR(255),
    max_attendees INT,
    registration_required BOOLEAN DEFAULT 0,
    image_url VARCHAR(500),
    is_published BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_events_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Event registrations
CREATE TABLE IF NOT EXISTS `event_registrations` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT NOT NULL,
    member_id INT,
    guest_name VARCHAR(200),
    guest_email VARCHAR(255),
    guest_phone VARCHAR(20),
    notes TEXT,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sermons table
CREATE TABLE IF NOT EXISTS `sermons` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    speaker VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    series VARCHAR(255),
    scripture VARCHAR(255),
    outline LONGTEXT,
    notes LONGTEXT,
    planned_date DATE,
    status VARCHAR(20) DEFAULT 'draft',
    video_url VARCHAR(500),
    audio_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    duration INT,
    published BOOLEAN DEFAULT 0,
    views INT DEFAULT 0,
    published_at DATETIME,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    KEY idx_sermons_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CONTENT MANAGEMENT
-- ============================================

-- Blog posts table
CREATE TABLE IF NOT EXISTS `blog_posts` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content LONGTEXT NOT NULL,
    featured_image VARCHAR(500),
    author_id INT,
    category VARCHAR(100),
    tags TEXT,
    status ENUM('draft','published','archived') DEFAULT 'draft',
    published_at DATETIME,
    meta_title VARCHAR(255),
    meta_description TEXT,
    views INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
    KEY idx_blog_posts_status (status),
    KEY idx_blog_posts_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blog comments table
CREATE TABLE IF NOT EXISTS `blog_comments` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    user_id INT,
    author_name VARCHAR(200),
    author_email VARCHAR(255),
    content TEXT NOT NULL,
    parent_id INT,
    is_approved BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_id) REFERENCES blog_comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PRAYER REQUESTS
-- ============================================

-- Prayer requests table
CREATE TABLE IF NOT EXISTS `prayers` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    user_id INT,
    is_anonymous BOOLEAN DEFAULT 0,
    is_public BOOLEAN DEFAULT 1,
    status ENUM('pending','praying','answered','archived','approved','rejected') DEFAULT 'pending',
    priority ENUM('low','medium','high') DEFAULT 'medium',
    assigned_to INT,
    response TEXT,
    answered_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    KEY idx_prayers_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- GIVING & DONATIONS
-- ============================================

-- Giving funds table
CREATE TABLE IF NOT EXISTS `giving_funds` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Giving/donations table
CREATE TABLE IF NOT EXISTS `giving` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    donor_name VARCHAR(200) NOT NULL,
    donor_email VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    fund VARCHAR(100) DEFAULT 'General',
    payment_method VARCHAR(100),
    transaction_id VARCHAR(255),
    receipt_number VARCHAR(100),
    notes TEXT,
    is_recurring BOOLEAN DEFAULT 0,
    recurring_frequency VARCHAR(50),
    donor_type VARCHAR(50) DEFAULT 'member',
    entry_source VARCHAR(50) DEFAULT 'online',
    service_date DATE,
    recorded_by INT,
    visitor_id INT,
    user_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
    KEY idx_giving_user_id (user_id),
    KEY idx_giving_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Giving goals table
CREATE TABLE IF NOT EXISTS `giving_goals` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fund VARCHAR(100) NOT NULL,
    target_amount DECIMAL(10,2) NOT NULL,
    current_amount DECIMAL(10,2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SnapScan online giving tables
CREATE TABLE IF NOT EXISTS `snapscan_donations` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `snapscan_webhook_log` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    raw_headers LONGTEXT NOT NULL,
    raw_body LONGTEXT NOT NULL,
    processed TINYINT(1) NOT NULL DEFAULT 0,
    error_message TEXT NULL,
    KEY idx_snapscan_webhook_log_received_at (received_at),
    KEY idx_snapscan_webhook_log_processed (processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VISITORS & CONTACTS
-- ============================================

-- Visitors table
CREATE TABLE IF NOT EXISTS `visitors` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    visit_date DATE NOT NULL,
    how_heard VARCHAR(255),
    status ENUM('new','contacted','followed','member') DEFAULT 'new',
    notes TEXT,
    member_user_id INT NULL,
    temp_password_sent_at DATETIME NULL,
    welcomed_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `giving`
ADD FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS `visitor_attendance` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    visitor_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    checked_in_by INT NULL,
    check_in_time TIME DEFAULT CURRENT_TIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE,
    FOREIGN KEY (checked_in_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contact submissions table
CREATE TABLE IF NOT EXISTS `contact_submissions` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    replied BOOLEAN DEFAULT 0,
    replied_at DATETIME,
    replied_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `contact_replies` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    submission_id INT NOT NULL,
    user_id INT,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    recipient_email VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES contact_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Follow-up notes table
CREATE TABLE IF NOT EXISTS `follow_up_notes` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    member_id INT NOT NULL,
    created_by INT NOT NULL,
    note TEXT NOT NULL,
    contact_method VARCHAR(50) NULL,
    status VARCHAR(30) DEFAULT 'open',
    follow_up_date DATE NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    KEY idx_follow_up_notes_member (member_id),
    KEY idx_follow_up_notes_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- COMMUNICATIONS
-- ============================================

-- Notifications table
CREATE TABLE IF NOT EXISTS `notifications` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(100),
    is_read BOOLEAN DEFAULT 0,
    scheduled_for DATETIME,
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notification templates table
CREATE TABLE IF NOT EXISTS `notification_templates` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    template TEXT NOT NULL,
    variables TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email Queue Table for Failed Email Retries
CREATE TABLE IF NOT EXISTS `email_queue` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    body LONGTEXT NOT NULL,
    email_type VARCHAR(50) NOT NULL COMMENT 'Type: notification, event_reminder, welcome, etc.',
    status ENUM('pending', 'sent', 'failed', 'bounced') DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 5,
    last_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_status (status),
    KEY idx_email_type (email_type),
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Member email logs table
CREATE TABLE IF NOT EXISTS `member_email_logs` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NULL,
    sent_by INT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    recipient_type VARCHAR(50) DEFAULT 'member',
    subject VARCHAR(255) NOT NULL,
    html_body LONGTEXT,
    text_body LONGTEXT,
    email_type VARCHAR(100) DEFAULT 'follow_up',
    source VARCHAR(100) DEFAULT 'manual',
    status VARCHAR(20) DEFAULT 'sent',
    related_absence_flag_id INT NULL,
    related_follow_up_note_id INT NULL,
    queue_id INT NULL,
    error_message TEXT,
    sent_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_member_email_logs_member (member_id),
    INDEX idx_member_email_logs_sent_by (sent_by),
    INDEX idx_member_email_logs_status (status),
    INDEX idx_member_email_logs_created_at (created_at),
    INDEX idx_member_email_logs_sent_at (sent_at),
    INDEX idx_member_email_logs_source (source),
    INDEX idx_member_email_logs_recipient_type (recipient_type),
    FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat rooms table
CREATE TABLE IF NOT EXISTS `chat_rooms` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('channel','direct','group') DEFAULT 'channel',
    is_private BOOLEAN DEFAULT 0,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat messages table
CREATE TABLE IF NOT EXISTS `chat_messages` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id INT NOT NULL,
    user_id INT,
    content TEXT NOT NULL,
    type ENUM('text','image','file','system') DEFAULT 'text',
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    parent_id INT,
    reactions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    KEY idx_chat_messages_room_id (room_id),
    KEY idx_chat_messages_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat room participants
CREATE TABLE IF NOT EXISTS `chat_participants` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_read_at DATETIME,
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_participant (room_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MEDIA & FILES
-- ============================================

-- Home images table (for homepage image management)
CREATE TABLE IF NOT EXISTS `home_images` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    section VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    component VARCHAR(100),
    image_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    alt_text VARCHAR(255),
    link_url VARCHAR(500),
    display_order INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    uploaded_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    KEY idx_home_images_section (section),
    KEY idx_home_images_component (component),
    KEY idx_home_images_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Uploaded files table
CREATE TABLE IF NOT EXISTS `uploaded_files` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    uploaded_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ADMINISTRATION
-- ============================================

-- Settings table
CREATE TABLE IF NOT EXISTS `settings` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    key_name VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    value_type VARCHAR(50) DEFAULT 'string',
    is_public BOOLEAN DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_key_name (key_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Church info table
CREATE TABLE IF NOT EXISTS `church_info` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    tagline VARCHAR(500),
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'South Africa',
    postal_code VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    service_times TEXT,
    about_us TEXT,
    mission TEXT,
    vision TEXT,
    logo_url VARCHAR(500),
    social_facebook VARCHAR(255),
    social_twitter VARCHAR(255),
    social_instagram VARCHAR(255),
    social_youtube VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API keys table
CREATE TABLE IF NOT EXISTS `api_keys` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    key_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    last_used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity log table
CREATE TABLE IF NOT EXISTS `activity_logs` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CRON JOB LOGGING
-- ============================================

-- Cron Logs Table for Audit Trail
CREATE TABLE IF NOT EXISTS `cron_logs` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_name VARCHAR(100) NOT NULL,
    event_id INT,
    pastors_notified INT DEFAULT 0,
    run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('success', 'failed', 'partial') DEFAULT 'success',
    message TEXT,
    KEY idx_job_name (job_name),
    KEY idx_event_id (event_id),
    KEY idx_run_at (run_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- RATE LIMITING & CACHING
-- ============================================

-- Rate limiting table
CREATE TABLE IF NOT EXISTS `rate_limits` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    identifier VARCHAR(255) NOT NULL,
    request_time DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    KEY idx_rate_limits_identifier (identifier),
    KEY idx_rate_limits_request_time (request_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cache table
CREATE TABLE IF NOT EXISTS `cache` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    KEY idx_cache_key (cache_key),
    KEY idx_cache_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ZONE LEADER REQUESTS
-- ============================================

-- Zone Leader Requests Table
CREATE TABLE IF NOT EXISTS `zone_leader_requests` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    zone_id INT NOT NULL,
    motivation TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INT,
    reviewed_at TIMESTAMP NULL,
    rejection_reason TEXT,
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

-- ============================================
-- DEFAULT DATA SEEDING
-- ============================================

-- Insert default admin user
-- Password: admin123 (bcrypt hash)
-- IMPORTANT: Change this password after first login!
INSERT INTO `users` (uuid, email, password, first_name, last_name, role, is_active, email_verified) 
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@elchurch.site',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'System',
    'Administrator',
    'admin',
    1,
    1
) ON DUPLICATE KEY UPDATE email=email;

-- Insert default settings
INSERT INTO `settings` (key_name, value, is_public) VALUES 
('church_name', 'Eternal Love Church', 1),
('church_tagline', 'Experience God\'s Love and Restoration', 1),
('church_email', 'info@elchurch.site', 1),
('church_phone', '0727641137', 1),
('church_address', 'A3313 Rd, Mtubatuba, South Africa', 1),
('default_timezone', 'Africa/Johannesburg', 1)
ON DUPLICATE KEY UPDATE value=VALUES(value);

-- Insert default church info
INSERT INTO `church_info` (name, address, city, province, country, phone, email, website) 
VALUES (
    'Eternal Love Church',
    'A3313 Rd',
    'Mtubatuba',
    'KwaZulu-Natal',
    'South Africa',
    '0727641137',
    'info@elchurch.site',
    'https://elchurch.site'
)
ON DUPLICATE KEY UPDATE email=VALUES(email);

-- Insert default giving funds
INSERT INTO `giving_funds` (name, description) 
VALUES 
    ('General', 'General church fund'),
    ('Building Fund', 'Church building and maintenance'),
    ('Missions', 'Local and international missions'),
    ('Relief', 'Emergency relief and assistance')
ON DUPLICATE KEY UPDATE name=name;

-- ============================================
-- RE-ENABLE FOREIGN KEY CHECKS
-- ============================================
SET FOREIGN_KEY_CHECKS=1;

-- ============================================
-- DATABASE SETUP COMPLETE
-- ============================================
-- 
-- IMPORTANT POST-SETUP ACTIONS:
-- 1. Change admin password immediately
-- 2. Configure SMTP settings in .env
-- 3. Set APP_KEY in .env for JWT tokens
-- 4. Run `composer install` on server
-- 5. Set up cron jobs for absence tracking
-- 6. Configure file upload permissions
-- 7. Test email functionality before going live
--
-- For support, contact: info@elchurch.site
-- ============================================
