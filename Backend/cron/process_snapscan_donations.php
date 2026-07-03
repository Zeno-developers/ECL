<?php

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/bootstrap.php';

use App\Database;
use App\Services\LoggerService;
use App\Services\SMTPConfigService;

$db = Database::getInstance();
$logger = new LoggerService();

$snapcode = getenv('SNAPSCAN_SNAPCODE') ?: '';
$apiKey = getenv('SNAPSCAN_API_KEY') ?: '';

if ($snapcode === '' || $apiKey === '') {
    $logger->warning('SnapScan cron skipped because credentials are missing');
    exit(0);
}

$cutoff = date('Y-m-d H:i:s', time() - 3600);
$staleDonations = $db->all(
    "SELECT d.*, u.first_name, u.last_name, u.email, f.name AS fund_name
     FROM snapscan_donations d
     LEFT JOIN users u ON u.id = d.user_id
     LEFT JOIN giving_funds f ON f.id = d.fund_id
     WHERE d.status = 'pending'
       AND d.created_at <= ?
     ORDER BY d.created_at ASC
     LIMIT 100",
    [$cutoff]
);

$updated = 0;

foreach ($staleDonations as $donation) {
    $transactionId = $donation['snapscan_transaction_id'] ?? null;
    if (!$transactionId) {
        continue;
    }

    $statusResponse = snapscanRequest(
        'GET',
        'https://api.snapscan.co.za/v1/payments/' . rawurlencode($transactionId),
        null,
        [
            'Authorization: Bearer ' . $apiKey,
            'Accept: application/json',
        ]
    );

    if ($statusResponse['status'] >= 400) {
        $logger->warning('SnapScan status lookup failed', [
            'donation_id' => $donation['id'],
            'transaction_id' => $transactionId,
            'status' => $statusResponse['status'],
        ]);
        continue;
    }

    $payload = json_decode($statusResponse['body'], true);
    if (!is_array($payload)) {
        continue;
    }

    $paymentStatus = strtolower((string)($payload['status'] ?? ''));
    if (!in_array($paymentStatus, ['completed', 'failed', 'refunded'], true)) {
        continue;
    }

    $now = date('Y-m-d H:i:s');
    $db->update('snapscan_donations', [
        'status' => $paymentStatus,
        'webhook_received_at' => $now,
        'webhook_payload' => json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        'completed_at' => $paymentStatus === 'completed' ? $now : $donation['completed_at'],
    ], 'id = ?', [$donation['id']]);

    if ($paymentStatus === 'completed') {
        $amount = (float)($donation['amount'] ?? 0);

        if (!empty($donation['fund_id'])) {
            $db->query(
                "UPDATE giving_funds SET current_amount = COALESCE(current_amount, 0) + ? WHERE id = ?",
                [$amount, $donation['fund_id']]
            );
        }

        if (!empty($donation['user_id'])) {
            updateDonorSummary($db, (int)$donation['user_id'], $amount, $now);
        }

        $recipient = [
            'first_name' => $donation['first_name'] ?? '',
            'last_name' => $donation['last_name'] ?? '',
            'name' => trim(($donation['first_name'] ?? '') . ' ' . ($donation['last_name'] ?? '')) ?: 'Partner',
            'email' => $donation['email'] ?? null,
        ];

        if (!empty($recipient['email'])) {
            if (sendReceiptEmail($donation, $recipient)) {
                $db->update('snapscan_donations', ['receipt_sent' => 1], 'id = ?', [$donation['id']]);
            }
        }
    }

    $updated++;
}

$logger->info('SnapScan donation reconciliation completed', [
    'updated' => $updated,
    'cutoff' => $cutoff,
]);

function snapscanRequest(string $method, string $url, ?array $body, array $headers): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 30,
    ]);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    }

    $responseBody = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'status' => $status,
        'body' => is_string($responseBody) ? $responseBody : '',
    ];
}

function updateDonorSummary(Database $db, int $userId, float $amount, string $completedAt): void
{
    if (columnExists($db, 'users', 'total_given')) {
        $db->query(
            "UPDATE users
             SET total_given = COALESCE(total_given, 0) + ?,
                 last_gift_date = ?
             WHERE id = ?",
            [$amount, $completedAt, $userId]
        );
        return;
    }

    if (columnExists($db, 'members', 'total_given')) {
        $db->query(
            "UPDATE members
             SET total_given = COALESCE(total_given, 0) + ?,
                 last_gift_date = ?
             WHERE user_id = ?",
            [$amount, $completedAt, $userId]
        );
    }
}

function sendReceiptEmail(array $donation, array $recipient): bool
{
    try {
        $mailer = SMTPConfigService::createFreshMailer();
        $mailer->addAddress($recipient['email'], $recipient['name'] ?? '');
        $mailer->isHTML(true);
        $mailer->Subject = 'Your SnapScan donation receipt';

        $html = renderTemplate(__DIR__ . '/../templates/emails/snapscan_receipt.html.php', $donation, $recipient);
        $text = renderTemplate(__DIR__ . '/../templates/emails/snapscan_receipt.txt.php', $donation, $recipient);

        $mailer->Body = $html;
        $mailer->AltBody = $text;

        return $mailer->send();
    } catch (Throwable $e) {
        return false;
    }
}

function renderTemplate(string $template, array $donation, array $recipient): string
{
    if (!file_exists($template)) {
        return '';
    }

    ob_start();
    $included = include $template;
    $output = ob_get_clean();

    if (is_string($output) && trim($output) !== '') {
        return $output;
    }

    return is_string($included) ? $included : '';
}

function columnExists(Database $db, string $table, string $column): bool
{
    try {
        $rows = $db->all("SHOW COLUMNS FROM {$table}");
        foreach ($rows as $row) {
            if (($row['Field'] ?? '') === $column) {
                return true;
            }
        }
    } catch (Throwable $e) {
        return false;
    }

    return false;
}
