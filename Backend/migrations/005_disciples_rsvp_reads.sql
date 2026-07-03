-- Migration 005: Disciples RSVP & Lesson Read Tracking

CREATE TABLE IF NOT EXISTS disciples_meeting_rsvp (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT UNSIGNED NOT NULL,
    user_id    INT UNSIGNED NOT NULL,
    status     ENUM('yes','no','maybe') NOT NULL DEFAULT 'yes',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_rsvp (meeting_id, user_id),
    KEY idx_meeting (meeting_id),
    KEY idx_user (user_id)
);

CREATE TABLE IF NOT EXISTS disciples_lesson_reads (
    id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lesson_id INT UNSIGNED NOT NULL,
    user_id   INT UNSIGNED NOT NULL,
    read_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_read (lesson_id, user_id),
    KEY idx_lesson (lesson_id),
    KEY idx_user (user_id)
);
