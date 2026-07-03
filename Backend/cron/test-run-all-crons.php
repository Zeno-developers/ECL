<?php
/**
 * Test runner for all cron jobs in backend/cron
 *
 * Usage:
 *   php cron/test-run-all-crons.php        # run all crons (summary)
 *   php cron/test-run-all-crons.php --verbose   # show full stdout/stderr per job
 *
 * This runner executes each PHP file in the cron directory (except itself),
 * captures stdout/stderr, exit code and duration, then writes a JSON log
 * to backend/logs/cron-test-run-<timestamp>.log
 */

declare(strict_types=1);

$cronDir = __DIR__;
$files = glob($cronDir . DIRECTORY_SEPARATOR . '*.php');
$self = basename(__FILE__);

$jobs = [];
foreach ($files as $file) {
    if (basename($file) === $self) continue;
    $jobs[] = $file;
}

$verbose = in_array('--verbose', $argv, true) || in_array('-v', $argv, true);

if (empty($jobs)) {
    echo "No cron scripts found in $cronDir\n";
    exit(0);
}

$results = [];

foreach ($jobs as $jobFile) {
    $jobName = basename($jobFile);
    echo "Running: $jobName\n";

    $cmd = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($jobFile);

    $start = microtime(true);

    $descriptors = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];

    $process = proc_open($cmd, $descriptors, $pipes, $cronDir);

    if (!is_resource($process)) {
        $results[] = [
            'file' => $jobFile,
            'name' => $jobName,
            'exit' => 255,
            'duration' => 0,
            'stdout' => '',
            'stderr' => 'proc_open failed',
        ];
        echo "Failed to start process for $jobName\n";
        continue;
    }

    // Close stdin immediately
    fclose($pipes[0]);

    $stdout = stream_get_contents($pipes[1]);
    fclose($pipes[1]);

    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[2]);

    $exitCode = proc_close($process);
    $duration = round(microtime(true) - $start, 3);

    $results[] = [
        'file' => $jobFile,
        'name' => $jobName,
        'exit' => $exitCode,
        'duration_seconds' => $duration,
        'stdout' => $stdout,
        'stderr' => $stderr,
    ];

    echo "Exit: $exitCode | Duration: {$duration}s\n";

    if ($verbose) {
        if (trim($stdout) !== '') {
            echo "--- STDOUT ---\n" . $stdout . "\n";
        }
        if (trim($stderr) !== '') {
            echo "--- STDERR ---\n" . $stderr . "\n";
        }
    } else {
        $lines = array_filter(array_map('trim', explode("\n", trim($stdout))));
        if (!empty($lines)) {
            $preview = array_slice($lines, -8);
            echo "Output (last lines):\n" . implode("\n", $preview) . "\n";
        }
    }

    echo str_repeat('=', 60) . "\n\n";
}

$logDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'logs';
if (!is_dir($logDir)) {
    @mkdir($logDir, 0755, true);
}

$logFile = $logDir . DIRECTORY_SEPARATOR . 'cron-test-run-' . date('Ymd-His') . '.log';
file_put_contents($logFile, json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

echo "Summary saved to: $logFile\n";

// Also return non-zero exit if any job failed
foreach ($results as $r) {
    if (($r['exit'] ?? 0) !== 0) {
        exit(1);
    }
}

exit(0);
