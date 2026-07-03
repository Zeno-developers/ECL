<?php
/**
 * Backend bootstrap shim.
 *
 * Some one-off scripts in this repo expect `backend/bootstrap.php`, while
 * the Slim app bootstrap lives in `backend/src/bootstrap.php`.
 *
 * Keeping this file avoids "file not found" errors when running scripts like:
 *   php backend/add-recorded-by-column.php
 */

// When running via CLI, Slim's bootstrap won't see HTTP_HOST/SERVER_NAME and may
// incorrectly load production env files. Force a localhost-like host so `.env.local`
// is picked up for local scripts.
if (PHP_SAPI === 'cli') {
    $_SERVER['HTTP_HOST'] = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $_SERVER['SERVER_NAME'] = $_SERVER['SERVER_NAME'] ?? 'localhost';
}

require_once __DIR__ . '/src/bootstrap.php';
