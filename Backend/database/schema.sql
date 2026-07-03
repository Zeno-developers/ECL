-- Eternal Love Church Database Schema
-- SQLite version used for offline/local backend bootstrapping.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'member',
    cell_id INTEGER,
    zone_id INTEGER,
    is_active INTEGER DEFAULT 1,
    email_verified INTEGER DEFAULT 0,
    verification_token TEXT,
    reset_token TEXT,
    reset_token_expires DATETIME,
    must_change_password INTEGER DEFAULT 0,
    temp_password_sent_at DATETIME,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploaded_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    zone_leader_id INTEGER,
    description TEXT,
    area TEXT,
    churches TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_leader_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cells (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cell_leader_id INTEGER,
    zone_id INTEGER,
    max_members INTEGER DEFAULT 5,
    meeting_day TEXT DEFAULT 'monday',
    meeting_time TEXT DEFAULT '19:00:00',
    meeting_location TEXT,
    is_active INTEGER DEFAULT 1,
    created_date DATE DEFAULT CURRENT_DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cell_leader_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    member_number TEXT UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    date_of_birth DATE,
    gender TEXT DEFAULT 'male',
    marital_status TEXT DEFAULT 'single',
    cell_id INTEGER,
    zone_id INTEGER,
    membership_date DATE,
    baptism_date DATE,
    emergency_contact TEXT,
    emergency_phone TEXT,
    notes TEXT,
    spiritual_gifts TEXT,
    ministry_interests TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (cell_id) REFERENCES cells(id) ON DELETE SET NULL,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TEXT,
    location TEXT DEFAULT 'A3313 Rd 3935, Mtubatuba, South Africa',
    type TEXT,
    category TEXT,
    speaker TEXT,
    max_attendees INTEGER,
    registration_required INTEGER DEFAULT 0,
    image_url TEXT,
    is_published INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    member_id INTEGER,
    guest_name TEXT,
    guest_email TEXT,
    guest_phone TEXT,
    notes TEXT,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sermons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    speaker TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    series TEXT,
    scripture TEXT,
    outline TEXT,
    notes TEXT,
    planned_date DATE,
    status TEXT DEFAULT 'draft',
    video_url TEXT,
    audio_url TEXT,
    thumbnail_url TEXT,
    duration INTEGER,
    published INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    published_at DATETIME,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image TEXT,
    gallery_images TEXT,
    author_id INTEGER,
    category TEXT,
    tags TEXT,
    status TEXT DEFAULT 'draft',
    published_at DATETIME,
    meta_title TEXT,
    meta_description TEXT,
    views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS blog_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER,
    author_name TEXT,
    author_email TEXT,
    content TEXT NOT NULL,
    parent_id INTEGER,
    is_approved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_id) REFERENCES blog_comments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prayers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    user_id INTEGER,
    is_anonymous INTEGER DEFAULT 0,
    is_public INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    assigned_to INTEGER,
    response TEXT,
    answered_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    visit_date DATE NOT NULL,
    how_heard TEXT,
    status TEXT DEFAULT 'new',
    notes TEXT,
    member_user_id INTEGER,
    temp_password_sent_at DATETIME,
    welcomed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS visitor_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id INTEGER NOT NULL,
    attendance_date DATE NOT NULL,
    checked_in_by INTEGER,
    check_in_time TEXT DEFAULT CURRENT_TIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (visitor_id, attendance_date),
    FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE,
    FOREIGN KEY (checked_in_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS giving_funds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    goal_amount NUMERIC DEFAULT 0,
    current_amount NUMERIC DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS giving (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    donor_name TEXT NOT NULL,
    donor_email TEXT,
    amount NUMERIC NOT NULL,
    fund TEXT DEFAULT 'General Giving',
    payment_method TEXT,
    transaction_id TEXT,
    receipt_number TEXT,
    notes TEXT,
    is_recurring INTEGER DEFAULT 0,
    recurring_frequency TEXT,
    donor_type TEXT DEFAULT 'member',
    entry_source TEXT DEFAULT 'online',
    service_date DATE,
    recorded_by INTEGER,
    visitor_id INTEGER,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS giving_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fund TEXT NOT NULL,
    target_amount NUMERIC NOT NULL,
    current_amount NUMERIC DEFAULT 0,
    start_date DATE,
    end_date DATE,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS snapscan_donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    donation_uuid TEXT NOT NULL UNIQUE,
    user_id INTEGER,
    amount NUMERIC NOT NULL,
    fund_id INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    snapscan_transaction_id TEXT UNIQUE,
    snapscan_payment_url TEXT,
    webhook_received_at DATETIME,
    webhook_payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    receipt_sent INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (fund_id) REFERENCES giving_funds(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS snapscan_webhook_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    raw_headers TEXT NOT NULL,
    raw_body TEXT NOT NULL,
    processed INTEGER DEFAULT 0,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_name TEXT UNIQUE NOT NULL,
    value TEXT,
    value_type TEXT DEFAULT 'string',
    is_public INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS church_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    tagline TEXT,
    address TEXT,
    city TEXT,
    province TEXT,
    country TEXT DEFAULT 'South Africa',
    postal_code TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    latitude REAL,
    longitude REAL,
    service_times TEXT,
    about_us TEXT,
    mission TEXT,
    vision TEXT,
    logo_url TEXT,
    social_facebook TEXT,
    social_twitter TEXT,
    social_instagram TEXT,
    social_youtube TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    replied INTEGER DEFAULT 0,
    replied_at DATETIME,
    replied_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    user_id INTEGER,
    subject TEXT,
    message TEXT NOT NULL,
    recipient_email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES contact_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    is_read INTEGER DEFAULT 0,
    scheduled_for DATETIME,
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    template TEXT NOT NULL,
    variables TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    email_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    last_error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_email_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    sent_by INTEGER,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    recipient_type TEXT DEFAULT 'member',
    subject TEXT NOT NULL,
    html_body TEXT,
    text_body TEXT,
    email_type TEXT DEFAULT 'follow_up',
    source TEXT DEFAULT 'manual',
    status TEXT DEFAULT 'sent',
    related_absence_flag_id INTEGER,
    related_follow_up_note_id INTEGER,
    queue_id INTEGER,
    error_message TEXT,
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chat_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'channel',
    is_private INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    user_id INTEGER,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    file_url TEXT,
    file_name TEXT,
    parent_id INTEGER,
    reactions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_id) REFERENCES chat_messages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_read_at DATETIME,
    UNIQUE (room_id, user_id),
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS home_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    section TEXT NOT NULL,
    category TEXT,
    component TEXT,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    alt_text TEXT,
    link_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    uploaded_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    key_name TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    is_active INTEGER DEFAULT 1,
    last_used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cron_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_name TEXT NOT NULL,
    event_id INTEGER,
    pastors_notified INTEGER DEFAULT 0,
    run_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'success',
    message TEXT
);

CREATE TABLE IF NOT EXISTS rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT NOT NULL,
    request_time DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS offline_sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sync_uuid TEXT NOT NULL UNIQUE,
    operation_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_at DATETIME
);

CREATE TABLE IF NOT EXISTS attendance_sunday (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    attendance_date DATE NOT NULL,
    checked_in_by INTEGER,
    is_visitor INTEGER DEFAULT 0,
    check_in_time TEXT DEFAULT CURRENT_TIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, attendance_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (checked_in_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attendance_cell (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    cell_id INTEGER NOT NULL,
    meeting_date DATE NOT NULL,
    recorded_by INTEGER NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, meeting_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (cell_id) REFERENCES cells(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meeting_polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    audience_type TEXT NOT NULL DEFAULT 'cell',
    audience_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    meeting_date DATE NOT NULL,
    meeting_time TEXT,
    meeting_location TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_by INTEGER,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS meeting_poll_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    response_status TEXT NOT NULL DEFAULT 'no_response',
    excuse_text TEXT,
    responded_at DATETIME,
    attendance_status TEXT NOT NULL DEFAULT 'pending',
    confirmed_by INTEGER,
    confirmed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (poll_id, user_id),
    FOREIGN KEY (poll_id) REFERENCES meeting_polls(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS absence_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    consecutive_sunday_misses INTEGER DEFAULT 1,
    flagged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notification_sent INTEGER DEFAULT 0,
    resolved_at DATETIME,
    resolved_by INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS absence_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    absence_date DATE NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_by INTEGER,
    processed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cell_change_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    current_cell_id INTEGER,
    requested_cell_id INTEGER NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_by INTEGER,
    processed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (current_cell_id) REFERENCES cells(id) ON DELETE SET NULL,
    FOREIGN KEY (requested_cell_id) REFERENCES cells(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    audience TEXT NOT NULL DEFAULT 'all',
    zone_id INTEGER,
    cell_id INTEGER,
    expires_at DATE,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL,
    FOREIGN KEY (cell_id) REFERENCES cells(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS engagement_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    month_year DATE NOT NULL,
    sunday_attendance_count INTEGER DEFAULT 0,
    cell_attendance_count INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, month_year),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS zone_leader_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    zone_id INTEGER NOT NULL,
    motivation TEXT,
    status TEXT DEFAULT 'pending',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER,
    reviewed_at DATETIME,
    rejection_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, zone_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS follow_up_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    note TEXT NOT NULL,
    contact_method TEXT,
    status TEXT DEFAULT 'open',
    follow_up_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_cell ON users(cell_id);
CREATE INDEX IF NOT EXISTS idx_users_zone ON users(zone_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_cell ON members(cell_id);
CREATE INDEX IF NOT EXISTS idx_members_zone ON members(zone_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_sermons_date ON sermons(date);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_prayers_user_id ON prayers(user_id);
CREATE INDEX IF NOT EXISTS idx_giving_user_id ON giving(user_id);
CREATE INDEX IF NOT EXISTS idx_giving_created_at ON giving(created_at);
CREATE INDEX IF NOT EXISTS idx_giving_service_date ON giving(service_date);
CREATE INDEX IF NOT EXISTS idx_giving_entry_source ON giving(entry_source);
CREATE INDEX IF NOT EXISTS idx_giving_fund ON giving(fund);
CREATE INDEX IF NOT EXISTS idx_giving_recorded_by ON giving(recorded_by);
CREATE INDEX IF NOT EXISTS idx_snapscan_donations_user_id ON snapscan_donations(user_id);
CREATE INDEX IF NOT EXISTS idx_snapscan_donations_status ON snapscan_donations(status);
CREATE INDEX IF NOT EXISTS idx_snapscan_donations_fund_id ON snapscan_donations(fund_id);
CREATE INDEX IF NOT EXISTS idx_snapscan_donations_created_at ON snapscan_donations(created_at);
CREATE INDEX IF NOT EXISTS idx_snapscan_donations_completed_at ON snapscan_donations(completed_at);
CREATE INDEX IF NOT EXISTS idx_snapscan_webhook_log_received_at ON snapscan_webhook_log(received_at);
CREATE INDEX IF NOT EXISTS idx_snapscan_webhook_log_processed ON snapscan_webhook_log(processed);
CREATE INDEX IF NOT EXISTS idx_home_images_section ON home_images(section);
CREATE INDEX IF NOT EXISTS idx_home_images_component ON home_images(component);
CREATE INDEX IF NOT EXISTS idx_home_images_display_order ON home_images(display_order);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_request_time ON rate_limits(request_time);
CREATE INDEX IF NOT EXISTS idx_cache_key ON cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_offline_sync_queue_synced_at ON offline_sync_queue(synced_at);
CREATE INDEX IF NOT EXISTS idx_zones_zone_leader ON zones(zone_leader_id);
CREATE INDEX IF NOT EXISTS idx_cells_cell_leader ON cells(cell_leader_id);
CREATE INDEX IF NOT EXISTS idx_cells_zone ON cells(zone_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sunday_user_date ON attendance_sunday(user_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sunday_date ON attendance_sunday(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_cell_user_date ON attendance_cell(user_id, meeting_date);
CREATE INDEX IF NOT EXISTS idx_attendance_cell_cell_date ON attendance_cell(cell_id, meeting_date);
CREATE INDEX IF NOT EXISTS idx_meeting_polls_lookup ON meeting_polls(audience_type, audience_id, meeting_date);
CREATE INDEX IF NOT EXISTS idx_meeting_polls_status ON meeting_polls(status);
CREATE INDEX IF NOT EXISTS idx_meeting_poll_responses_attendance ON meeting_poll_responses(attendance_status);
CREATE INDEX IF NOT EXISTS idx_absence_flags_user ON absence_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_absence_flags_resolved ON absence_flags(resolved_at);
CREATE INDEX IF NOT EXISTS idx_absence_requests_user_date ON absence_requests(user_id, absence_date);
CREATE INDEX IF NOT EXISTS idx_cell_change_requests_user ON cell_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at);
CREATE INDEX IF NOT EXISTS idx_announcements_audience ON announcements(audience);
CREATE INDEX IF NOT EXISTS idx_engagement_scores_user_month ON engagement_scores(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_follow_up_notes_member ON follow_up_notes(member_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_notes_status ON follow_up_notes(status);
CREATE INDEX IF NOT EXISTS idx_member_email_logs_member ON member_email_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_member_email_logs_sent_by ON member_email_logs(sent_by);
CREATE INDEX IF NOT EXISTS idx_member_email_logs_status ON member_email_logs(status);
CREATE INDEX IF NOT EXISTS idx_member_email_logs_created_at ON member_email_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_member_email_logs_sent_at ON member_email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_member_email_logs_source ON member_email_logs(source);
CREATE INDEX IF NOT EXISTS idx_member_email_logs_recipient_type ON member_email_logs(recipient_type);

INSERT OR IGNORE INTO users (
    id,
    uuid,
    email,
    password,
    first_name,
    last_name,
    role,
    is_active,
    email_verified
) VALUES (
    1,
    '00000000-0000-0000-0000-000000000001',
    'admin@elchurch.site',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'System',
    'Administrator',
    'admin',
    1,
    1
);

INSERT OR IGNORE INTO giving_funds (name, description, goal_amount, current_amount, is_active)
VALUES ('General Giving', 'Default giving fund for offerings and online donations', 0, 0, 1);

INSERT OR IGNORE INTO settings (key_name, value, is_public) VALUES
('church_name', 'Eternal Love Church', 1),
('church_tagline', 'Experience God''s Love and Restoration', 1),
('church_email', 'info@elchurch.site', 1),
('church_phone', '0727641137', 1),
('church_address', 'A3313 Rd, Mtubatuba, South Africa', 1),
('default_timezone', 'Africa/Johannesburg', 1);

INSERT OR IGNORE INTO church_info (
    id,
    name,
    address,
    city,
    province,
    country,
    phone,
    email,
    website
) VALUES (
    1,
    'Eternal Love Church',
    'A3313 Rd',
    'Mtubatuba',
    'KwaZulu-Natal',
    'South Africa',
    '0727641137',
    'info@elchurch.site',
    'https://elchurch.site'
);
