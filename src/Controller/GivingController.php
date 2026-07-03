<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use App\Database;
use App\Services\LoggerService;
use App\Services\SMTPConfigService;
use App\Services\WhatsAppService;
use PHPMailer\PHPMailer\PHPMailer;
use Exception;

class GivingController extends BaseController
{
    public function getHistory(Request $request, Response $response): Response
    {
        try {
            $page = (int)($request->getQueryParams()['page'] ?? 1);
            $limit = (int)($request->getQueryParams()['limit'] ?? 50);
            $result = $this->paginate('giving', $page, $limit);
            
            return $this->jsonResponse([
                'status' => 'success',
                'data' => $result['data'],
                'pagination' => $result['pagination']
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch giving history: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getReports(Request $request, Response $response): Response
    {
        try {
            $params = $request->getQueryParams();
            $startDate = $params['start_date'] ?? date('Y-m-01');
            $endDate = $params['end_date'] ?? date('Y-m-d');
            
            // Determine database type and use appropriate SQL syntax
            $dbConnection = $this->db->getDriver() === 'sqlite' ? 'sqlite' : 'mysql';
            
            // For monthly trends, use database-appropriate date functions
            if ($dbConnection === 'sqlite') {
                $monthlyTrendsSql = "SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total 
                     FROM giving 
                     WHERE created_at >= date('now', '-12 months') 
                     GROUP BY strftime('%Y-%m', created_at) 
                     ORDER BY month DESC";
            } else {
                // MySQL syntax
                $monthlyTrendsSql = "SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(amount) as total 
                     FROM giving 
                     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                     GROUP BY DATE_FORMAT(created_at, '%Y-%m') 
                     ORDER BY month DESC";
            }
            
            $reports = [
                'total_amount' => $this->db->first(
                    "SELECT SUM(amount) as total FROM giving WHERE DATE(created_at) BETWEEN ? AND ?",
                    [$startDate, $endDate]
                )['total'] ?? 0,
                'donation_count' => $this->db->first(
                    "SELECT COUNT(*) as count FROM giving WHERE DATE(created_at) BETWEEN ? AND ?",
                    [$startDate, $endDate]
                )['count'] ?? 0,
                'by_fund' => $this->db->all(
                    "SELECT fund, SUM(amount) as total, COUNT(*) as count 
                     FROM giving 
                     WHERE DATE(created_at) BETWEEN ? AND ? 
                     GROUP BY fund",
                    [$startDate, $endDate]
                ),
                'by_payment_method' => $this->db->all(
                    "SELECT payment_method, SUM(amount) as total, COUNT(*) as count 
                     FROM giving 
                     WHERE DATE(created_at) BETWEEN ? AND ? AND payment_method IS NOT NULL 
                     GROUP BY payment_method",
                    [$startDate, $endDate]
                ),
                'monthly_trends' => $this->db->all($monthlyTrendsSql)
            ];

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $reports
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get reports: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getUserStats(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            
            $stats = [
                'total_given' => $this->db->first(
                    "SELECT SUM(amount) as total FROM giving WHERE user_id = ?",
                    [$userId]
                )['total'] ?? 0,
                'donation_count' => $this->db->first(
                    "SELECT COUNT(*) as count FROM giving WHERE user_id = ?",
                    [$userId]
                )['count'] ?? 0,
                'by_fund' => $this->db->all(
                    "SELECT fund, SUM(amount) as total, COUNT(*) as count 
                     FROM giving 
                     WHERE user_id = ? 
                     GROUP BY fund",
                    [$userId]
                ),
                'recent_donations' => $this->db->all(
                    "SELECT * FROM giving WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
                    [$userId]
                )
            ];

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $stats
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get user stats: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getUserHistory(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $page = (int)($request->getQueryParams()['page'] ?? 1);
            $limit = (int)($request->getQueryParams()['limit'] ?? 10);
            $offset = ($page - 1) * $limit;
            
            $sql = "SELECT * FROM giving WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?";
            $donations = $this->db->all($sql, [$userId, $limit, $offset]);
            
            $total = $this->db->first("SELECT COUNT(*) as count FROM giving WHERE user_id = ?", [$userId])['count'];

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $donations,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => ceil($total / $limit)
                ]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get user history: ' . $e->getMessage()
            ], 500);
        }
    }

    public function record(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            $userId = $this->getUserId($request);
            
            $required = ['amount'];
            $errors = $this->validateRequired($data, $required);
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $donorName = isset($data['donor_name']) ? trim((string)$data['donor_name']) : '';
            if ($donorName === '' && $userId) {
                $member = $this->db->first("SELECT first_name, last_name FROM users WHERE id = ?", [$userId]);
                if ($member) {
                    $donorName = trim(($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? ''));
                }
            }
            if ($donorName === '') {
                $donorName = 'Anonymous Donor';
            }

            $givingData = [
                'donor_name' => $this->sanitizeString($donorName),
                'donor_email' => isset($data['donor_email']) ? filter_var($data['donor_email'], FILTER_SANITIZE_EMAIL) : null,
                'amount' => number_format((float)$data['amount'], 2, '.', ''),
                'fund' => isset($data['fund']) ? $this->sanitizeString($data['fund']) : 'General',
                'payment_method' => isset($data['payment_method']) ? $this->sanitizeString($data['payment_method']) : null,
                'transaction_id' => isset($data['transaction_id']) ? $this->sanitizeString($data['transaction_id']) : null,
                'receipt_number' => isset($data['receipt_number']) ? $this->sanitizeString($data['receipt_number']) : null,
                'notes' => isset($data['notes']) ? $this->sanitizeString($data['notes']) : null,
                'is_recurring' => isset($data['is_recurring']) ? (bool)$data['is_recurring'] : 0,
                'recurring_frequency' => isset($data['recurring_frequency']) ? $this->sanitizeString($data['recurring_frequency']) : null,
                'donor_type' => isset($data['donor_type']) ? $this->sanitizeString($data['donor_type']) : 'member',
                'entry_source' => isset($data['entry_source']) ? $this->sanitizeString($data['entry_source']) : 'online',
                'service_date' => isset($data['service_date']) ? $data['service_date'] : null,
                'recorded_by' => isset($data['recorded_by']) ? (int)$data['recorded_by'] : $userId,
                'visitor_id' => isset($data['visitor_id']) ? (int)$data['visitor_id'] : null,
                'user_id' => isset($data['user_id']) ? (int)$data['user_id'] : $userId
            ];

            $givingData = $this->filterDataByExistingColumns('giving', $givingData);
            $givingId = $this->db->insert('giving', $givingData);
            $giving = $this->db->first("SELECT * FROM giving WHERE id = ?", [$givingId]);

            if ($this->isOfflineFallbackMode() && is_array($giving)) {
                $this->queueOfflineSyncOperation('giving_record', [
                    'row' => $giving,
                ]);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Donation recorded successfully',
                'data' => $giving
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to record donation: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getSundaySummary(Request $request, Response $response): Response
    {
        try {
            $params = $request->getQueryParams();
            $serviceDate = $params['service_date'] ?? date('Y-m-d');

            $hasEntrySource = $this->tableHasColumn('giving', 'entry_source');
            $hasServiceDate = $this->tableHasColumn('giving', 'service_date');
            $hasRecordedBy = $this->tableHasColumn('giving', 'recorded_by');
            $dateColumn = $hasServiceDate ? 'service_date' : 'DATE(created_at)';
            $sourceFilter = $hasEntrySource ? " AND entry_source = 'sunday_service'" : '';

            $summary = [
                'service_date' => $serviceDate,
                'total_amount' => $this->db->first(
                    "SELECT SUM(amount) as total
                     FROM giving
                     WHERE {$dateColumn} = ?{$sourceFilter}",
                    [$serviceDate]
                )['total'] ?? 0,
                'total_entries' => $this->db->first(
                    "SELECT COUNT(*) as count
                     FROM giving
                     WHERE {$dateColumn} = ?{$sourceFilter}",
                    [$serviceDate]
                )['count'] ?? 0,
                'by_fund' => $this->db->all(
                    "SELECT fund, SUM(amount) as total, COUNT(*) as count
                     FROM giving
                     WHERE {$dateColumn} = ?{$sourceFilter}
                     GROUP BY fund
                     ORDER BY total DESC",
                    [$serviceDate]
                ),
                'entries' => $this->getGivingEntries($serviceDate, $hasServiceDate, $hasEntrySource, $hasRecordedBy)
            ];

            // Optional WhatsApp send to pastors
            $sendWa = filter_var($params['send_whatsapp'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $waSent = 0;
            if ($sendWa) {
                $waSent = $this->sendSundaySummaryWhatsApp($summary);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $summary,
                'whatsapp_sent' => $waSent,
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch Sunday giving summary: ' . $e->getMessage()
            ], 500);
        }
    }

    private function sendSundaySummaryWhatsApp(array $summary): int
    {
        $waService = new WhatsAppService();
        if (!$waService->isConfigured()) {
            return 0;
        }

        $date         = $summary['service_date'];
        $total        = 'R' . number_format((float)$summary['total_amount'], 2);
        $entries      = (int)$summary['total_entries'];
        $fundLines    = '';
        foreach ($summary['by_fund'] ?? [] as $f) {
            $fundLines .= "\n  • " . ucfirst($f['fund'] ?? 'General') . ': R' . number_format((float)$f['total'], 2) . ' (' . $f['count'] . ' entries)';
        }

        $message = "📊 *Sunday Giving Summary*\n"
                 . "Date: {$date}\n\n"
                 . "*Total Collected: {$total}*\n"
                 . "Total Entries: {$entries}"
                 . ($fundLines ? "\n\nBy Fund:{$fundLines}" : '')
                 . "\n\n— Eternal Love Church";

        // Send to all pastoral phones
        $pastors = $this->db->all(
            "SELECT DISTINCT phone FROM users WHERE role IN ('pastor','admin','superadmin') AND is_active=1 AND phone IS NOT NULL AND phone != ''"
        );

        if (empty($pastors)) {
            return 0;
        }

        $recipients = array_map(fn($p) => ['phone' => $p['phone']], $pastors);
        $result     = $waService->send($recipients, $message);
        return $result['sent'] ?? 0;
    }

    private function getGivingEntries(string $serviceDate, bool $hasServiceDate, bool $hasEntrySource, bool $hasRecordedBy): array
    {
        $dateColumn = $hasServiceDate ? "g.service_date" : "DATE(g.created_at)";
        $sourceFilter = $hasEntrySource ? " AND g.entry_source = 'sunday_service'" : '';
        
        if ($hasRecordedBy) {
            // If recorded_by column exists, join with users table
            return $this->db->all(
                "SELECT g.*, recorder.first_name as recorded_by_first_name, recorder.last_name as recorded_by_last_name
                 FROM giving g
                 LEFT JOIN users recorder ON recorder.id = g.recorded_by
                 WHERE {$dateColumn} = ?"
                 . $sourceFilter . "
                 ORDER BY g.created_at DESC",
                [$serviceDate]
            );
        } else {
            // Fallback if column doesn't exist
            return $this->db->all(
                "SELECT g.*, NULL as recorded_by_first_name, NULL as recorded_by_last_name
                 FROM giving g
                 WHERE {$dateColumn} = ?"
                 . $sourceFilter . "
                 ORDER BY g.created_at DESC",
                [$serviceDate]
            );
        }
    }

    public function getGoals(Request $request, Response $response): Response
    {
        try {
            $goals = $this->db->all("SELECT * FROM giving_goals WHERE is_active = 1 ORDER BY end_date DESC");
            
            // Calculate progress for each goal
            foreach ($goals as &$goal) {
                $raised = $this->db->first(
                    "SELECT SUM(amount) as total FROM giving WHERE fund = ? AND DATE(created_at) BETWEEN ? AND ?",
                    [$goal['fund'], $goal['start_date'], $goal['end_date']]
                )['total'] ?? 0;
                
                $goal['current_amount'] = (float)$raised;
                $goal['progress'] = $goal['target_amount'] > 0 ? ($raised / $goal['target_amount']) * 100 : 0;
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $goals
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch goals: ' . $e->getMessage()
            ], 500);
        }
    }

    public function createGoal(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            $required = ['fund', 'target_amount', 'start_date', 'end_date'];
            $errors = $this->validateRequired($data, $required);
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $goalData = [
                'fund' => $this->sanitizeString($data['fund']),
                'target_amount' => number_format((float)$data['target_amount'], 2, '.', ''),
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'is_active' => isset($data['is_active']) ? (bool)$data['is_active'] : 1
            ];

            $goalId = $this->db->insert('giving_goals', $goalData);
            $goal = $this->db->first("SELECT * FROM giving_goals WHERE id = ?", [$goalId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Goal created successfully',
                'data' => $goal
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to create goal: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateGoal(Request $request, Response $response, array $args): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            $goalId = $args['id'];
            
            $allowedFields = ['fund', 'target_amount', 'current_amount', 'start_date', 'end_date', 'is_active'];
            $updateData = [];
            
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    if (in_array($field, ['target_amount', 'current_amount'])) {
                        $updateData[$field] = number_format((float)$data[$field], 2, '.', '');
                    } else {
                        $updateData[$field] = is_string($data[$field]) ? $this->sanitizeString($data[$field]) : $data[$field];
                    }
                }
            }

            if (empty($updateData)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'No data to update'
                ], 400);
            }

            $setClause = implode(', ', array_map(fn($key) => "$key = ?", array_keys($updateData)));
            $this->db->query(
                "UPDATE giving_goals SET $setClause, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                array_merge(array_values($updateData), [$goalId])
            );

            $goal = $this->db->first("SELECT * FROM giving_goals WHERE id = ?", [$goalId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Goal updated successfully',
                'data' => $goal
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update goal: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getFunds(Request $request, Response $response): Response
    {
        try {
            $this->ensureSnapscanTables();
            $funds = $this->getAvailableGivingFunds();

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $funds
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to load giving funds: ' . $e->getMessage()
            ], 500);
        }
    }

    public function createSnapScanPayment(Request $request, Response $response): Response
    {
        $donationId = null;
        try {
            $this->ensureSnapscanTables();
            $userId = (int)($this->getUserId($request) ?? 0);
            $payload = $this->getJsonPayload($request);
            $amount = isset($payload['amount']) ? (float)$payload['amount'] : 0;
            $fundInput = $payload['fund_id'] ?? $payload['fund_name'] ?? null;
            $fundId = is_numeric($fundInput) ? (int)$fundInput : null;

            if ($amount <= 1.00) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Amount must be greater than R1.00'
                ], 422);
            }

            $fundName = $this->resolveFundName($fundInput, null, 'General Giving');
            if ($fundId && $this->hasGivingFundsTable()) {
                $fund = $this->db->first("SELECT id, name FROM giving_funds WHERE id = ?", [$fundId]);
                if (!$fund) {
                    return $this->jsonResponse([
                        'status' => 'error',
                        'message' => 'Invalid fund selected'
                    ], 422);
                }
                $fundName = $fund['name'] ?? $fundName;
            } elseif (!$fundId && is_string($fundInput) && trim($fundInput) !== '') {
                $fundName = $this->resolveFundName($fundInput, null, $fundName);
            }

            $donationUuid = $this->generateUuid();
            $reference = 'SNAP-' . strtoupper(str_replace('-', '', $donationUuid));
            $redirectUrl = $this->buildSnapscanRedirectUrl($donationUuid);
            $webhookUrl = getenv('SNAPSCAN_WEBHOOK_URL') ?: $this->buildDefaultWebhookUrl();
            $description = sprintf('%s donation for %s', $fundName, getenv('APP_NAME') ?: 'Eternal Love Church');

            $donationId = $this->db->insert('snapscan_donations', [
                'donation_uuid' => $donationUuid,
                'user_id' => $userId > 0 ? $userId : null,
                'amount' => number_format($amount, 2, '.', ''),
                'fund_id' => $fundId,
                'status' => 'pending',
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            $snapscanResponse = $this->createSnapscanPaymentLink([
                'amount' => number_format($amount, 2, '.', ''),
                'reference' => $reference,
                'description' => $description,
                'redirect_url' => $redirectUrl,
                'webhook_url' => $webhookUrl,
            ]);

            $paymentUrl = $snapscanResponse['payment_url'] ?? $snapscanResponse['url'] ?? null;
            $transactionId = $snapscanResponse['transaction_id'] ?? $snapscanResponse['id'] ?? $snapscanResponse['payment_id'] ?? null;

            if (!$paymentUrl) {
                $this->db->update('snapscan_donations', [
                    'status' => 'failed',
                    'webhook_payload' => json_encode($snapscanResponse, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                ], 'id = ?', [$donationId]);

                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'SnapScan did not return a payment URL',
                    'data' => $snapscanResponse
                ], 502);
            }

            $this->db->update('snapscan_donations', [
                'snapscan_transaction_id' => $transactionId,
                'snapscan_payment_url' => $paymentUrl,
                'webhook_payload' => json_encode([
                    'create_response' => $snapscanResponse,
                    'reference' => $reference,
                    'redirect_url' => $redirectUrl,
                    'webhook_url' => $webhookUrl,
                    'fund_name' => $fundName,
                ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            ], 'id = ?', [$donationId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'SnapScan payment link created successfully',
                'data' => [
                    'donation_id' => $donationId,
                    'donation_uuid' => $donationUuid,
                    'payment_url' => $paymentUrl,
                    'transaction_id' => $transactionId,
                    'reference' => $reference,
                    'redirect_url' => $redirectUrl,
                    'amount' => (float)number_format($amount, 2, '.', ''),
                    'fund_id' => $fundId,
                    'fund_name' => $fundName,
                ]
            ], 201);
        } catch (Exception $e) {
            if ($donationId) {
                $this->db->update('snapscan_donations', [
                    'status' => 'failed',
                    'webhook_payload' => json_encode([
                        'error' => $e->getMessage(),
                    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                ], 'id = ?', [$donationId]);
            }
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to create SnapScan payment link: ' . $e->getMessage()
            ], 500);
        }
    }

    public function handleSnapScanWebhook(Request $request, Response $response): Response
    {
        $rawBody = (string)$request->getBody();
        $headers = $request->getHeaders();
        $signature = $request->getHeaderLine('X-SnapScan-Signature');
        $logger = new LoggerService();
        $logId = null;

        try {
            $this->ensureSnapscanTables();
            $logId = $this->db->insert('snapscan_webhook_log', [
                'received_at' => date('Y-m-d H:i:s'),
                'raw_headers' => json_encode($headers, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                'raw_body' => $rawBody,
                'processed' => 0,
                'error_message' => null,
            ]);

            if (!$this->verifySnapscanSignature($rawBody, $signature)) {
                $this->markWebhookLog($logId, false, 'Invalid SnapScan signature');
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Invalid signature'
                ], 200);
            }

            $payload = json_decode($rawBody, true);
            if (!is_array($payload)) {
                $this->markWebhookLog($logId, false, 'Invalid JSON payload');
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Invalid JSON payload'
                ], 200);
            }

            $transactionId = $payload['transaction_id'] ?? $payload['id'] ?? $payload['payment_id'] ?? null;
            $donationUuid = $payload['reference'] ?? $payload['donation_uuid'] ?? null;
            $status = strtolower((string)($payload['status'] ?? ''));

            $donation = null;
            if ($transactionId) {
                $donation = $this->db->first(
                    "SELECT * FROM snapscan_donations WHERE snapscan_transaction_id = ? LIMIT 1",
                    [$transactionId]
                );
            }
            if (!$donation && $donationUuid) {
                $donation = $this->db->first(
                    "SELECT * FROM snapscan_donations WHERE donation_uuid = ? LIMIT 1",
                    [$donationUuid]
                );
            }

            if (!$donation) {
                $this->markWebhookLog($logId, true, 'Donation record not found');
                $logger->warning('SnapScan webhook could not be matched to a donation', [
                    'transaction_id' => $transactionId,
                    'reference' => $donationUuid,
                ]);
                return $this->jsonResponse(['status' => 'success'], 200);
            }

            $alreadyCompleted = ($donation['status'] ?? '') === 'completed';
            $completedAt = date('Y-m-d H:i:s');

            $this->db->update('snapscan_donations', [
                'status' => $status === 'completed' ? 'completed' : (($status === 'refunded') ? 'refunded' : (($status === 'failed') ? 'failed' : 'completed')),
                'webhook_received_at' => $completedAt,
                'webhook_payload' => json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                'completed_at' => $status === 'completed' ? $completedAt : ($donation['completed_at'] ?? null),
            ], 'id = ?', [$donation['id']]);

            if ($status === 'completed' && !$alreadyCompleted) {
                $amount = (float)($donation['amount'] ?? 0);
                if (!empty($donation['fund_id']) && $this->hasGivingFundsTable()) {
                    $this->db->query(
                        "UPDATE giving_funds SET current_amount = COALESCE(current_amount, 0) + ? WHERE id = ?",
                        [$amount, $donation['fund_id']]
                    );
                }

                if (!empty($donation['user_id'])) {
                    $this->updateDonorSummary((int)$donation['user_id'], $amount, $completedAt);
                }

                $recipient = $this->resolveDonationRecipient($donation, $payload);
                if (!empty($recipient['email'])) {
                    $sent = $this->sendReceiptEmail($donation, $recipient, false);
                    $this->db->update('snapscan_donations', [
                        'receipt_sent' => $sent ? 1 : 0,
                    ], 'id = ?', [$donation['id']]);
                }
            }

            $this->markWebhookLog($logId, true, null);
            return $this->jsonResponse(['status' => 'success'], 200);
        } catch (Exception $e) {
            if ($logId) {
                $this->markWebhookLog($logId, false, $e->getMessage());
            }
            $logger->error('SnapScan webhook processing failed', [
                'error' => $e->getMessage(),
            ]);

            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Webhook processing failed'
            ], 200);
        }
    }

    public function getDonations(Request $request, Response $response): Response
    {
        try {
            $this->ensureSnapscanTables();
            $userId = (int)($this->getUserId($request) ?? 0);
            $role = (string)($request->getAttribute('role') ?? $request->getAttribute('userRole') ?? '');
            $params = $request->getQueryParams();
            $page = max(1, (int)($params['page'] ?? 1));
            $limit = max(1, min(100, (int)($params['limit'] ?? 20)));
            $offset = ($page - 1) * $limit;

            $filters = [];
            $bindings = [];

            if (!$this->isGivingAdminRole($role)) {
                $filters[] = 'd.user_id = ?';
                $bindings[] = $userId;
            }

            if (!empty($params['fund_id'])) {
                $filters[] = 'd.fund_id = ?';
                $bindings[] = (int)$params['fund_id'];
            }

            if (!empty($params['status'])) {
                $filters[] = 'd.status = ?';
                $bindings[] = $this->sanitizeString((string)$params['status']);
            }

            if (!empty($params['date_from'])) {
                $filters[] = 'DATE(d.created_at) >= ?';
                $bindings[] = $params['date_from'];
            }

            if (!empty($params['date_to'])) {
                $filters[] = 'DATE(d.created_at) <= ?';
                $bindings[] = $params['date_to'];
            }

            if (!empty($params['search'])) {
                $filters[] = '(u.first_name LIKE ? OR u.last_name LIKE ? OR d.donation_uuid LIKE ? OR d.snapscan_transaction_id LIKE ?)';
                $search = '%' . $params['search'] . '%';
                array_push($bindings, $search, $search, $search, $search);
            }

            $whereClause = $filters ? ('WHERE ' . implode(' AND ', $filters)) : '';
            $fundJoin = $this->hasGivingFundsTable()
                ? "LEFT JOIN giving_funds f ON f.id = d.fund_id"
                : "";
            $fundSelect = $this->hasGivingFundsTable()
                ? "f.name AS fund_name, f.description AS fund_description, f.goal_amount, f.current_amount,"
                : "NULL AS fund_name, NULL AS fund_description, NULL AS goal_amount, NULL AS current_amount,";

            $rows = $this->db->all(
                "SELECT
                    d.*,
                    u.first_name,
                    u.last_name,
                    u.email,
                    $fundSelect
                    d.webhook_payload
                 FROM snapscan_donations d
                 LEFT JOIN users u ON u.id = d.user_id
                 $fundJoin
                 $whereClause
                 ORDER BY d.created_at DESC",
                $bindings
            );

            $donations = array_map([$this, 'formatDonationRow'], $rows);
            $legacyDonations = $this->getLegacyGivingRows($params, $userId, $role);
            $combined = array_merge($donations, $legacyDonations);

            usort($combined, function (array $a, array $b): int {
                $dateA = strtotime((string)($a['completed_at'] ?? $a['created_at'] ?? '')) ?: 0;
                $dateB = strtotime((string)($b['completed_at'] ?? $b['created_at'] ?? '')) ?: 0;
                return $dateB <=> $dateA;
            });

            $total = count($combined);
            $combined = array_slice($combined, $offset, $limit);

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $combined,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => (int)ceil($total / $limit),
                ]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to load donations: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getSummary(Request $request, Response $response): Response
    {
        try {
            $this->ensureSnapscanTables();
            $role = (string)($request->getAttribute('role') ?? $request->getAttribute('userRole') ?? '');
            $userId = $this->isGivingAdminRole($role) ? 0 : (int)($this->getUserId($request) ?? 0);
            $summary = [
                'lifetime' => $this->getCombinedGivingTotalsForPeriod($userId, null, null),
                'year' => $this->getCombinedGivingTotalsForPeriod($userId, date('Y-01-01'), date('Y-m-d')),
                'month' => $this->getCombinedGivingTotalsForPeriod($userId, date('Y-m-01'), date('Y-m-d')),
            ];

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $summary
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to load giving summary: ' . $e->getMessage()
            ], 500);
        }
    }

    public function downloadReceipt(Request $request, Response $response, array $args): Response
    {
        try {
            $this->ensureSnapscanTables();
            $donation = $this->getDonationForViewer((int)$args['donation_id'], $request);
            if (!$donation) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Donation not found'
                ], 404);
            }

            $recipient = $this->resolveDonationRecipient($donation, []);
            $html = $this->renderReceiptTemplate($donation, $recipient, true);
            $filename = sprintf('giving-receipt-%s.html', $donation['donation_uuid'] ?? $donation['id']);

            $response->getBody()->write($html);
            return $response
                ->withHeader('Content-Type', 'text/html; charset=utf-8')
                ->withHeader('Content-Disposition', 'attachment; filename="' . $filename . '"');
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to generate receipt: ' . $e->getMessage()
            ], 500);
        }
    }

    public function resendReceipt(Request $request, Response $response, array $args): Response
    {
        try {
            $this->ensureSnapscanTables();
            $role = (string)($request->getAttribute('role') ?? $request->getAttribute('userRole') ?? '');
            if (!$this->isAdminOrFinanceRole($role)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Unauthorized'
                ], 403);
            }

            $donation = $this->getDonationForViewer((int)$args['donation_id'], $request, true);
            if (!$donation) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Donation not found'
                ], 404);
            }

            $recipient = $this->resolveDonationRecipient($donation, []);
            if (empty($recipient['email'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'No email address found for this donation'
                ], 422);
            }

            $sent = $this->sendReceiptEmail($donation, $recipient, true);
            if ($sent) {
                $this->db->update('snapscan_donations', [
                    'receipt_sent' => 1,
                ], 'id = ?', [$donation['id']]);
            }

            return $this->jsonResponse([
                'status' => $sent ? 'success' : 'error',
                'message' => $sent ? 'Receipt email sent' : 'Failed to send receipt email'
            ], $sent ? 200 : 500);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to resend receipt: ' . $e->getMessage()
            ], 500);
        }
    }

    public function recordOffline(Request $request, Response $response): Response
    {
        try {
            $this->ensureSnapscanTables();
            $role = (string)($request->getAttribute('role') ?? $request->getAttribute('userRole') ?? '');
            if (!$this->isAdminOrFinanceRole($role)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Unauthorized'
                ], 403);
            }

            $payload = $this->getJsonPayload($request);
            $amount = isset($payload['amount']) ? (float)$payload['amount'] : 0;
            if ($amount <= 1.00) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Amount must be greater than R1.00'
                ], 422);
            }

            $userId = null;
            if (!empty($payload['user_id'])) {
                $userId = (int)$payload['user_id'];
            } elseif (!empty($payload['member_id'])) {
                $member = $this->db->first("SELECT user_id FROM members WHERE id = ?", [(int)$payload['member_id']]);
                $userId = $member ? (int)($member['user_id'] ?? 0) : null;
            }

            $fundInput = $payload['fund_id'] ?? $payload['fund_name'] ?? null;
            $fundId = is_numeric($fundInput) ? (int)$fundInput : null;
            $fundName = $this->resolveFundName($fundInput, null, 'General Giving');
            if ($fundId && $this->hasGivingFundsTable()) {
                $fund = $this->db->first("SELECT id, name FROM giving_funds WHERE id = ?", [$fundId]);
                if ($fund) {
                    $fundName = $fund['name'] ?? $fundName;
                }
            } elseif (!$fundId && is_string($fundInput) && trim($fundInput) !== '') {
                $fundName = $this->resolveFundName($fundInput, null, $fundName);
            }

            $donationUuid = $this->generateUuid();
            $donationId = $this->db->insert('snapscan_donations', [
                'donation_uuid' => $donationUuid,
                'user_id' => $userId,
                'amount' => number_format($amount, 2, '.', ''),
                'fund_id' => $fundId,
                'status' => 'completed',
                'snapscan_transaction_id' => 'offline-' . strtoupper(str_replace('-', '', $donationUuid)),
                'snapscan_payment_url' => null,
                'webhook_received_at' => date('Y-m-d H:i:s'),
                'webhook_payload' => json_encode([
                    'source' => 'offline',
                    'payment_method' => $payload['payment_method'] ?? 'cash',
                    'notes' => $payload['notes'] ?? null,
                ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                'created_at' => date('Y-m-d H:i:s'),
                'completed_at' => date('Y-m-d H:i:s'),
                'receipt_sent' => 0,
            ]);

            if ($fundId && $this->hasGivingFundsTable()) {
                $this->db->query(
                    "UPDATE giving_funds SET current_amount = COALESCE(current_amount, 0) + ? WHERE id = ?",
                    [$amount, $fundId]
                );
            }

            if (!empty($userId)) {
                $this->updateDonorSummary($userId, $amount, date('Y-m-d H:i:s'));
            }

            $donation = $this->getDonationRowById($donationId);

            if ($this->isOfflineFallbackMode()) {
                $this->queueOfflineSyncOperation('snapscan_offline_gift', [
                    'donation_row' => $donation ?: [],
                    'amount' => $amount,
                    'fund_id' => $fundId,
                    'user_id' => $userId,
                    'completed_at' => $donation['completed_at'] ?? date('Y-m-d H:i:s'),
                ]);
            }

            $recipient = $this->resolveDonationRecipient($donation ?: [], $payload);
            if (!empty($recipient['email'])) {
                $sent = $this->sendReceiptEmail($donation ?: [], $recipient, false);
                if ($sent) {
                    $this->db->update('snapscan_donations', ['receipt_sent' => 1], 'id = ?', [$donationId]);
                }
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Offline gift recorded',
                'data' => [
                    'donation_id' => $donationId,
                    'donation_uuid' => $donationUuid,
                    'fund_name' => $fundName,
                ]
            ], 201);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to record offline gift: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getTrends(Request $request, Response $response): Response
    {
        try {
            $period = strtolower((string)($request->getQueryParams()['period'] ?? '6months'));
            $months = match ($period) {
                '3months' => 3,
                '6months' => 6,
                'year' => 12,
                default => 6,
            };

            $dbConnection = $this->db->getDriver() === 'sqlite' ? 'sqlite' : 'mysql';
            $dateExpression = $dbConnection === 'sqlite'
                ? "strftime('%Y-%m', COALESCE(completed_at, created_at))"
                : "DATE_FORMAT(COALESCE(completed_at, created_at), '%Y-%m')";
            $dateFilter = $dbConnection === 'sqlite'
                ? "COALESCE(completed_at, created_at) >= date('now', '-{$months} months')"
                : "COALESCE(completed_at, created_at) >= DATE_SUB(NOW(), INTERVAL {$months} MONTH)";

            $role = (string)($request->getAttribute('role') ?? $request->getAttribute('userRole') ?? '');
            $userId = $this->isGivingAdminRole($role) ? 0 : (int)($this->getUserId($request) ?? 0);
            $rows = $this->getCombinedMonthlyTotals($months, $userId);

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $rows
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get giving trends: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getProjections(Request $request, Response $response): Response
    {
        try {
            $period = strtolower((string)($request->getQueryParams()['period'] ?? 'year'));
            $months = match ($period) {
                '6months' => 6,
                'year' => 12,
                '2years' => 24,
                default => 12,
            };

            $role = (string)($request->getAttribute('role') ?? $request->getAttribute('userRole') ?? '');
            $userId = $this->isGivingAdminRole($role) ? 0 : (int)($this->getUserId($request) ?? 0);
            $history = $this->getCombinedMonthlyTotals($months, $userId);

            $totals = array_map(fn($row) => (float)($row['total'] ?? 0), $history);
            $average = count($totals) ? array_sum($totals) / count($totals) : 0;

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'period' => $period,
                    'months' => $months,
                    'monthly_average' => round($average, 2),
                    'projection_next_month' => round($average, 2),
                    'projection_next_year' => round($average * 12, 2),
                    'history' => $history,
                ]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get giving projections: ' . $e->getMessage()
            ], 500);
        }
    }

    public function processGooglePay(Request $request, Response $response): Response
    {
        try {
            $this->ensureSnapscanTables();
            $payload = $this->getJsonPayload($request);

            $paymentToken = $payload['payment_token'] ?? null;
            $amount       = isset($payload['amount']) ? (float)$payload['amount'] : 0;
            $fund         = isset($payload['fund'])   ? $this->sanitizeString((string)$payload['fund'])   : 'General Giving';
            $donorName    = isset($payload['donor_name'])  ? $this->sanitizeString((string)$payload['donor_name'])  : 'Anonymous';
            $donorEmail   = isset($payload['donor_email']) ? filter_var($payload['donor_email'], FILTER_SANITIZE_EMAIL) : null;

            // Resolve authenticated user from optional JWT (public endpoint, auth not required)
            $userId = null;
            $userPhone = null;
            $authHeader = $request->getHeaderLine('Authorization');
            if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
                $token = substr($authHeader, 7);
                try {
                    $jwtSecret = getenv('JWT_SECRET') ?: '';
                    $parts = explode('.', $token);
                    if (count($parts) === 3) {
                        $decoded = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
                        if (is_array($decoded) && !empty($decoded['sub'])) {
                            $userId = (int)$decoded['sub'];
                            $user = $this->db->first(
                                "SELECT id, first_name, last_name, email, phone FROM users WHERE id = ?",
                                [$userId]
                            );
                            if ($user) {
                                if (empty($donorName) || $donorName === 'Anonymous') {
                                    $donorName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')) ?: 'Anonymous';
                                }
                                if (empty($donorEmail)) {
                                    $donorEmail = $user['email'] ?? null;
                                }
                                $userPhone = $user['phone'] ?? null;
                            }
                        }
                    }
                } catch (\Throwable $e) {
                    // Invalid token — proceed as guest
                    $userId = null;
                }
            }

            if (!$paymentToken) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Payment token is required'], 400);
            }

            if ($amount < 10.00) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Minimum donation amount is R10.00'], 422);
            }

            $stripeKey = getenv('STRIPE_SECRET_KEY');
            if (!$stripeKey) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Payment processing is not configured'], 500);
            }

            // Google Pay via Stripe tokenization returns a Stripe token JSON string
            $tokenId = null;
            if (is_array($paymentToken)) {
                $tokenId = $paymentToken['id'] ?? null;
            } elseif (is_string($paymentToken)) {
                $decoded = json_decode($paymentToken, true);
                $tokenId = is_array($decoded) ? ($decoded['id'] ?? $paymentToken) : $paymentToken;
            }

            if (!$tokenId) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Invalid payment token'], 400);
            }

            $amountCents = (int)round($amount * 100);
            $description = sprintf('%s donation for %s', $fund, getenv('APP_NAME') ?: 'Eternal Love Church');

            $chargeResult = $this->stripeRequest('POST', '/v1/charges', [
                'amount'      => $amountCents,
                'currency'    => 'zar',
                'source'      => $tokenId,
                'description' => $description,
                'metadata'    => [
                    'fund'        => $fund,
                    'donor_name'  => $donorName,
                    'donor_email' => $donorEmail ?? '',
                    'source'      => 'google_pay',
                ],
            ], $stripeKey);

            if (isset($chargeResult['error'])) {
                $errMsg = $chargeResult['error']['message'] ?? 'Payment declined';
                $statusCode = ($chargeResult['error']['type'] ?? '') === 'card_error' ? 402 : 500;
                return $this->jsonResponse(['status' => 'error', 'message' => $errMsg], $statusCode);
            }

            if (($chargeResult['status'] ?? '') !== 'succeeded') {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Payment was not completed'], 402);
            }

            $chargeId = $chargeResult['id'];

            $fundId = null;
            if ($this->hasGivingFundsTable()) {
                $fundRow = $this->db->first("SELECT id FROM giving_funds WHERE LOWER(name) = LOWER(?)", [$fund]);
                $fundId  = $fundRow ? (int)$fundRow['id'] : null;
            }

            $donationUuid = $this->generateUuid();
            $now          = date('Y-m-d H:i:s');

            $donationId = $this->db->insert('snapscan_donations', [
                'donation_uuid'            => $donationUuid,
                'user_id'                  => $userId,
                'amount'                   => number_format($amount, 2, '.', ''),
                'fund_id'                  => $fundId,
                'status'                   => 'completed',
                'snapscan_transaction_id'  => $chargeId,
                'webhook_received_at'      => $now,
                'webhook_payload'          => json_encode([
                    'source'           => 'google_pay',
                    'payment_method'   => 'google_pay',
                    'fund_name'        => $fund,
                    'donor_name'       => $donorName,
                    'donor_email'      => $donorEmail,
                    'stripe_charge_id' => $chargeId,
                ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                'created_at'               => $now,
                'completed_at'             => $now,
                'receipt_sent'             => 0,
            ]);

            if ($fundId && $this->hasGivingFundsTable()) {
                $this->db->query(
                    "UPDATE giving_funds SET current_amount = COALESCE(current_amount, 0) + ? WHERE id = ?",
                    [$amount, $fundId]
                );
            }

            if ($userId) {
                $this->updateDonorSummary($userId, $amount, $now);
            }

            // Send email receipt
            $donation = $this->getDonationRowById($donationId);
            $recipientEmail = $donorEmail ?: ($donation['email'] ?? null);
            $recipientName  = $donorName  ?: ($donation['member_name'] ?? 'Partner');
            if ($recipientEmail && $donation) {
                $recipient = [
                    'name'       => $recipientName,
                    'email'      => $recipientEmail,
                    'first_name' => $donation['first_name'] ?? '',
                    'last_name'  => $donation['last_name']  ?? '',
                ];
                $emailSent = $this->sendReceiptEmail($donation, $recipient, false);
                if ($emailSent) {
                    $this->db->update('snapscan_donations', ['receipt_sent' => 1], 'id = ?', [$donationId]);
                }
            }

            // Send WhatsApp confirmation
            $whatsapp = new WhatsAppService();
            $phoneToNotify = $userPhone ?? ($payload['donor_phone'] ?? null);
            if ($phoneToNotify && $whatsapp->isConfigured()) {
                $formattedAmount = 'R' . number_format($amount, 2);
                $message = "✅ *Donation Confirmed — Eternal Love Church*\n\n"
                    . "Thank you, {$donorName}! Your generous gift has been received.\n\n"
                    . "💳 *Amount:* {$formattedAmount}\n"
                    . "🙏 *Fund:* {$fund}\n"
                    . "📅 *Date:* " . date('d M Y') . "\n"
                    . "🔖 *Ref:* " . strtoupper(substr($donationUuid, 0, 8)) . "\n\n"
                    . "_\"Each of you should give what you have decided in your heart to give.\" — 2 Cor 9:7_\n\n"
                    . "God bless you! 🙌";
                $whatsapp->send([['phone' => $phoneToNotify]], $message);
            }

            return $this->jsonResponse([
                'status'  => 'success',
                'message' => 'Thank you for your generous gift!',
                'data'    => [
                    'donation_id'   => $donationId,
                    'donation_uuid' => $donationUuid,
                    'amount'        => $amount,
                    'fund'          => $fund,
                    'charge_id'     => $chargeId,
                ],
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status'  => 'error',
                'message' => 'Failed to process donation: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function stripeRequest(string $method, string $path, array $body, string $secretKey): array
    {
        $url = 'https://api.stripe.com' . $path;

        // Stripe API uses form-encoded for most endpoints
        $encoded = http_build_query($this->flattenStripeParams($body));

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST  => strtoupper($method),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $secretKey,
                'Content-Type: application/x-www-form-urlencoded',
                'Stripe-Version: 2023-10-16',
            ],
            CURLOPT_POSTFIELDS     => $encoded,
            CURLOPT_TIMEOUT        => 30,
        ]);

        $responseBody = curl_exec($ch);
        $curlError    = curl_error($ch);
        curl_close($ch);

        if ($responseBody === false) {
            throw new Exception('Stripe request failed: ' . $curlError);
        }

        $decoded = json_decode((string)$responseBody, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function flattenStripeParams(array $params, string $prefix = ''): array
    {
        $result = [];
        foreach ($params as $key => $value) {
            $fullKey = $prefix !== '' ? "{$prefix}[{$key}]" : $key;
            if (is_array($value)) {
                $result = array_merge($result, $this->flattenStripeParams($value, $fullKey));
            } else {
                $result[$fullKey] = $value;
            }
        }
        return $result;
    }

    private function getJsonPayload(Request $request): array
    {
        $payload = json_decode((string)$request->getBody(), true);
        return is_array($payload) ? $payload : [];
    }

    private function isGivingAdminRole(?string $role): bool
    {
        return in_array($role, ['admin', 'pastor', 'superadmin', 'finance_admin'], true);
    }

    private function isAdminOrFinanceRole(?string $role): bool
    {
        return in_array($role, ['admin', 'superadmin', 'finance_admin'], true);
    }

    private function getGivingTotalsForPeriod(int $userId, ?string $startDate, ?string $endDate): array
    {
        $sql = "SELECT
                    COALESCE(SUM(amount), 0) AS total_given,
                    COUNT(*) AS donation_count
                FROM snapscan_donations
                WHERE status = 'completed'";
        $params = [];

        if ($userId > 0) {
            $sql .= " AND user_id = ?";
            $params[] = $userId;
        }

        if ($startDate) {
            $sql .= " AND DATE(completed_at) >= ?";
            $params[] = $startDate;
        }

        if ($endDate) {
            $sql .= " AND DATE(completed_at) <= ?";
            $params[] = $endDate;
        }

        $row = $this->db->first($sql, $params) ?: [];
        return [
            'total_given' => (float)($row['total_given'] ?? 0),
            'donation_count' => (int)($row['donation_count'] ?? 0),
        ];
    }

    private function getCombinedGivingTotalsForPeriod(int $userId, ?string $startDate, ?string $endDate): array
    {
        $snapscan = $this->getGivingTotalsForPeriod($userId, $startDate, $endDate);
        $legacy = $this->getLegacyGivingTotalsForPeriod($userId, $startDate, $endDate);

        return [
            'total_given' => round((float)$snapscan['total_given'] + (float)$legacy['total_given'], 2),
            'donation_count' => (int)$snapscan['donation_count'] + (int)$legacy['donation_count'],
        ];
    }

    private function getLegacyGivingTotalsForPeriod(int $userId, ?string $startDate, ?string $endDate): array
    {
        if (!$this->hasLegacyGivingTable()) {
            return [
                'total_given' => 0.0,
                'donation_count' => 0,
            ];
        }

        $sql = "SELECT
                    COALESCE(SUM(amount), 0) AS total_given,
                    COUNT(*) AS donation_count
                FROM giving
                WHERE 1 = 1";
        $params = [];

        if ($userId > 0) {
            $sql .= " AND user_id = ?";
            $params[] = $userId;
        }

        if ($startDate) {
            $sql .= " AND DATE(COALESCE(service_date, created_at)) >= ?";
            $params[] = $startDate;
        }

        if ($endDate) {
            $sql .= " AND DATE(COALESCE(service_date, created_at)) <= ?";
            $params[] = $endDate;
        }

        $row = $this->db->first($sql, $params) ?: [];

        return [
            'total_given' => (float)($row['total_given'] ?? 0),
            'donation_count' => (int)($row['donation_count'] ?? 0),
        ];
    }

    private function getCombinedMonthlyTotals(int $months, int $userId = 0): array
    {
        $totals = [];
        $periodStart = (new \DateTimeImmutable('first day of this month'))->modify('-' . max(0, $months - 1) . ' months');
        $periodStartString = $periodStart->format('Y-m-d');

        $dbConnection = $this->db->getDriver() === 'sqlite' ? 'sqlite' : 'mysql';
        $snapscanDateExpression = $dbConnection === 'sqlite'
            ? "strftime('%Y-%m', COALESCE(completed_at, created_at))"
            : "DATE_FORMAT(COALESCE(completed_at, created_at), '%Y-%m')";
        $snapscanDateFilter = $dbConnection === 'sqlite'
            ? "COALESCE(completed_at, created_at) >= date('now', '-" . max(0, $months - 1) . " months', 'start of month')"
            : "COALESCE(completed_at, created_at) >= ?";

        $snapscanSql = "SELECT {$snapscanDateExpression} as period, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
                        FROM snapscan_donations
                        WHERE status = 'completed' AND {$snapscanDateFilter}";
        $snapscanParams = [];
        if ($dbConnection !== 'sqlite') {
            $snapscanParams[] = $periodStartString;
        }
        if ($userId > 0) {
            $snapscanSql .= " AND user_id = ?";
            $snapscanParams[] = $userId;
        }
        $snapscanSql .= " GROUP BY {$snapscanDateExpression} ORDER BY period ASC";

        foreach ($this->db->all($snapscanSql, $snapscanParams) as $row) {
            $period = (string)($row['period'] ?? '');
            if ($period === '') {
                continue;
            }
            $totals[$period] = [
                'month' => $period,
                'total' => (float)($row['total'] ?? 0),
                'count' => (int)($row['count'] ?? 0),
            ];
        }

        if ($this->hasLegacyGivingTable()) {
            $legacyDateExpression = $dbConnection === 'sqlite'
                ? "strftime('%Y-%m', COALESCE(service_date, created_at))"
                : "DATE_FORMAT(COALESCE(service_date, created_at), '%Y-%m')";
            $legacyRows = $this->db->all(
                "SELECT
                    {$legacyDateExpression} as period,
                    COALESCE(SUM(amount), 0) as total,
                    COUNT(*) as count
                 FROM giving
                 WHERE COALESCE(service_date, created_at) >= ?" . ($userId > 0 ? " AND user_id = ?" : "") . "
                 GROUP BY {$legacyDateExpression}
                 ORDER BY period ASC",
                $userId > 0 ? [$periodStartString, $userId] : [$periodStartString]
            );

            foreach ($legacyRows as $row) {
                $period = (string)($row['period'] ?? '');
                if ($period === '') {
                    continue;
                }
                if (!isset($totals[$period])) {
                    $totals[$period] = [
                        'month' => $period,
                        'total' => 0.0,
                        'count' => 0,
                    ];
                }
                $totals[$period]['total'] += (float)($row['total'] ?? 0);
                $totals[$period]['count'] += (int)($row['count'] ?? 0);
            }
        }

        ksort($totals);

        return array_map(static function (array $row): array {
            $count = (int)($row['count'] ?? 0);
            $total = (float)($row['total'] ?? 0);
            return [
                'month' => $row['month'],
                'period' => $row['month'],
                'total' => round($total, 2),
                'count' => $count,
                'average' => $count > 0 ? round($total / $count, 2) : 0.0,
            ];
        }, array_values($totals));
    }

    private function buildSnapscanRedirectUrl(string $donationUuid): string
    {
        $baseUrl = getenv('SNAPSCAN_REDIRECT_URL') ?: (getenv('FRONTEND_URL') ?: (defined('APP_URL') ? APP_URL : 'https://elchurch.site'));
        $separator = str_contains($baseUrl, '?') ? '&' : '?';
        return $baseUrl . $separator . http_build_query([
            'snapscan' => 'success',
            'donation_uuid' => $donationUuid,
        ]);
    }

    private function buildDefaultWebhookUrl(): string
    {
        $baseUrl = getenv('API_URL') ?: (defined('API_URL') ? API_URL : 'https://api.elchurch.site');
        return rtrim($baseUrl, '/') . '/api/snapscan/webhook';
    }

    private function createSnapscanPaymentLink(array $body): array
    {
        $snapcode = getenv('SNAPSCAN_SNAPCODE') ?: '';
        $apiKey = getenv('SNAPSCAN_API_KEY') ?: '';

        if ($snapcode === '' || $apiKey === '') {
            throw new Exception('SnapScan environment variables are not configured');
        }

        $url = 'https://api.snapscan.co.za/v1/merchants/' . rawurlencode($snapcode) . '/payments';
        $result = $this->httpJsonRequest('POST', $url, $body, [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json',
            'Accept: application/json',
        ]);

        $decoded = json_decode($result['body'] ?? '', true);
        if (!is_array($decoded)) {
            throw new Exception('SnapScan response was not valid JSON');
        }

        if (($result['status'] ?? 0) >= 400) {
            $message = $decoded['message'] ?? $decoded['error'] ?? 'SnapScan payment creation failed';
            throw new Exception($message);
        }

        return $decoded;
    }

    private function verifySnapscanSignature(string $rawBody, ?string $signatureHeader): bool
    {
        $token = getenv('SNAPSCAN_CALLBACK_TOKEN') ?: '';
        if ($token === '' || $signatureHeader === null || trim($signatureHeader) === '') {
            return false;
        }

        $provided = trim($signatureHeader);
        if (str_starts_with($provided, 'sha256=')) {
            $provided = substr($provided, 7);
        }

        $expectedHex = hash_hmac('sha256', $rawBody, $token);
        $expectedBase64 = base64_encode(hash_hmac('sha256', $rawBody, $token, true));

        return hash_equals($expectedHex, $provided) || hash_equals($expectedBase64, $provided);
    }

    private function httpJsonRequest(string $method, string $url, array $body = [], array $headers = []): array
    {
        $ch = curl_init($url);
        $payload = json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => strtoupper($method),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_POSTFIELDS => $payload,
        ]);

        $responseBody = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($responseBody === false) {
            throw new Exception('HTTP request failed: ' . $error);
        }

        return [
            'status' => $status,
            'body' => $responseBody,
        ];
    }

    private function markWebhookLog(int $logId, bool $processed, ?string $errorMessage): void
    {
        $this->db->update('snapscan_webhook_log', [
            'processed' => $processed ? 1 : 0,
            'error_message' => $errorMessage,
        ], 'id = ?', [$logId]);
    }

    private function formatDonationRow(array $row): array
    {
        $donorName = trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? ''));
        $payload = $this->decodeDonationPayload($row['webhook_payload'] ?? null);
        $fundName = $row['fund_name'] ?? ($payload['fund_name'] ?? null);
        if (!$fundName) {
            $fundName = $this->resolveFundName($row['fund_id'] ?? null, $payload, 'General Giving');
        }
        return [
            'id' => (int)($row['id'] ?? 0),
            'donation_uuid' => $row['donation_uuid'] ?? null,
            'user_id' => isset($row['user_id']) ? (int)$row['user_id'] : null,
            'amount' => (float)($row['amount'] ?? 0),
            'fund_id' => isset($row['fund_id']) ? (int)$row['fund_id'] : null,
            'fund_name' => $fundName,
            'fund_description' => $row['fund_description'] ?? null,
            'status' => $row['status'] ?? 'pending',
            'snapscan_transaction_id' => $row['snapscan_transaction_id'] ?? null,
            'snapscan_payment_url' => $row['snapscan_payment_url'] ?? null,
            'webhook_received_at' => $row['webhook_received_at'] ?? null,
            'created_at' => $row['created_at'] ?? null,
            'completed_at' => $row['completed_at'] ?? null,
            'receipt_sent' => (int)($row['receipt_sent'] ?? 0),
            'member_name' => $donorName ?: 'Anonymous',
            'member_email' => $row['email'] ?? null,
            'payment_method' => $payload['payment_method'] ?? 'snapscan',
            'source' => $payload['source'] ?? 'snapscan',
            'entry_source' => $payload['entry_source'] ?? null,
            'service_date' => $payload['service_date'] ?? null,
        ];
    }

    private function formatLegacyGivingRow(array $row): array
    {
        $memberName = trim((string)($row['donor_name'] ?? ''));
        if ($memberName === '') {
            $memberName = trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? ''));
        }

        $createdAt = $row['created_at'] ?? null;
        $completedAt = $row['service_date'] ?? $createdAt;
        $entrySource = $row['entry_source'] ?? null;
        $source = $entrySource === 'sunday_service' ? 'usher_checkin' : 'legacy_giving';

        return [
            'id' => 'legacy-' . (int)($row['id'] ?? 0),
            'legacy_id' => (int)($row['id'] ?? 0),
            'donation_uuid' => $row['receipt_number'] ?? $row['transaction_id'] ?? ('LEGACY-' . (int)($row['id'] ?? 0)),
            'user_id' => isset($row['user_id']) ? (int)$row['user_id'] : null,
            'amount' => (float)($row['amount'] ?? 0),
            'fund_id' => null,
            'fund_name' => $row['fund'] ?? 'General Giving',
            'fund_description' => null,
            'status' => 'completed',
            'snapscan_transaction_id' => null,
            'snapscan_payment_url' => null,
            'webhook_received_at' => null,
            'created_at' => $createdAt,
            'completed_at' => $completedAt,
            'receipt_sent' => 0,
            'member_name' => $memberName ?: 'Anonymous',
            'member_email' => $row['donor_email'] ?? $row['email'] ?? null,
            'payment_method' => $row['payment_method'] ?? 'cash',
            'source' => $source,
            'entry_source' => $entrySource,
            'service_date' => $row['service_date'] ?? null,
            'notes' => $row['notes'] ?? null,
        ];
    }

    private function hasLegacyGivingTable(): bool
    {
        return $this->tableHasColumn('giving', 'id');
    }

    private function getLegacyGivingRows(array $params, int $userId, ?string $role): array
    {
        if (!$this->hasLegacyGivingTable()) {
            return [];
        }

        $sql = "SELECT g.*, u.first_name, u.last_name, u.email
                FROM giving g
                LEFT JOIN users u ON u.id = g.user_id
                WHERE 1 = 1";
        $bindings = [];

        if (!$this->isGivingAdminRole($role)) {
            $sql .= " AND g.user_id = ?";
            $bindings[] = $userId;
        }

        if (!empty($params['fund_id'])) {
            $fundName = $this->resolveFundName($params['fund_id'], null, '');
            if ($fundName !== '') {
                $sql .= " AND g.fund = ?";
                $bindings[] = $fundName;
            }
        }

        if (!empty($params['status'])) {
            $status = strtolower((string)$params['status']);
            if ($status !== 'completed') {
                return [];
            }
        }

        if (!empty($params['date_from'])) {
            $sql .= " AND DATE(COALESCE(g.service_date, g.created_at)) >= ?";
            $bindings[] = $params['date_from'];
        }

        if (!empty($params['date_to'])) {
            $sql .= " AND DATE(COALESCE(g.service_date, g.created_at)) <= ?";
            $bindings[] = $params['date_to'];
        }

        if (!empty($params['search'])) {
            $search = '%' . $params['search'] . '%';
            $sql .= " AND (g.donor_name LIKE ? OR g.donor_email LIKE ? OR g.fund LIKE ? OR g.transaction_id LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)";
            array_push($bindings, $search, $search, $search, $search, $search, $search);
        }

        $sql .= " ORDER BY COALESCE(g.service_date, g.created_at) DESC";

        return array_map([$this, 'formatLegacyGivingRow'], $this->db->all($sql, $bindings));
    }

    private function getDonationForViewer(int $donationId, Request $request, bool $allowAllAdmin = false): ?array
    {
        $role = (string)($request->getAttribute('role') ?? $request->getAttribute('userRole') ?? '');
        $userId = (int)($this->getUserId($request) ?? 0);
        $donation = $this->getDonationRowById($donationId);

        if (!$donation) {
            return null;
        }

        if ($allowAllAdmin || $this->isGivingAdminRole($role)) {
            return $donation;
        }

        if ((int)($donation['user_id'] ?? 0) !== $userId) {
            return null;
        }

        return $donation;
    }

    private function resolveDonationRecipient(array $donation, array $payload = []): array
    {
        $recipient = [
            'first_name' => $donation['first_name'] ?? $payload['donor_first_name'] ?? '',
            'last_name' => $donation['last_name'] ?? $payload['donor_last_name'] ?? '',
            'name' => trim(($donation['first_name'] ?? '') . ' ' . ($donation['last_name'] ?? '')) ?: ($payload['donor_name'] ?? 'Partner'),
            'email' => $donation['email'] ?? $payload['donor_email'] ?? $payload['customer_email'] ?? null,
        ];

        return $recipient;
    }

    private function updateDonorSummary(int $userId, float $amount, string $completedAt): void
    {
        if ($this->tableHasColumn('users', 'total_given')) {
            $this->db->query(
                "UPDATE users
                 SET total_given = COALESCE(total_given, 0) + ?,
                     last_gift_date = ?
                 WHERE id = ?",
                [$amount, $completedAt, $userId]
            );
            return;
        }

        if ($this->tableHasColumn('members', 'total_given')) {
            $this->db->query(
                "UPDATE members
                 SET total_given = COALESCE(total_given, 0) + ?,
                     last_gift_date = ?
                 WHERE user_id = ?",
                [$amount, $completedAt, $userId]
            );
        }
    }

    private function sendReceiptEmail(array $donation, array $recipient, bool $isResend = false): bool
    {
        if (empty($recipient['email'])) {
            return false;
        }

        try {
            $mailer = SMTPConfigService::createFreshMailer();
            $mailer->addAddress($recipient['email'], $recipient['name'] ?? '');
            $mailer->isHTML(true);
            $mailer->Subject = $isResend
                ? 'Your SnapScan donation receipt'
                : 'Thank you for your donation';

            $mailer->Body = $this->renderReceiptTemplate($donation, $recipient, true);
            $mailer->AltBody = $this->renderReceiptTemplate($donation, $recipient, false);

            return $mailer->send();
        } catch (Exception $e) {
            (new LoggerService())->error('Failed to send donation receipt', [
                'error' => $e->getMessage(),
                'email' => $recipient['email'] ?? null,
            ]);
            return false;
        }
    }

    private function renderReceiptTemplate(array $donation, array $recipient, bool $html = true): string
    {
        $template = dirname(__DIR__, 2) . '/templates/emails/snapscan_receipt.' . ($html ? 'html.php' : 'txt.php');
        if (!file_exists($template)) {
            return $html
                ? '<p>Receipt template unavailable.</p>'
                : 'Receipt template unavailable.';
        }

        ob_start();
        $included = include $template;
        $output = ob_get_clean();

        if ($html) {
            return is_string($output) && trim($output) !== ''
                ? $output
                : (is_string($included) ? $included : '');
        }

        if (is_string($output) && trim($output) !== '') {
            return trim($output);
        }

        return is_string($included) ? trim($included) : '';
    }

    private function ensureSnapscanTables(): void
    {
        try {
            if ($this->db->getDriver() === 'sqlite') {
                $this->db->query(
                    "CREATE TABLE IF NOT EXISTS giving_funds (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE,
                        description TEXT NULL,
                        goal_amount NUMERIC NULL DEFAULT 0,
                        current_amount NUMERIC NULL DEFAULT 0,
                        is_active INTEGER NOT NULL DEFAULT 1,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )"
                );

                $this->db->query(
                    "INSERT INTO giving_funds (name, description, goal_amount, current_amount, is_active)
                     SELECT 'General Giving', 'Default church giving fund', 0, 0, 1
                     WHERE NOT EXISTS (
                         SELECT 1 FROM giving_funds WHERE name = 'General Giving'
                     )"
                );

                $this->db->query(
                    "CREATE TABLE IF NOT EXISTS snapscan_donations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        donation_uuid TEXT NOT NULL UNIQUE,
                        user_id INTEGER NULL,
                        amount NUMERIC NOT NULL,
                        fund_id INTEGER NULL,
                        status TEXT NOT NULL DEFAULT 'pending',
                        snapscan_transaction_id TEXT NULL UNIQUE,
                        snapscan_payment_url TEXT NULL,
                        webhook_received_at DATETIME NULL,
                        webhook_payload TEXT NULL,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        completed_at DATETIME NULL,
                        receipt_sent INTEGER NOT NULL DEFAULT 0
                    )"
                );

                $this->db->query(
                    "CREATE TABLE IF NOT EXISTS snapscan_webhook_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        raw_headers TEXT NOT NULL,
                        raw_body TEXT NOT NULL,
                        processed INTEGER NOT NULL DEFAULT 0,
                        error_message TEXT NULL
                    )"
                );

                return;
            }

            $this->db->query(
                "CREATE TABLE IF NOT EXISTS giving_funds (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(150) NOT NULL,
                    description TEXT NULL,
                    goal_amount DECIMAL(10,2) NULL DEFAULT 0.00,
                    current_amount DECIMAL(10,2) NULL DEFAULT 0.00,
                    is_active TINYINT(1) NOT NULL DEFAULT 1,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_giving_funds_name (name),
                    KEY idx_giving_funds_is_active (is_active)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
            );

            $this->db->query(
                "INSERT INTO giving_funds (name, description, goal_amount, current_amount, is_active)
                 SELECT 'General Giving', 'Default church giving fund', 0.00, 0.00, 1
                 WHERE NOT EXISTS (
                     SELECT 1 FROM giving_funds WHERE name = 'General Giving'
                 )"
            );

            $this->db->query(
                "CREATE TABLE IF NOT EXISTS snapscan_donations (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    donation_uuid VARCHAR(36) NOT NULL,
                    user_id INT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    fund_id INT NULL,
                    status ENUM('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
                    snapscan_transaction_id VARCHAR(255) NULL,
                    snapscan_payment_url TEXT NULL,
                    webhook_received_at DATETIME NULL,
                    webhook_payload LONGTEXT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    completed_at DATETIME NULL,
                    receipt_sent TINYINT(1) NOT NULL DEFAULT 0,
                    UNIQUE KEY uq_snapscan_donation_uuid (donation_uuid),
                    UNIQUE KEY uq_snapscan_transaction_id (snapscan_transaction_id),
                    KEY idx_snapscan_donations_user_id (user_id),
                    KEY idx_snapscan_donations_status (status),
                    KEY idx_snapscan_donations_fund_id (fund_id),
                    KEY idx_snapscan_donations_created_at (created_at),
                    KEY idx_snapscan_donations_completed_at (completed_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
            );

            $this->db->query(
                "CREATE TABLE IF NOT EXISTS snapscan_webhook_log (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    raw_headers LONGTEXT NOT NULL,
                    raw_body LONGTEXT NOT NULL,
                    processed TINYINT(1) NOT NULL DEFAULT 0,
                    error_message TEXT NULL,
                    KEY idx_snapscan_webhook_log_received_at (received_at),
                    KEY idx_snapscan_webhook_log_processed (processed)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
            );
        } catch (Exception $e) {
            throw new Exception('Failed to initialize SnapScan tables: ' . $e->getMessage());
        }
    }

    private function hasGivingFundsTable(): bool
    {
        return $this->tableHasColumn('giving_funds', 'id');
    }

    private function getAvailableGivingFunds(): array
    {
        if ($this->hasGivingFundsTable()) {
            return $this->db->all(
                "SELECT id, name, description, goal_amount, current_amount
                 FROM giving_funds
                 WHERE is_active = 1 OR is_active IS NULL
                 ORDER BY name ASC"
            );
        }

        $funds = [];
        $sources = [
            $this->db->all("SELECT DISTINCT fund AS name FROM giving WHERE fund IS NOT NULL AND TRIM(fund) <> '' ORDER BY fund ASC"),
            $this->db->all("SELECT DISTINCT fund AS name FROM giving_goals WHERE fund IS NOT NULL AND TRIM(fund) <> '' ORDER BY fund ASC"),
        ];

        foreach ($sources as $rows) {
            foreach ($rows as $row) {
                $name = trim((string)($row['name'] ?? ''));
                if ($name === '') {
                    continue;
                }
                $funds[$name] = [
                    'id' => $name,
                    'name' => $name,
                    'description' => null,
                    'goal_amount' => 0,
                    'current_amount' => 0,
                ];
            }
        }

        if (!isset($funds['General Giving'])) {
            $funds['General Giving'] = [
                'id' => 'General Giving',
                'name' => 'General Giving',
                'description' => 'Default giving bucket',
                'goal_amount' => 0,
                'current_amount' => 0,
            ];
        }

        return array_values($funds);
    }

    private function resolveFundName($fundInput, ?array $payload = null, string $default = 'General Giving'): string
    {
        if (is_array($payload) && !empty($payload['fund_name'])) {
            return $this->sanitizeString((string)$payload['fund_name']);
        }

        if (is_array($fundInput)) {
            $name = $fundInput['name'] ?? $fundInput['fund'] ?? $default;
            return $this->sanitizeString((string)$name);
        }

        if (is_numeric($fundInput) && $this->hasGivingFundsTable()) {
            $fund = $this->db->first("SELECT name FROM giving_funds WHERE id = ?", [(int)$fundInput]);
            if ($fund && !empty($fund['name'])) {
                return $this->sanitizeString((string)$fund['name']);
            }
        }

        if (is_string($fundInput) && trim($fundInput) !== '') {
            return $this->sanitizeString(trim($fundInput));
        }

        return $default;
    }

    private function decodeDonationPayload($rawPayload): array
    {
        if (is_array($rawPayload)) {
            return $rawPayload;
        }

        if (!is_string($rawPayload) || trim($rawPayload) === '') {
            return [];
        }

        $decoded = json_decode($rawPayload, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function getDonationRowById(int $donationId): ?array
    {
        $fundJoin = $this->hasGivingFundsTable()
            ? "LEFT JOIN giving_funds f ON f.id = d.fund_id"
            : "";
        $fundSelect = $this->hasGivingFundsTable()
            ? "f.name AS fund_name, f.description AS fund_description,"
            : "NULL AS fund_name, NULL AS fund_description,";

        $donation = $this->db->first(
            "SELECT d.*, u.first_name, u.last_name, u.email, $fundSelect d.webhook_payload
             FROM snapscan_donations d
             LEFT JOIN users u ON u.id = d.user_id
             $fundJoin
             WHERE d.id = ?",
            [$donationId]
        );

        return $donation ?: null;
    }

    private function normalizeDonationStatus(array $payload, array $donation): string
    {
        $status = strtolower((string)($payload['status'] ?? ''));
        if (in_array($status, ['completed', 'failed', 'refunded'], true)) {
            return $status;
        }

        return ($donation['status'] ?? 'completed') === 'completed' ? 'completed' : 'pending';
    }
}

