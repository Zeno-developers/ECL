<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use App\Database;
use Exception;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailerException;

class VisitorController extends BaseController
{
    public function register(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            $required = ['first_name', 'last_name', 'visit_date'];
            $errors = $this->validateRequired($data, $required);
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $visitorData = [
                'first_name' => $this->sanitizeString($data['first_name']),
                'last_name' => $this->sanitizeString($data['last_name']),
                'email' => isset($data['email']) ? filter_var($data['email'], FILTER_SANITIZE_EMAIL) : null,
                'phone' => isset($data['phone']) ? $this->sanitizeString($data['phone']) : null,
                'visit_date' => $data['visit_date'],
                'how_heard' => isset($data['how_heard']) ? $this->sanitizeString($data['how_heard']) : null,
                'status' => 'new',
                'notes' => isset($data['notes']) ? $this->sanitizeString($data['notes']) : null
            ];

            $visitorId = $this->db->insert('visitors', $visitorData);
            $visitor = $this->db->first("SELECT * FROM visitors WHERE id = ?", [$visitorId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Visitor registered successfully',
                'data' => $visitor
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to register visitor: ' . $e->getMessage()
            ], 500);
        }
    }

    public function registerForCheckin(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true) ?: [];
            $usherId = $this->getUserId($request);
            $actor = $this->db->first("SELECT role FROM users WHERE id = ?", [$usherId]);

            if (!$actor || !in_array($actor['role'], ['usher', 'admin', 'pastor', 'superadmin'], true)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only ushers, pastors, and admins can register visitor check-ins'
                ], 403);
            }

            $required = ['first_name', 'last_name'];
            $errors = $this->validateRequired($data, $required);
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $visitDate = $data['visit_date'] ?? date('Y-m-d');
            $visitorData = [
                'first_name' => $this->sanitizeString($data['first_name']),
                'last_name' => $this->sanitizeString($data['last_name']),
                'email' => isset($data['email']) ? filter_var($data['email'], FILTER_SANITIZE_EMAIL) : null,
                'phone' => isset($data['phone']) ? $this->sanitizeString($data['phone']) : null,
                'visit_date' => $visitDate,
                'how_heard' => isset($data['how_heard']) ? $this->sanitizeString($data['how_heard']) : 'Sunday Check-in',
                'status' => 'new',
                'notes' => isset($data['notes']) ? $this->sanitizeString($data['notes']) : 'Visitor registered during Sunday check-in'
            ];

            $visitorId = $this->db->insert('visitors', $visitorData);

            $existingCheckin = $this->db->first(
                "SELECT id FROM visitor_attendance WHERE visitor_id = ? AND attendance_date = ?",
                [$visitorId, $visitDate]
            );

            if (!$existingCheckin) {
                $this->db->insert('visitor_attendance', [
                    'visitor_id' => $visitorId,
                    'attendance_date' => $visitDate,
                    'checked_in_by' => $usherId,
                    'check_in_time' => date('H:i:s'),
                    'notes' => isset($data['notes']) ? $this->sanitizeString($data['notes']) : null
                ]);
            }

            $visitor = $this->db->first("SELECT * FROM visitors WHERE id = ?", [$visitorId]);
            
            // Auto-create member account if email provided
            $accountCreated = false;
            $accountEmail = null;
            if (!empty($visitor['email'])) {
                try {
                    $temporaryPassword = $this->generateTemporaryPassword();
                    $hashedPassword = password_hash($temporaryPassword, PASSWORD_DEFAULT);
                    $verificationToken = bin2hex(random_bytes(32));
                    
                    // Check if user already exists
                    $existingUser = $this->db->first("SELECT id FROM users WHERE email = ?", [$visitor['email']]);
                    
                    if (!$existingUser) {
                        $this->db->beginTransaction();
                        
                        $userId = $this->db->insert('users', [
                            'uuid' => $this->generateUuid(),
                            'email' => $visitor['email'],
                            'password' => $hashedPassword,
                            'first_name' => $visitor['first_name'],
                            'last_name' => $visitor['last_name'],
                            'phone' => $visitor['phone'],
                            'role' => 'member',
                            'verification_token' => $verificationToken,
                            'must_change_password' => 1,
                            'is_active' => 1
                        ]);
                        
                        // Compute robust next member number (handles deleted members)
                        $maxRow = $this->db->first("SELECT MAX(CAST(SUBSTRING(member_number, 2) AS UNSIGNED)) AS maxnum FROM members");
                        $maxNum = isset($maxRow['maxnum']) ? (int)$maxRow['maxnum'] : 0;
                        $nextNum = $maxNum + 1;
                        $memberNumber = 'M' . str_pad($nextNum, 6, '0', STR_PAD_LEFT);

                        $this->db->insert('members', [
                            'user_id' => $userId,
                            'member_number' => $memberNumber,
                            'first_name' => $visitor['first_name'],
                            'last_name' => $visitor['last_name'],
                            'email' => $visitor['email'],
                            'phone' => $visitor['phone'],
                            'membership_date' => date('Y-m-d'),
                            'notes' => 'Auto-created from visitor check-in'
                        ]);
                        
                        // Send welcome email with credentials
                        $emailSent = $this->sendTemporaryPasswordEmail($visitor, $temporaryPassword);
                        
                        $this->db->query(
                            "UPDATE visitors SET member_user_id = ?, status = 'member', temp_password_sent_at = ?, welcomed_at = CURRENT_TIMESTAMP WHERE id = ?",
                            [$userId, $emailSent ? date('Y-m-d H:i:s') : null, $visitorId]
                        );
                        
                        $this->db->commit();
                        $accountCreated = true;
                        $accountEmail = $visitor['email'];
                    }
                } catch (Exception $accountError) {
                    if ($this->db->getConnection()->inTransaction()) {
                        $this->db->rollBack();
                    }
                    error_log('Failed to auto-create account: ' . $accountError->getMessage());
                }
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Visitor registered and checked in successfully' . ($accountCreated ? ' (Member account created)' : ''),
                'data' => [
                    'visitor' => $visitor,
                    'attendance_date' => $visitDate,
                    'account_created' => $accountCreated,
                    'account_email' => $accountEmail
                ]
            ], 201);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to register visitor check-in: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getStats(Request $request, Response $response): Response
    {
        try {
            $stats = [
                'total_visitors' => $this->db->first("SELECT COUNT(*) as count FROM visitors")['count'],
                'new_this_month' => $this->db->first(
                    "SELECT COUNT(*) as count FROM visitors WHERE strftime('%m', visit_date) = strftime('%m', 'now') AND strftime('%Y', visit_date) = strftime('%Y', 'now')"
                )['count'],
                'by_status' => [
                    'new' => $this->db->first("SELECT COUNT(*) as count FROM visitors WHERE status = 'new'")['count'],
                    'contacted' => $this->db->first("SELECT COUNT(*) as count FROM visitors WHERE status = 'contacted'")['count'],
                    'followed' => $this->db->first("SELECT COUNT(*) as count FROM visitors WHERE status = 'followed'")['count'],
                    'member' => $this->db->first("SELECT COUNT(*) as count FROM visitors WHERE status = 'member'")['count']
                ],
                'recent_visitors' => $this->db->all(
                    "SELECT * FROM visitors ORDER BY visit_date DESC, created_at DESC LIMIT 10"
                )
            ];

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $stats
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get visitor stats: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getRecent(Request $request, Response $response): Response
    {
        try {
            $limit = (int)($request->getQueryParams()['limit'] ?? 10);
            $visitors = $this->db->all(
                "SELECT * FROM visitors ORDER BY visit_date DESC, created_at DESC LIMIT ?",
                [$limit]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $visitors
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch recent visitors: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateStatus(Request $request, Response $response, array $args): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            if (!isset($data['status']) || !in_array($data['status'], ['new', 'contacted', 'followed', 'member'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Invalid status. Must be new, contacted, followed, or member'
                ], 400);
            }

            $this->db->query(
                "UPDATE visitors SET status = ? WHERE id = ?",
                [$data['status'], $args['id']]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Visitor status updated successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update visitor status: ' . $e->getMessage()
            ], 500);
        }
    }

    public function createMemberAccount(Request $request, Response $response, array $args): Response
    {
        try {
            $visitorId = (int)$args['id'];
            $actorId = $this->getUserId($request);
            $actor = $this->db->first("SELECT role FROM users WHERE id = ?", [$actorId]);

            if (!$actor || !in_array($actor['role'], ['usher', 'admin', 'pastor', 'superadmin'], true)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only ushers, pastors, and admins can create visitor member accounts'
                ], 403);
            }

            $visitor = $this->db->first("SELECT * FROM visitors WHERE id = ?", [$visitorId]);
            if (!$visitor) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Visitor not found'
                ], 404);
            }

            if (empty($visitor['email'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Visitor must have an email address before an account can be created'
                ], 400);
            }

            if (!empty($visitor['member_user_id'])) {
                $existingUser = $this->db->first(
                    "SELECT id, email, first_name, last_name FROM users WHERE id = ?",
                    [$visitor['member_user_id']]
                );

                return $this->jsonResponse([
                    'status' => 'success',
                    'message' => 'Member account already exists for this visitor',
                    'data' => [
                        'user' => $existingUser,
                        'email_sent' => (bool)($visitor['temp_password_sent_at'] ?? false)
                    ]
                ]);
            }

            $existingUser = $this->db->first("SELECT id FROM users WHERE email = ?", [$visitor['email']]);
            if ($existingUser) {
                $this->db->query(
                    "UPDATE visitors SET member_user_id = ?, status = 'member', welcomed_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [$existingUser['id'], $visitorId]
                );

                return $this->jsonResponse([
                    'status' => 'success',
                    'message' => 'Existing user account linked to visitor successfully',
                    'data' => [
                        'user_id' => (int)$existingUser['id'],
                        'email_sent' => false
                    ]
                ]);
            }

            $temporaryPassword = $this->generateTemporaryPassword();
            $hashedPassword = password_hash($temporaryPassword, PASSWORD_DEFAULT);
            $verificationToken = bin2hex(random_bytes(32));

            $this->db->beginTransaction();

            $userId = $this->db->insert('users', [
                'uuid' => $this->generateUuid(),
                'email' => filter_var($visitor['email'], FILTER_SANITIZE_EMAIL),
                'password' => $hashedPassword,
                'first_name' => $this->sanitizeString($visitor['first_name']),
                'last_name' => $this->sanitizeString($visitor['last_name']),
                'phone' => $visitor['phone'] ? $this->sanitizeString($visitor['phone']) : null,
                'role' => 'member',
                'verification_token' => $verificationToken,
                'must_change_password' => 1,
                'temp_password_sent_at' => null,
                'is_active' => 1
            ]);

            // Compute next stable member number and insert
            $maxRow = $this->db->first("SELECT MAX(CAST(SUBSTRING(member_number, 2) AS UNSIGNED)) AS maxnum FROM members");
            $maxNum = isset($maxRow['maxnum']) ? (int)$maxRow['maxnum'] : 0;
            $nextNum = $maxNum + 1;
            $memberNumber = 'M' . str_pad($nextNum, 6, '0', STR_PAD_LEFT);

            $this->db->insert('members', [
                'user_id' => $userId,
                'member_number' => $memberNumber,
                'first_name' => $this->sanitizeString($visitor['first_name']),
                'last_name' => $this->sanitizeString($visitor['last_name']),
                'email' => filter_var($visitor['email'], FILTER_SANITIZE_EMAIL),
                'phone' => $visitor['phone'] ? $this->sanitizeString($visitor['phone']) : null,
                'membership_date' => date('Y-m-d'),
                'notes' => $visitor['notes'] ? $this->sanitizeString($visitor['notes']) : null,
            ]);

            $emailSent = $this->sendTemporaryPasswordEmail($visitor, $temporaryPassword);

            $this->db->query(
                "UPDATE visitors
                 SET member_user_id = ?, status = 'member', temp_password_sent_at = ?, welcomed_at = CURRENT_TIMESTAMP
                 WHERE id = ?",
                [$userId, $emailSent ? date('Y-m-d H:i:s') : null, $visitorId]
            );

            $this->db->query(
                "UPDATE users SET temp_password_sent_at = ? WHERE id = ?",
                [$emailSent ? date('Y-m-d H:i:s') : null, $userId]
            );

            $this->db->insert('notifications', [
                'user_id' => $actorId,
                'title' => 'Visitor Member Account Created',
                'message' => "{$visitor['first_name']} {$visitor['last_name']} now has a member account.",
                'type' => 'visitor_onboarding'
            ]);

            $this->db->commit();

            return $this->jsonResponse([
                'status' => 'success',
                'message' => $emailSent
                    ? 'Member account created and temporary password emailed successfully'
                    : 'Member account created, but email was not sent because mail configuration is incomplete',
                'data' => [
                    'user_id' => $userId,
                    'email_sent' => $emailSent,
                    'email' => $visitor['email']
                ]
            ], 201);
        } catch (Exception $e) {
            if ($this->db->getConnection()->inTransaction()) {
                $this->db->rollBack();
            }

            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to create member account: ' . $e->getMessage()
            ], 500);
        }
    }

    private function generateTemporaryPassword(): string
    {
        return 'ELC' . substr(bin2hex(random_bytes(6)), 0, 9);
    }

    private function sendTemporaryPasswordEmail(array $visitor, string $temporaryPassword): bool
    {
        $frontendUrl  = getenv('FRONTEND_URL') ?: (defined('APP_URL') ? APP_URL : 'https://elchurch.site');
        $loginUrl     = $frontendUrl . '/login';
        $firstName    = $visitor['first_name'] ?? 'Member';
        $emailSuccess = false;

        // Get member number
        $memberNumber = null;
        if (!empty($visitor['member_user_id'])) {
            $member = $this->db->first(
                "SELECT member_number FROM members WHERE user_id = ?",
                [(int)$visitor['member_user_id']]
            );
            $memberNumber = $member['member_number'] ?? null;
        }

        // Email
        if (getenv('MAIL_HOST') && getenv('MAIL_USERNAME') && getenv('MAIL_PASSWORD')) {
            try {
                $mailService  = new \App\Services\MailService();
                $emailSuccess = $mailService->sendVisitorAccountCreatedEmail(
                    $visitor['email'],
                    $firstName,
                    $visitor['last_name'] ?? '',
                    $temporaryPassword,
                    $loginUrl,
                    $memberNumber
                );
            } catch (Exception $e) {
                error_log('Temporary password email failed: ' . $e->getMessage());
            }
        }

        // WhatsApp
        if (!empty($visitor['phone'])) {
            try {
                $body = "Welcome to Eternal Love Church, $firstName! 🙏\n\nYour account is ready.\nEmail: {$visitor['email']}\nPassword: $temporaryPassword\n\nLogin at: $loginUrl\n\nPlease change your password after first login.";
                (new \App\Services\WhatsAppService())->send([['phone' => $visitor['phone']]], $body);
            } catch (Exception $waErr) {
                error_log('Visitor account WhatsApp failed: ' . $waErr->getMessage());
            }
        }

        return $emailSuccess;
    }
}
