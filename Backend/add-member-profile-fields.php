<?php
/**
 * Migration: Add mobile profile fields to members table
 *
 * Adds:
 * - members.spiritual_gifts (LONGTEXT NULL)
 * - members.ministry_interests (LONGTEXT NULL)
 *
 * Usage:
 *   php backend/add-member-profile-fields.php
 */

require_once __DIR__ . '/bootstrap.php';

use App\Database;

$db = Database::getInstance();

try {
    $pdo = $db->getConnection();

    $addIfMissing = function (string $column, string $definition) use ($pdo) {
        // MariaDB can be picky about placeholders in SHOW statements; use quoting instead.
        $exists = (bool)$pdo->query("SHOW COLUMNS FROM `members` LIKE " . $pdo->quote($column))->fetchColumn();
        if ($exists) {
            echo "[" . date('Y-m-d H:i:s') . "] ✅ Column '{$column}' already exists.\n";
            return;
        }

        $pdo->exec("ALTER TABLE `members` ADD COLUMN `{$column}` {$definition}");
        echo "[" . date('Y-m-d H:i:s') . "] ✅ Added '{$column}'.\n";
    };

    echo "[" . date('Y-m-d H:i:s') . "] Ensuring members profile columns...\n";
    $addIfMissing('spiritual_gifts', 'LONGTEXT NULL');
    $addIfMissing('ministry_interests', 'LONGTEXT NULL');
    echo "[" . date('Y-m-d H:i:s') . "] ✅ Migration completed successfully!\n";
} catch (Exception $e) {
    echo "[" . date('Y-m-d H:i:s') . "] ❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
