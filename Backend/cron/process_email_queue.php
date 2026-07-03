<?php
// Email Queue Processor Cron Job
// Retries failed emails from the queue
//
// Add to crontab (every 5 minutes):
// */5 * * * * /usr/bin/php /path/to/cron/process_email_queue.php
// Or run manually: php cron/process_email_queue.php

require __DIR__ . '/../src/bootstrap.php';

use App\Services\EmailQueueService;
use App\Database;

$startTime = microtime(true);

try {
    echo "[" . date('Y-m-d H:i:s') . "] Email Queue Processor Starting\n";
    
    $queueService = new EmailQueueService();
    $results = $queueService->processQueue();
    
    // Log to file
    $logMessage = sprintf(
        "[%s] Queue Processed: Sent=%d, Failed=%d, Processed=%d\n",
        date('Y-m-d H:i:s'),
        $results['sent'],
        $results['failed'],
        $results['processed']
    );
    
    error_log($logMessage);
    
    // Also log to console
    echo $logMessage;
    
    // Show message details
    foreach ($results['messages'] as $msg) {
        echo "  $msg\n";
    }
    
    // Show stats
    $stats = $queueService->getStats();
    echo "\nQueue Statistics:\n";
    echo "  Pending: {$stats['pending']}\n";
    echo "  Sent: {$stats['sent']}\n";
    echo "  Failed: {$stats['failed']}\n";
    echo "  Total: {$stats['total']}\n";
    
    $duration = round((microtime(true) - $startTime) * 1000, 2);
    echo "\n[" . date('Y-m-d H:i:s') . "] Completed in {$duration}ms\n";
    
} catch (Exception $e) {
    error_log("[ERROR] Email Queue Processor: " . $e->getMessage());
    echo "[ERROR] " . $e->getMessage() . "\n";
    exit(1);
}
?>
