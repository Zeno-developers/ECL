<?php
/**
 * Migration: Add gallery_images column to blog_posts table
 *
 * Fixes: "Unknown column 'gallery_images' in 'field list'" when creating blog posts.
 *
 * Usage:
 *   php backend/add-gallery-images-column.php
 */

require_once __DIR__ . '/bootstrap.php';

use App\Database;

$db = Database::getInstance();

try {
    echo "[" . date('Y-m-d H:i:s') . "] Checking if gallery_images column exists in blog_posts table...\n";

    $hasColumn = false;
    try {
        $db->first("SELECT gallery_images FROM blog_posts LIMIT 1");
        $hasColumn = true;
        echo "[" . date('Y-m-d H:i:s') . "] ✅ Column 'gallery_images' already exists.\n";
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Unknown column') !== false) {
            echo "[" . date('Y-m-d H:i:s') . "] ⚠️  Column 'gallery_images' does not exist. Adding it now...\n";
            $hasColumn = false;
        } else {
            throw $e;
        }
    }

    if (!$hasColumn) {
        $pdo = $db->getConnection();
        $pdo->exec("ALTER TABLE blog_posts ADD COLUMN gallery_images LONGTEXT NULL");
        echo "[" . date('Y-m-d H:i:s') . "] ✅ Added 'gallery_images' column.\n";
    }

    echo "[" . date('Y-m-d H:i:s') . "] ✅ Migration completed successfully!\n";
} catch (Exception $e) {
    echo "[" . date('Y-m-d H:i:s') . "] ❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}

