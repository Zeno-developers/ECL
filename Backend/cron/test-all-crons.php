<?php
/**
 * Test runner for all production cron jobs in backend/cron
 *
 * Usage:
 *   php cron/test-all-crons.php
 *   php cron/test-all-crons.php --verbose
 *   php cron/test-all-crons.php --fail-fast
 *   php cron/test-all-crons.php --list
 */

declare(strict_types=1);

$cronDir = __DIR__;
$self = basename(__FILE__);
$verbose = in_array('--verbose', $argv, true) || in_array('-v', $argv, true);
$failFast = in_array('--fail-fast', $argv, true);
$listOnly = in_array('--list', $argv, true);

$excluded = [
    $self,
    'test-run-all-crons.php',
    'EVENT_REMINDER_SETUP.md',
];

$jobs = [];
foreach (glob($cronDir . DIRECTORY_SEPARATOR . '*.php') as $file) {
    $name = basename($file);
    if (in_array($name, $excluded, true)) {
        continue;
    }
    $jobs[] = $file;
}

sort($jobs);

if ($listOnly) {
    foreach ($jobs as $job) {
        echo basename($job) . PHP_EOL;
    }
    exit(0);
}

if (empty($jobs)) {
    echo "No cron scripts found in $cronDir\n";
    exit(0);
}

$results = [];
$failedJobs = 0;
$passedJobs = 0;

echo "Testing " . count($jobs) . " cron job(s)\n\n";

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
            'name' => $jobName,
            'file' => $jobFile,
            'exit_code' => 255,
            'duration_seconds' => 0,
            'stdout' => '',
            'stderr' => 'proc_open failed',
        ];
        $failedJobs++;
        echo "  Failed to start process\n";
        if ($failFast) {
            break;
        }
        continue;
    }

    fclose($pipes[0]);
    $stdout = stream_get_contents($pipes[1]);
    fclose($pipes[1]);

    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[2]);

    $exitCode = proc_close($process);
    $duration = round(microtime(true) - $start, 3);

    $results[] = [
        'name' => $jobName,
        'file' => $jobFile,
        'exit_code' => $exitCode,
        'duration_seconds' => $duration,
        'stdout' => $stdout,
        'stderr' => $stderr,
    ];

    if ($exitCode === 0) {
        $passedJobs++;
    } else {
        $failedJobs++;
    }

    echo "  Exit: $exitCode | Duration: {$duration}s\n";

    if ($verbose) {
        if (trim($stdout) !== '') {
            echo "--- STDOUT ---\n" . $stdout . "\n";
        }
        if (trim($stderr) !== '') {
            echo "--- STDERR ---\n" . $stderr . "\n";
        }
    } else {
        $previewLines = array_filter(array_map('trim', explode("\n", trim($stdout))));
        if (!empty($previewLines)) {
            $preview = array_slice($previewLines, -6);
            echo "  Output:\n" . implode("\n", $preview) . "\n";
        }
        if (trim($stderr) !== '') {
            $stderrLines = array_filter(array_map('trim', explode("\n", trim($stderr))));
            if (!empty($stderrLines)) {
                $preview = array_slice($stderrLines, -3);
                echo "  Errors:\n" . implode("\n", $preview) . "\n";
            }
        }
    }

    echo str_repeat('=', 60) . "\n";

    if ($failFast && $exitCode !== 0) {
        break;
    }
}

$logDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'logs';
if (!is_dir($logDir)) {
    @mkdir($logDir, 0755, true);
}

$logFile = $logDir . DIRECTORY_SEPARATOR . 'cron-test-run-' . date('Ymd-His') . '.json';
file_put_contents($logFile, json_encode([
    'started_at' => date('c'),
    'php_binary' => PHP_BINARY,
    'summary' => [
        'total' => count($results),
        'passed' => $passedJobs,
        'failed' => $failedJobs,
    ],
    'results' => $results,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

echo "\nSummary\n";
echo "  Total:  " . count($results) . "\n";
echo "  Passed: $passedJobs\n";
echo "  Failed: $failedJobs\n";
echo "  Log:    $logFile\n";

exit($failedJobs > 0 ? 1 : 0);
