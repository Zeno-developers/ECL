<?php

namespace App\Controller;

use Exception;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class SystemController extends BaseController
{
    private function isSqlite(): bool
    {
        return \App\Database::getInstance()->getDriver() === 'sqlite';
    }

    private function tableExists(\PDO $pdo, string $table): bool
    {
        if ($this->isSqlite()) {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?");
            $stmt->execute([$table]);
            return (bool) $stmt->fetchColumn();
        }
        // SHOW TABLES LIKE ? fails with ATTR_EMULATE_PREPARES=false; use information_schema instead
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?");
        $stmt->execute([$table]);
        return (bool) $stmt->fetchColumn();
    }

    private function columnExists(\PDO $pdo, string $table, string $column): bool
    {
        if (!$this->tableExists($pdo, $table)) {
            return false;
        }
        if ($this->isSqlite()) {
            $stmt = $pdo->query("PRAGMA table_info(\"{$table}\")");
            foreach ($stmt->fetchAll() as $col) {
                if ($col['name'] === $column) return true;
            }
            return false;
        }
        // SHOW COLUMNS LIKE ? fails with ATTR_EMULATE_PREPARES=false; use information_schema instead
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?");
        $stmt->execute([$table, $column]);
        return (bool) $stmt->fetchColumn();
    }

    private function indexExists(\PDO $pdo, string $table, string $index): bool
    {
        if (!$this->tableExists($pdo, $table)) {
            return false;
        }
        if ($this->isSqlite()) {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name=?");
            $stmt->execute([$index]);
            return (bool) $stmt->fetchColumn();
        }
        $stmt = $pdo->query("SHOW INDEX FROM `{$table}` WHERE Key_name = " . $pdo->quote($index));
        return (bool) $stmt->fetch();
    }

    private function sanitizeSqliteDefinition(string $definition): string
    {
        $def = preg_replace('/\bON\s+UPDATE\s+\S+/i', '', $definition);
        $def = preg_replace('/\bLONGTEXT\b|\bMEDIUMTEXT\b/i', 'TEXT', $def);
        $def = preg_replace('/\bTINYINT\s*\(\d+\)\b/i', 'INTEGER', $def);
        $def = preg_replace('/\bVARCHAR\s*\(\d+\)\b/i', 'TEXT', $def);
        $def = preg_replace('/\bBOOLEAN\b/i', 'INTEGER', $def);
        $def = preg_replace('/\bENUM\s*\([^)]+\)/i', 'TEXT', $def);
        return trim($def);
    }

    private function ensureColumn(\PDO $pdo, array &$results, string $table, string $column, string $definition): void
    {
        if (!$this->tableExists($pdo, $table)) {
            $results[] = ['table' => $table, 'status' => 'warning', 'message' => "Skipped column {$column}; table does not exist yet"];
            return;
        }
        if ($this->columnExists($pdo, $table, $column)) {
            $results[] = ['table' => $table, 'status' => 'success', 'message' => "Column {$column} already exists"];
            return;
        }
        $def = $this->isSqlite() ? $this->sanitizeSqliteDefinition($definition) : $definition;
        $pdo->exec("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$def}");
        $results[] = ['table' => $table, 'status' => 'success', 'message' => "Column {$column} added"];
    }

    private function ensureIndex(\PDO $pdo, array &$results, string $table, string $index, string $definition): void
    {
        if (!$this->tableExists($pdo, $table)) {
            $results[] = ['table' => $table, 'status' => 'warning', 'message' => "Skipped index {$index}; table does not exist yet"];
            return;
        }
        if ($this->indexExists($pdo, $table, $index)) {
            $results[] = ['table' => $table, 'status' => 'success', 'message' => "Index {$index} already exists"];
            return;
        }
        if ($this->isSqlite()) {
            if (preg_match('/(?:UNIQUE\s+)?INDEX\s+(\w+)\s*\(([^)]+)\)/i', $definition, $m)) {
                $unique = stripos($definition, 'UNIQUE') !== false ? 'UNIQUE ' : '';
                $pdo->exec("CREATE {$unique}INDEX IF NOT EXISTS {$m[1]} ON `{$table}` ({$m[2]})");
            }
        } else {
            $pdo->exec("ALTER TABLE `{$table}` ADD {$definition}");
        }
        $results[] = ['table' => $table, 'status' => 'success', 'message' => "Index {$index} added"];
    }

    public function getPlans(Request $request, Response $response): Response
    {
        try {
            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'plans' => [
                        ['id' => 'free', 'name' => 'Free', 'monthlyRequests' => 1000],
                        ['id' => 'basic', 'name' => 'Basic', 'monthlyRequests' => 10000],
                        ['id' => 'professional', 'name' => 'Professional', 'monthlyRequests' => 50000],
                        ['id' => 'enterprise', 'name' => 'Enterprise', 'monthlyRequests' => 200000]
                    ]
                ]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch plans: ' . $e->getMessage()
            ], 500);
        }
    }

    public function logFrontendError(Request $request, Response $response): Response
    {
        try {
            $payload = json_decode($request->getBody()->getContents(), true) ?? [];
            $summary = [
                'errorId'   => $payload['errorId'] ?? null,
                'error'     => $payload['error'] ?? 'Unknown frontend error',
                'url'       => $payload['url'] ?? null,
                'timestamp' => $payload['timestamp'] ?? date('c')
            ];

            error_log('[frontend-error] ' . json_encode($summary, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

            return $this->jsonResponse(['status' => 'success', 'message' => 'Error logged'], 201);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to log frontend error: ' . $e->getMessage()
            ], 500);
        }
    }

    public function runMigrations(Request $request, Response $response): Response
    {
        try {
            $role = $request->getAttribute('role');
            if (!in_array($role, ['admin', 'superadmin'], true)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Unauthorized. Only admin or superadmin can run migrations.'
                ], 403);
            }

            $db  = \App\Database::getInstance();
            $pdo = $db->getConnection();
            $sqlite = $this->isSqlite();

            $results = [];

            // ── giving_funds ─────────────────────────────────────────────────
            if (!$this->tableExists($pdo, 'giving_funds')) {
                if ($sqlite) {
                    $pdo->exec("CREATE TABLE IF NOT EXISTS giving_funds (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE,
                        description TEXT,
                        goal_amount REAL DEFAULT 0.00,
                        current_amount REAL DEFAULT 0.00,
                        is_active INTEGER NOT NULL DEFAULT 1,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )");
                } else {
                    $pdo->exec("CREATE TABLE giving_funds (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        name VARCHAR(150) NOT NULL,
                        description TEXT NULL,
                        goal_amount DECIMAL(10,2) NULL DEFAULT 0.00,
                        current_amount DECIMAL(10,2) NULL DEFAULT 0.00,
                        is_active TINYINT(1) NOT NULL DEFAULT 1,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY uq_giving_funds_name (name)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                }
                $results[] = ['table' => 'giving_funds', 'status' => 'success', 'message' => 'Table created'];
            } else {
                $results[] = ['table' => 'giving_funds', 'status' => 'success', 'message' => 'Table already exists'];
            }

            $pdo->exec(
                "INSERT INTO giving_funds (name, description, goal_amount, current_amount, is_active)
                 SELECT 'General Giving', 'Default church giving fund', 0.00, 0.00, 1
                 WHERE NOT EXISTS (SELECT 1 FROM giving_funds WHERE name = 'General Giving')"
            );
            $results[] = ['table' => 'giving_funds', 'status' => 'success', 'message' => 'Default General Giving fund ensured'];

            // ── snapscan_donations ────────────────────────────────────────────
            if (!$this->tableExists($pdo, 'snapscan_donations')) {
                if ($sqlite) {
                    $pdo->exec("CREATE TABLE IF NOT EXISTS snapscan_donations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        donation_uuid TEXT NOT NULL UNIQUE,
                        user_id INTEGER,
                        amount REAL NOT NULL,
                        fund_id INTEGER,
                        status TEXT NOT NULL DEFAULT 'pending',
                        snapscan_transaction_id TEXT UNIQUE,
                        snapscan_payment_url TEXT,
                        webhook_received_at DATETIME,
                        webhook_payload TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        completed_at DATETIME,
                        receipt_sent INTEGER NOT NULL DEFAULT 0
                    )");
                } else {
                    $pdo->exec("CREATE TABLE snapscan_donations (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        donation_uuid VARCHAR(36) NOT NULL,
                        user_id INT NULL,
                        amount DECIMAL(10,2) NOT NULL,
                        fund_id INT NULL,
                        status ENUM('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
                        snapscan_transaction_id VARCHAR(255) NULL,
                        snapscan_payment_url TEXT NULL,
                        webhook_received_at DATETIME NULL,
                        webhook_payload LONGTEXT NULL,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        completed_at DATETIME NULL,
                        receipt_sent TINYINT(1) NOT NULL DEFAULT 0,
                        UNIQUE KEY uq_snapscan_donation_uuid (donation_uuid),
                        UNIQUE KEY uq_snapscan_transaction_id (snapscan_transaction_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                }
                $results[] = ['table' => 'snapscan_donations', 'status' => 'success', 'message' => 'Table created'];
            } else {
                $results[] = ['table' => 'snapscan_donations', 'status' => 'success', 'message' => 'Table already exists'];
            }

            // ── snapscan_webhook_log ──────────────────────────────────────────
            if (!$this->tableExists($pdo, 'snapscan_webhook_log')) {
                if ($sqlite) {
                    $pdo->exec("CREATE TABLE IF NOT EXISTS snapscan_webhook_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        raw_headers TEXT NOT NULL,
                        raw_body TEXT NOT NULL,
                        processed INTEGER NOT NULL DEFAULT 0,
                        error_message TEXT
                    )");
                } else {
                    $pdo->exec("CREATE TABLE snapscan_webhook_log (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        raw_headers LONGTEXT NOT NULL,
                        raw_body LONGTEXT NOT NULL,
                        processed TINYINT(1) NOT NULL DEFAULT 0,
                        error_message TEXT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                }
                $results[] = ['table' => 'snapscan_webhook_log', 'status' => 'success', 'message' => 'Table created'];
            } else {
                $results[] = ['table' => 'snapscan_webhook_log', 'status' => 'success', 'message' => 'Table already exists'];
            }

            // ── zone_leader_requests ──────────────────────────────────────────
            if (!$this->tableExists($pdo, 'zone_leader_requests')) {
                if ($sqlite) {
                    $pdo->exec("CREATE TABLE IF NOT EXISTS zone_leader_requests (
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
                    )");
                } else {
                    $pdo->exec("CREATE TABLE zone_leader_requests (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        user_id INT NOT NULL,
                        zone_id INT NOT NULL,
                        motivation TEXT,
                        status ENUM('pending','approved','rejected') DEFAULT 'pending',
                        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        reviewed_by INT,
                        reviewed_at TIMESTAMP NULL,
                        rejection_reason TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
                        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
                        UNIQUE INDEX idx_user_zone (user_id, zone_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                }
                $results[] = ['table' => 'zone_leader_requests', 'status' => 'success', 'message' => 'Table created'];
            } else {
                $results[] = ['table' => 'zone_leader_requests', 'status' => 'success', 'message' => 'Table already exists'];
            }

            // ── visitor_attendance ────────────────────────────────────────────
            if (!$this->tableExists($pdo, 'visitor_attendance')) {
                if ($sqlite) {
                    $pdo->exec("CREATE TABLE IF NOT EXISTS visitor_attendance (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        visitor_id INTEGER NOT NULL,
                        attendance_date DATE NOT NULL,
                        checked_in_by INTEGER,
                        check_in_time TEXT,
                        notes TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE (visitor_id, attendance_date),
                        FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE,
                        FOREIGN KEY (checked_in_by) REFERENCES users(id) ON DELETE SET NULL
                    )");
                } else {
                    $pdo->exec("CREATE TABLE visitor_attendance (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        visitor_id INT NOT NULL,
                        attendance_date DATE NOT NULL,
                        checked_in_by INT NULL,
                        check_in_time TIME DEFAULT CURRENT_TIME,
                        notes TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE,
                        FOREIGN KEY (checked_in_by) REFERENCES users(id) ON DELETE SET NULL,
                        UNIQUE KEY unique_visitor_attendance (visitor_id, attendance_date)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                }
                $results[] = ['table' => 'visitor_attendance', 'status' => 'success', 'message' => 'Table created'];
            } else {
                $results[] = ['table' => 'visitor_attendance', 'status' => 'success', 'message' => 'Table already exists'];
            }

            // ── follow_up_notes ───────────────────────────────────────────────
            if (!$this->tableExists($pdo, 'follow_up_notes')) {
                if ($sqlite) {
                    $pdo->exec("CREATE TABLE IF NOT EXISTS follow_up_notes (
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
                    )");
                } else {
                    $pdo->exec("CREATE TABLE follow_up_notes (
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
                        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                }
                $results[] = ['table' => 'follow_up_notes', 'status' => 'success', 'message' => 'Table created'];
            } else {
                $results[] = ['table' => 'follow_up_notes', 'status' => 'success', 'message' => 'Table already exists'];
            }

            // ── meeting_polls ─────────────────────────────────────────────────
            if (!$this->tableExists($pdo, 'meeting_polls')) {
                if ($sqlite) {
                    $pdo->exec("CREATE TABLE IF NOT EXISTS meeting_polls (
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
                    )");
                } else {
                    $pdo->exec("CREATE TABLE meeting_polls (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        audience_type ENUM('cell','zone') NOT NULL DEFAULT 'cell',
                        audience_id INT NOT NULL,
                        title VARCHAR(255) NOT NULL,
                        description TEXT NULL,
                        meeting_date DATE NOT NULL,
                        meeting_time TIME NULL,
                        meeting_location VARCHAR(255) NULL,
                        status ENUM('scheduled','open','completed','cancelled') NOT NULL DEFAULT 'open',
                        created_by INT NULL,
                        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        completed_at DATETIME NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                }
                $results[] = ['table' => 'meeting_polls', 'status' => 'success', 'message' => 'Table created'];
            } else {
                $results[] = ['table' => 'meeting_polls', 'status' => 'success', 'message' => 'Table already exists'];
            }

            // ── meeting_poll_responses ────────────────────────────────────────
            if (!$this->tableExists($pdo, 'meeting_poll_responses')) {
                if ($sqlite) {
                    $pdo->exec("CREATE TABLE IF NOT EXISTS meeting_poll_responses (
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
                    )");
                } else {
                    $pdo->exec("CREATE TABLE meeting_poll_responses (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        poll_id INT NOT NULL,
                        user_id INT NOT NULL,
                        response_status ENUM('going','not_going','no_response') NOT NULL DEFAULT 'no_response',
                        excuse_text TEXT NULL,
                        responded_at DATETIME NULL,
                        attendance_status ENUM('pending','confirmed','absent','excused') NOT NULL DEFAULT 'pending',
                        confirmed_by INT NULL,
                        confirmed_at DATETIME NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY unique_meeting_poll_response (poll_id, user_id),
                        FOREIGN KEY (poll_id) REFERENCES meeting_polls(id) ON DELETE CASCADE,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                }
                $results[] = ['table' => 'meeting_poll_responses', 'status' => 'success', 'message' => 'Table created'];
            } else {
                $results[] = ['table' => 'meeting_poll_responses', 'status' => 'success', 'message' => 'Table already exists'];
            }

            // ── spiritual_parent_requests ─────────────────────────────────────
            if (!$this->tableExists($pdo, 'spiritual_parent_requests')) {
                if ($sqlite) {
                    $pdo->exec("CREATE TABLE IF NOT EXISTS spiritual_parent_requests (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        requester_id INTEGER NOT NULL,
                        claimed_parent_id INTEGER NOT NULL,
                        status TEXT NOT NULL DEFAULT 'pending',
                        note TEXT NULL,
                        reviewed_by INTEGER NULL,
                        reviewed_at DATETIME NULL,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )");
                } else {
                    $pdo->exec("CREATE TABLE spiritual_parent_requests (
                        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        requester_id INT UNSIGNED NOT NULL,
                        claimed_parent_id INT UNSIGNED NOT NULL,
                        status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
                        note TEXT NULL,
                        reviewed_by INT UNSIGNED NULL,
                        reviewed_at DATETIME NULL,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        KEY idx_requester (requester_id),
                        KEY idx_parent    (claimed_parent_id),
                        KEY idx_status    (status)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                }
                $results[] = ['table' => 'spiritual_parent_requests', 'status' => 'success', 'message' => 'Table created'];
            } else {
                $results[] = ['table' => 'spiritual_parent_requests', 'status' => 'success', 'message' => 'Table already exists'];
            }

            // ── disciples_meeting_rsvp ────────────────────────────────────────
            if (!$this->tableExists($pdo, 'disciples_meeting_rsvp')) {
                if ($sqlite) {
                    $pdo->exec("CREATE TABLE IF NOT EXISTS disciples_meeting_rsvp (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        meeting_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        status TEXT NOT NULL DEFAULT 'yes',
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE (meeting_id, user_id)
                    )");
                } else {
                    $pdo->exec("CREATE TABLE disciples_meeting_rsvp (
                        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        meeting_id INT UNSIGNED NOT NULL,
                        user_id INT UNSIGNED NOT NULL,
                        status ENUM('yes','no','maybe') NOT NULL DEFAULT 'yes',
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY uq_rsvp (meeting_id, user_id),
                        KEY idx_meeting (meeting_id),
                        KEY idx_user (user_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                }
                $results[] = ['table' => 'disciples_meeting_rsvp', 'status' => 'success', 'message' => 'Table created'];
            } else {
                $results[] = ['table' => 'disciples_meeting_rsvp', 'status' => 'success', 'message' => 'Table already exists'];
            }

            // ── disciples_lesson_reads ────────────────────────────────────────
            if (!$this->tableExists($pdo, 'disciples_lesson_reads')) {
                if ($sqlite) {
                    $pdo->exec("CREATE TABLE IF NOT EXISTS disciples_lesson_reads (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        lesson_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE (lesson_id, user_id)
                    )");
                } else {
                    $pdo->exec("CREATE TABLE disciples_lesson_reads (
                        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        lesson_id INT UNSIGNED NOT NULL,
                        user_id INT UNSIGNED NOT NULL,
                        read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY uq_read (lesson_id, user_id),
                        KEY idx_lesson (lesson_id),
                        KEY idx_user (user_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                }
                $results[] = ['table' => 'disciples_lesson_reads', 'status' => 'success', 'message' => 'Table created'];
            } else {
                $results[] = ['table' => 'disciples_lesson_reads', 'status' => 'success', 'message' => 'Table already exists'];
            }

            // ── Column additions ──────────────────────────────────────────────
            $this->ensureColumn($pdo, $results, 'users', 'cell_id', 'INT NULL');
            $this->ensureColumn($pdo, $results, 'users', 'zone_id', 'INT NULL');
            $this->ensureColumn($pdo, $results, 'users', 'must_change_password', 'INTEGER DEFAULT 0');
            $this->ensureColumn($pdo, $results, 'users', 'temp_password_sent_at', 'DATETIME NULL');
            $this->ensureColumn($pdo, $results, 'zones', 'area', 'TEXT NULL');
            $this->ensureColumn($pdo, $results, 'zones', 'churches', 'TEXT NULL');
            $this->ensureColumn($pdo, $results, 'members', 'cell_id', 'INT NULL');
            $this->ensureColumn($pdo, $results, 'members', 'zone_id', 'INT NULL');

            $this->ensureColumn($pdo, $results, 'announcements', 'zone_id', 'INT NULL');
            $this->ensureColumn($pdo, $results, 'announcements', 'cell_id', 'INT NULL');
            $this->ensureColumn($pdo, $results, 'announcements', 'expires_at', 'DATE NULL');
            $this->ensureColumn($pdo, $results, 'announcements', 'is_active', 'INTEGER DEFAULT 1');

            // MODIFY COLUMN is MySQL-only; skip on SQLite
            if (!$sqlite && $this->tableExists($pdo, 'announcements')) {
                $pdo->exec("ALTER TABLE `announcements` MODIFY COLUMN `audience` VARCHAR(50) NOT NULL DEFAULT 'all'");
                $results[] = ['table' => 'announcements', 'status' => 'success', 'message' => 'Column audience normalized'];
            }

            $this->ensureIndex($pdo, $results, 'announcements', 'idx_announcements_audience', 'INDEX idx_announcements_audience (`audience`)');
            $this->ensureIndex($pdo, $results, 'announcements', 'idx_announcements_zone',     'INDEX idx_announcements_zone (`zone_id`)');
            $this->ensureIndex($pdo, $results, 'announcements', 'idx_announcements_cell',     'INDEX idx_announcements_cell (`cell_id`)');
            $this->ensureIndex($pdo, $results, 'announcements', 'idx_announcements_active',   'INDEX idx_announcements_active (`is_active`)');

            $this->ensureColumn($pdo, $results, 'cell_change_requests', 'current_cell_id', 'INT NULL');
            $this->ensureColumn($pdo, $results, 'cell_change_requests', 'processed_by',    'INT NULL');
            $this->ensureColumn($pdo, $results, 'cell_change_requests', 'processed_at',    'DATETIME NULL');

            $this->ensureColumn($pdo, $results, 'visitor_attendance', 'checked_in_by', 'INT NULL');
            $this->ensureColumn($pdo, $results, 'visitor_attendance', 'check_in_time',  'TEXT NULL');
            $this->ensureColumn($pdo, $results, 'visitor_attendance', 'notes',          'TEXT NULL');
            $this->ensureColumn($pdo, $results, 'visitors', 'member_user_id',       'INT NULL');
            $this->ensureColumn($pdo, $results, 'visitors', 'temp_password_sent_at', 'DATETIME NULL');
            $this->ensureColumn($pdo, $results, 'visitors', 'welcomed_at',           'DATETIME NULL');

            $this->ensureColumn($pdo, $results, 'blog_posts', 'gallery_images', 'TEXT NULL');

            $this->ensureColumn($pdo, $results, 'members', 'spiritual_gifts',     'TEXT NULL');
            $this->ensureColumn($pdo, $results, 'members', 'ministry_interests',  'TEXT NULL');

            $this->ensureColumn($pdo, $results, 'sermons', 'scripture',          'TEXT NULL');
            $this->ensureColumn($pdo, $results, 'sermons', 'outline',            'TEXT NULL');
            $this->ensureColumn($pdo, $results, 'sermons', 'notes',              'TEXT NULL');
            $this->ensureColumn($pdo, $results, 'sermons', 'planned_date',       'DATE NULL');
            $this->ensureColumn($pdo, $results, 'sermons', 'status',             "TEXT NOT NULL DEFAULT 'draft'");
            $this->ensureColumn($pdo, $results, 'sermons', 'published_at',       'DATETIME NULL');
            $this->ensureColumn($pdo, $results, 'sermons', 'created_by',         'INT NULL');
            $this->ensureColumn($pdo, $results, 'sermons', 'video_file_id',      'INT NULL');
            $this->ensureColumn($pdo, $results, 'sermons', 'audio_file_id',      'INT NULL');
            $this->ensureColumn($pdo, $results, 'sermons', 'thumbnail_file_id',  'INT NULL');

            $this->ensureColumn($pdo, $results, 'giving', 'donor_type',   "TEXT NOT NULL DEFAULT 'member'");
            $this->ensureColumn($pdo, $results, 'giving', 'entry_source', "TEXT NOT NULL DEFAULT 'online'");
            $this->ensureColumn($pdo, $results, 'giving', 'service_date', 'DATE NULL');
            $this->ensureColumn($pdo, $results, 'giving', 'recorded_by',  'INT NULL');
            $this->ensureColumn($pdo, $results, 'giving', 'visitor_id',   'INT NULL');

            $this->ensureIndex($pdo, $results, 'sermons', 'idx_sermons_status',              'INDEX idx_sermons_status (`status`)');
            $this->ensureIndex($pdo, $results, 'giving',  'idx_giving_service_date',         'INDEX idx_giving_service_date (`service_date`)');
            $this->ensureIndex($pdo, $results, 'visitors','idx_visitors_member_user_id',     'INDEX idx_visitors_member_user_id (`member_user_id`)');

            $this->ensureColumn($pdo, $results, 'follow_up_notes', 'contact_method',  'TEXT NULL');
            $this->ensureColumn($pdo, $results, 'follow_up_notes', 'status',          "TEXT NOT NULL DEFAULT 'open'");
            $this->ensureColumn($pdo, $results, 'follow_up_notes', 'follow_up_date',  'DATE NULL');
            $this->ensureColumn($pdo, $results, 'follow_up_notes', 'updated_at',      'DATETIME DEFAULT CURRENT_TIMESTAMP');

            $this->ensureColumn($pdo, $results, 'absence_flags', 'notification_sent',        'INTEGER DEFAULT 0');
            $this->ensureColumn($pdo, $results, 'absence_flags', 'absence_type',             "TEXT DEFAULT 'sunday'");
            $this->ensureColumn($pdo, $results, 'absence_flags', 'consecutive_cell_misses',  'INTEGER DEFAULT 0');
            $this->ensureColumn($pdo, $results, 'absence_flags', 'followup_reminder_sent_at','DATETIME NULL');
            $this->ensureColumn($pdo, $results, 'absence_flags', 'resolved_by',             'INT NULL');

            // MODIFY COLUMN is MySQL-only; skip on SQLite
            if (!$sqlite && $this->tableExists($pdo, 'cells')) {
                $pdo->exec("ALTER TABLE `cells` MODIFY COLUMN `meeting_day` ENUM('sunday','monday','tuesday','wednesday','thursday','friday','saturday') DEFAULT 'monday'");
                $results[] = ['table' => 'cells', 'status' => 'success', 'message' => 'Column meeting_day normalized'];
            }

            return $this->jsonResponse([
                'status'  => 'success',
                'message' => 'Migrations completed successfully',
                'results' => $results
            ]);

        } catch (Exception $e) {
            error_log('Migration error: ' . $e->getMessage());
            return $this->jsonResponse([
                'status'  => 'error',
                'message' => 'Migration failed: ' . $e->getMessage()
            ], 500);
        }
    }
}
