<?php

namespace App\Services;

use PDO;
use Exception;

class OfflineSyncService
{
    private const SQLITE_QUEUE_TABLE = 'offline_sync_queue';
    private const MYSQL_APPLIED_TABLE = 'offline_sync_applied';

    public static function queueSqliteOperation(PDO $sqlite, string $type, array $payload): string
    {
        self::ensureSqliteQueueTable($sqlite);

        $syncUuid = (string)($payload['sync_uuid'] ?? self::generateUuid());
        $payload['sync_uuid'] = $syncUuid;

        $stmt = $sqlite->prepare(
            "INSERT OR REPLACE INTO " . self::SQLITE_QUEUE_TABLE . " (
                sync_uuid,
                operation_type,
                payload,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        );
        $stmt->execute([
            $syncUuid,
            $type,
            json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ]);

        return $syncUuid;
    }

    public static function syncSqliteQueueToMysql(string $sqlitePath, PDO $mysql): array
    {
        if (!is_file($sqlitePath) || filesize($sqlitePath) === 0) {
            return ['processed' => 0, 'failed' => 0];
        }

        $sqlite = new PDO("sqlite:{$sqlitePath}", null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $sqlite->exec('PRAGMA foreign_keys = ON');
        $sqlite->exec('PRAGMA busy_timeout = 5000');

        self::ensureSqliteQueueTable($sqlite);
        self::ensureMysqlAppliedTable($mysql);

        $processed = 0;
        $failed = 0;

        $rows = $sqlite->query(
            "SELECT id, sync_uuid, operation_type, payload
             FROM " . self::SQLITE_QUEUE_TABLE . "
             WHERE synced_at IS NULL
             ORDER BY id ASC"
        )->fetchAll();

        foreach ($rows as $row) {
            $syncUuid = (string)($row['sync_uuid'] ?? '');
            $payload = json_decode((string)($row['payload'] ?? ''), true);

            if ($syncUuid === '' || !is_array($payload)) {
                self::markSqliteQueueError($sqlite, (int)$row['id'], 'Invalid sync payload');
                $failed++;
                continue;
            }

            if (self::isAlreadyApplied($mysql, $syncUuid)) {
                self::markSqliteQueueSynced($sqlite, (int)$row['id']);
                $processed++;
                continue;
            }

            try {
                $mysql->beginTransaction();
                self::replayOperation($mysql, (string)$row['operation_type'], $payload);
                self::recordApplied($mysql, $syncUuid, (string)$row['operation_type']);
                $mysql->commit();

                self::markSqliteQueueSynced($sqlite, (int)$row['id']);
                $processed++;
            } catch (Exception $e) {
                if ($mysql->inTransaction()) {
                    $mysql->rollBack();
                }

                self::markSqliteQueueError($sqlite, (int)$row['id'], $e->getMessage());
                $failed++;
            }
        }

        return ['processed' => $processed, 'failed' => $failed];
    }

    public static function ensureSqliteQueueTable(PDO $sqlite): void
    {
        $sqlite->exec(
            "CREATE TABLE IF NOT EXISTS " . self::SQLITE_QUEUE_TABLE . " (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sync_uuid TEXT NOT NULL UNIQUE,
                operation_type TEXT NOT NULL,
                payload TEXT NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0,
                last_error TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                synced_at DATETIME NULL
            )"
        );
        $sqlite->exec(
            "CREATE INDEX IF NOT EXISTS idx_offline_sync_queue_synced_at
             ON " . self::SQLITE_QUEUE_TABLE . " (synced_at)"
        );
    }

    private static function ensureMysqlAppliedTable(PDO $mysql): void
    {
        $mysql->exec(
            "CREATE TABLE IF NOT EXISTS " . self::MYSQL_APPLIED_TABLE . " (
                id INT PRIMARY KEY AUTO_INCREMENT,
                sync_uuid VARCHAR(64) NOT NULL,
                operation_type VARCHAR(100) NOT NULL,
                applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_offline_sync_applied_sync_uuid (sync_uuid),
                KEY idx_offline_sync_applied_operation_type (operation_type),
                KEY idx_offline_sync_applied_applied_at (applied_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    }

    private static function isAlreadyApplied(PDO $mysql, string $syncUuid): bool
    {
        $stmt = $mysql->prepare(
            "SELECT id FROM " . self::MYSQL_APPLIED_TABLE . " WHERE sync_uuid = ? LIMIT 1"
        );
        $stmt->execute([$syncUuid]);
        return (bool)$stmt->fetchColumn();
    }

    private static function recordApplied(PDO $mysql, string $syncUuid, string $type): void
    {
        $stmt = $mysql->prepare(
            "INSERT INTO " . self::MYSQL_APPLIED_TABLE . " (sync_uuid, operation_type) VALUES (?, ?)"
        );
        $stmt->execute([$syncUuid, $type]);
    }

    private static function replayOperation(PDO $mysql, string $type, array $payload): void
    {
        switch ($type) {
            case 'giving_record':
                self::replayGivingRecord($mysql, $payload);
                return;

            case 'snapscan_offline_gift':
                self::replaySnapscanOfflineGift($mysql, $payload);
                return;

            case 'attendance_sunday_checkin':
                self::replaySundayCheckin($mysql, $payload);
                return;

            case 'attendance_cell_batch':
                self::replayCellAttendanceBatch($mysql, $payload);
                return;

            default:
                throw new Exception("Unsupported offline sync operation: {$type}");
        }
    }

    private static function replayGivingRecord(PDO $mysql, array $payload): void
    {
        $row = is_array($payload['row'] ?? null) ? $payload['row'] : [];
        if (empty($row)) {
            throw new Exception('Missing giving payload row');
        }

        self::insertFilteredRow($mysql, 'giving', $row);
    }

    private static function replaySnapscanOfflineGift(PDO $mysql, array $payload): void
    {
        $donationRow = is_array($payload['donation_row'] ?? null) ? $payload['donation_row'] : [];
        if (empty($donationRow)) {
            throw new Exception('Missing SnapScan donation row payload');
        }

        self::insertFilteredRow($mysql, 'snapscan_donations', $donationRow);

        $amount = (float)($payload['amount'] ?? $donationRow['amount'] ?? 0);
        $fundId = isset($payload['fund_id']) ? (int)$payload['fund_id'] : null;
        if ($fundId && self::tableExists($mysql, 'giving_funds')) {
            $stmt = $mysql->prepare(
                "UPDATE giving_funds
                 SET current_amount = COALESCE(current_amount, 0) + ?
                 WHERE id = ?"
            );
            $stmt->execute([$amount, $fundId]);
        }

        $userId = isset($payload['user_id']) ? (int)$payload['user_id'] : null;
        $completedAt = (string)($payload['completed_at'] ?? $donationRow['completed_at'] ?? date('Y-m-d H:i:s'));
        if ($userId) {
            self::updateDonorSummary($mysql, $userId, $amount, $completedAt);
        }
    }

    private static function replaySundayCheckin(PDO $mysql, array $payload): void
    {
        $userId = (int)($payload['user_id'] ?? 0);
        $attendanceDate = (string)($payload['attendance_date'] ?? '');
        if ($userId <= 0 || $attendanceDate === '') {
            throw new Exception('Missing Sunday attendance sync payload');
        }

        $existingStmt = $mysql->prepare(
            "SELECT id FROM attendance_sunday WHERE user_id = ? AND attendance_date = ? LIMIT 1"
        );
        $existingStmt->execute([$userId, $attendanceDate]);
        if ($existingStmt->fetchColumn()) {
            return;
        }

        $row = [
            'user_id' => $userId,
            'attendance_date' => $attendanceDate,
            'checked_in_by' => $payload['checked_in_by'] ?? null,
            'is_visitor' => !empty($payload['is_visitor']) ? 1 : 0,
            'check_in_time' => $payload['check_in_time'] ?? date('H:i:s'),
            'notes' => $payload['notes'] ?? null,
            'created_at' => $payload['created_at'] ?? date('Y-m-d H:i:s'),
        ];

        self::insertFilteredRow($mysql, 'attendance_sunday', $row);

        if (self::tableExists($mysql, 'absence_flags')) {
            $stmt = $mysql->prepare(
                "UPDATE absence_flags
                 SET resolved_at = CURRENT_TIMESTAMP
                 WHERE user_id = ? AND resolved_at IS NULL"
            );
            $stmt->execute([$userId]);
        }
    }

    private static function replayCellAttendanceBatch(PDO $mysql, array $payload): void
    {
        $rows = is_array($payload['rows'] ?? null) ? $payload['rows'] : [];
        if (empty($rows)) {
            throw new Exception('Missing cell attendance batch payload');
        }

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $userId = (int)($row['user_id'] ?? 0);
            $meetingDate = (string)($row['meeting_date'] ?? '');
            if ($userId <= 0 || $meetingDate === '') {
                continue;
            }

            $existingStmt = $mysql->prepare(
                "SELECT id FROM attendance_cell WHERE user_id = ? AND meeting_date = ? LIMIT 1"
            );
            $existingStmt->execute([$userId, $meetingDate]);
            if ($existingStmt->fetchColumn()) {
                continue;
            }

            self::insertFilteredRow($mysql, 'attendance_cell', $row);
        }
    }

    private static function insertFilteredRow(PDO $pdo, string $table, array $row): void
    {
        $columns = self::getTableColumns($pdo, $table);
        if (empty($columns)) {
            throw new Exception("Cannot sync into missing table: {$table}");
        }

        $filtered = array_filter(
            $row,
            fn($_, $key) => in_array($key, $columns, true),
            ARRAY_FILTER_USE_BOTH
        );

        if (empty($filtered)) {
            throw new Exception("No matching columns found while syncing table: {$table}");
        }

        $quotedColumns = array_map(fn($column) => "`{$column}`", array_keys($filtered));
        $placeholders = implode(', ', array_fill(0, count($filtered), '?'));
        $sql = "INSERT INTO `{$table}` (" . implode(', ', $quotedColumns) . ") VALUES ({$placeholders})";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(array_values($filtered));
    }

    private static function getTableColumns(PDO $pdo, string $table): array
    {
        $stmt = $pdo->query("SHOW COLUMNS FROM `{$table}`");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return array_values(array_filter(array_map(fn($row) => $row['Field'] ?? null, $rows)));
    }

    private static function tableExists(PDO $pdo, string $table): bool
    {
        $stmt = $pdo->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$table]);
        return (bool)$stmt->fetchColumn();
    }

    private static function updateDonorSummary(PDO $pdo, int $userId, float $amount, string $completedAt): void
    {
        if (self::tableHasColumn($pdo, 'users', 'total_given')) {
            $stmt = $pdo->prepare(
                "UPDATE users
                 SET total_given = COALESCE(total_given, 0) + ?,
                     last_gift_date = ?
                 WHERE id = ?"
            );
            $stmt->execute([$amount, $completedAt, $userId]);
            return;
        }

        if (self::tableHasColumn($pdo, 'members', 'total_given')) {
            $stmt = $pdo->prepare(
                "UPDATE members
                 SET total_given = COALESCE(total_given, 0) + ?,
                     last_gift_date = ?
                 WHERE user_id = ?"
            );
            $stmt->execute([$amount, $completedAt, $userId]);
        }
    }

    private static function tableHasColumn(PDO $pdo, string $table, string $column): bool
    {
        if (!self::tableExists($pdo, $table)) {
            return false;
        }

        return in_array($column, self::getTableColumns($pdo, $table), true);
    }

    private static function markSqliteQueueSynced(PDO $sqlite, int $id): void
    {
        $stmt = $sqlite->prepare(
            "UPDATE " . self::SQLITE_QUEUE_TABLE . "
             SET synced_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP,
                 last_error = NULL
             WHERE id = ?"
        );
        $stmt->execute([$id]);
    }

    private static function markSqliteQueueError(PDO $sqlite, int $id, string $error): void
    {
        $stmt = $sqlite->prepare(
            "UPDATE " . self::SQLITE_QUEUE_TABLE . "
             SET attempts = attempts + 1,
                 last_error = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?"
        );
        $stmt->execute([substr($error, 0, 1000), $id]);
    }

    private static function generateUuid(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}
