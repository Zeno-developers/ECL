<?php
/**
 * Migration: Add recorded_by column to giving table
 * 
 * This script adds the recorded_by column to the giving table if it doesn't exist.
 * It's needed for the Sunday giving summary to work correctly.
 * 
 * Usage: php backend/add-recorded-by-column.php
 */

require_once __DIR__ . '/bootstrap.php';

use App\Database;

$db = Database::getInstance();

try {
    echo "[" . date('Y-m-d H:i:s') . "] Checking if recorded_by column exists in giving table...\n";
    
    // First, check if the column already exists
    $hasColumn = false;
    try {
        $result = $db->first("SELECT recorded_by FROM giving LIMIT 1");
        $hasColumn = true;
        echo "[" . date('Y-m-d H:i:s') . "] ✅ Column 'recorded_by' already exists.\n";
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Unknown column') !== false) {
            echo "[" . date('Y-m-d H:i:s') . "] ⚠️  Column 'recorded_by' does not exist. Adding it now...\n";
            $hasColumn = false;
        } else {
            throw $e;
        }
    }
    
    // If column doesn't exist, add it
    if (!$hasColumn) {
        $pdo = $db->getConnection();
        
        // Add the recorded_by column
        $pdo->exec("ALTER TABLE giving ADD COLUMN recorded_by INTEGER");
        echo "[" . date('Y-m-d H:i:s') . "] ✅ Added 'recorded_by' column.\n";
        
        // Add foreign key constraint if supported
        try {
            $pdo->exec("ALTER TABLE giving ADD FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL");
            echo "[" . date('Y-m-d H:i:s') . "] ✅ Added foreign key constraint.\n";
        } catch (Exception $fkError) {
            // Foreign keys might not be supported in all databases
            echo "[" . date('Y-m-d H:i:s') . "] ℹ️  Foreign key constraint could not be added (not critical): " . $fkError->getMessage() . "\n";
        }
    }
    
    echo "[" . date('Y-m-d H:i:s') . "] ✅ Migration completed successfully!\n";
    
} catch (Exception $e) {
    echo "[" . date('Y-m-d H:i:s') . "] ❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
