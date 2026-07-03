-- Migration 004: Family Tree, Spiritual Lineage, Disciples Groups
-- Run once against eternalovechurch_db

-- ── Physical Family Tree ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS marriages (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    member1_id   INT UNSIGNED NOT NULL,
    member2_id   INT UNSIGNED NOT NULL,
    status       ENUM('active','widowed','divorced') NOT NULL DEFAULT 'active',
    married_date DATE NULL,
    created_by   INT UNSIGNED NOT NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_marriage (member1_id, member2_id),
    KEY idx_m1 (member1_id),
    KEY idx_m2 (member2_id)
);

CREATE TABLE IF NOT EXISTS parent_child (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id   INT UNSIGNED NOT NULL,
    child_id    INT UNSIGNED NOT NULL,
    created_by  INT UNSIGNED NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_parent_child (parent_id, child_id),
    KEY idx_parent (parent_id),
    KEY idx_child  (child_id)
);

-- ── Spiritual Lineage ────────────────────────────────────────────────────────

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS spiritual_parent_id INT UNSIGNED NULL DEFAULT NULL,
    ADD KEY IF NOT EXISTS idx_spiritual_parent (spiritual_parent_id);

-- ── Disciples Groups ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS disciples_groups (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    description TEXT NULL,
    leader_id   INT UNSIGNED NOT NULL,
    is_active   TINYINT(1)   NOT NULL DEFAULT 1,
    created_by  INT UNSIGNED NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_leader (leader_id)
);

CREATE TABLE IF NOT EXISTS disciples_group_members (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_id   INT UNSIGNED NOT NULL,
    user_id    INT UNSIGNED NOT NULL,
    joined_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_member (user_id),          -- one group per member
    KEY idx_group (group_id)
);

CREATE TABLE IF NOT EXISTS disciples_group_meetings (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_id     INT UNSIGNED  NOT NULL,
    title        VARCHAR(200)  NOT NULL,
    meeting_date DATE          NOT NULL,
    meeting_time TIME          NULL,
    location     VARCHAR(200)  NULL,
    notes        TEXT          NULL,
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_group_date (group_id, meeting_date)
);

CREATE TABLE IF NOT EXISTS disciples_group_attendance (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT UNSIGNED NOT NULL,
    user_id    INT UNSIGNED NOT NULL,
    attended   TINYINT(1)   NOT NULL DEFAULT 0,
    UNIQUE KEY uq_attendance (meeting_id, user_id),
    KEY idx_meeting (meeting_id)
);

CREATE TABLE IF NOT EXISTS disciples_group_lessons (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_id    INT UNSIGNED NOT NULL,
    title       VARCHAR(200) NOT NULL,
    content     LONGTEXT     NOT NULL,
    published   TINYINT(1)   NOT NULL DEFAULT 1,
    created_by  INT UNSIGNED NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_group (group_id)
);

CREATE TABLE IF NOT EXISTS disciples_group_notices (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_id    INT UNSIGNED NOT NULL,
    title       VARCHAR(200) NOT NULL,
    message     TEXT         NOT NULL,
    created_by  INT UNSIGNED NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_group (group_id)
);
