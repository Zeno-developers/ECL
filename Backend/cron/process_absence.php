<?php
/**
 * Cron Job: Process absence alerts and send follow-up emails.
 *
 * Run this daily after Sunday service and after the relevant cell meeting window.
 *
 * Usage: php backend/cron/process_absence.php
 */

require_once __DIR__ . '/../src/bootstrap.php';

use App\Service\AbsenceAlertService;

echo '[' . date('Y-m-d H:i:s') . "] Starting absence alert processing...\n";

try {
    $service = new AbsenceAlertService();
    $results = $service->process();

    echo "Evaluated: {$results['evaluated']}\n";
    echo "Flagged: {$results['flagged']}\n";
    echo "Notifications sent: {$results['notified']}\n";
    echo "Queued: {$results['queued']}\n";

    if (!empty($results['errors'])) {
        echo "Warnings:\n";
        foreach ($results['errors'] as $error) {
            echo " - {$error}\n";
        }
    }

    echo '[' . date('Y-m-d H:i:s') . "] Absence alert processing completed.\n";
} catch (Throwable $e) {
    echo 'ERROR: ' . $e->getMessage() . "\n";
    error_log('Absence alert processing failed: ' . $e->getMessage());
    exit(1);
}
