<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use App\Database;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailerException;
use Exception;

class ContactController extends BaseController
{
    private array $adminRoles = ['admin', 'pastor', 'superadmin', 'elder', 'developer'];

    private function formatChurchAddress(array $churchInfo): string
    {
        $address = trim((string)($churchInfo['address'] ?? ''));
        if ($address !== '' && mb_strlen($address) > 20) {
            return $address;
        }

        $parts = array_filter([
            $address,
            trim((string)($churchInfo['city'] ?? '')),
            trim((string)($churchInfo['province'] ?? '')),
            trim((string)($churchInfo['country'] ?? 'South Africa')),
        ], fn($value) => $value !== '');

        $fullAddress = implode(', ', $parts);
        return $fullAddress !== '' ? $fullAddress : 'A3313 Rd 3935, Mtubatuba, South Africa';
    }

    public function submit(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            $required = ['name', 'email', 'message'];
            $errors = $this->validateRequired($data, $required);
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $submissionData = [
                'name' => $this->sanitizeString($data['name']),
                'email' => filter_var($data['email'], FILTER_SANITIZE_EMAIL),
                'phone' => isset($data['phone']) ? $this->sanitizeString($data['phone']) : null,
                'subject' => isset($data['subject']) ? $this->sanitizeString($data['subject']) : 'Contact Form Submission',
                'message' => $this->sanitizeString($data['message'])
            ];

            $submissionId = $this->db->insert('contact_submissions', $submissionData);

            // Send email notification
            $this->sendNotificationEmail($submissionData);

            // Send pastor notification
            try {
                $notificationService = new \App\Service\PastorNotificationService($this->db);
                $notificationService->notifyNewWebsiteMessage($submissionData);
            } catch (Exception $notifyError) {
                // Log but don't fail the submission if notification fails
                error_log('Failed to send pastor notification: ' . $notifyError->getMessage());
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Message sent successfully. We will get back to you soon.',
                'data' => ['submission_id' => $submissionId]
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to submit message: ' . $e->getMessage()
            ], 500);
        }
    }

    public function listSubmissions(Request $request, Response $response): Response
    {
        try {
            if (!$this->userCanManage($request)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Unauthorized',
                ], 403);
            }

            $query = $request->getQueryParams();
            $page = max(1, (int)($query['page'] ?? 1));
            $limit = min(100, max(10, (int)($query['limit'] ?? 20)));
            $status = $query['status'] ?? null;
            $search = $query['search'] ?? null;
            $where = [];
            $params = [];

            if ($status === 'unread') {
                $where[] = "is_read = 0";
            } elseif ($status === 'replied') {
                $where[] = "replied = 1";
            } elseif ($status === 'pending') {
                $where[] = "replied = 0";
            }

            if (!empty($search)) {
                $where[] = "(name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)";
                $searchTerm = '%' . $this->sanitizeLike($search) . '%';
                $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm, $searchTerm]);
            }

            $whereSql = '';
            if (!empty($where)) {
                $whereSql = 'WHERE ' . implode(' AND ', $where);
            }

            $offset = ($page - 1) * $limit;

            $count = $this->db->first("SELECT COUNT(*) as total FROM contact_submissions {$whereSql}", $params);
            $rows = $this->db->all("
                SELECT cs.*, 
                       (SELECT subject FROM contact_replies cr WHERE cr.submission_id = cs.id ORDER BY cr.created_at DESC LIMIT 1) as last_reply_subject,
                       (SELECT message FROM contact_replies cr WHERE cr.submission_id = cs.id ORDER BY cr.created_at DESC LIMIT 1) as last_reply_message,
                       (SELECT created_at FROM contact_replies cr WHERE cr.submission_id = cs.id ORDER BY cr.created_at DESC LIMIT 1) as last_reply_at
                FROM contact_submissions cs
                {$whereSql}
                ORDER BY cs.created_at DESC
                LIMIT ? OFFSET ?
            ", array_merge($params, [$limit, $offset]));

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $rows,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => (int)($count['total'] ?? 0),
                ],
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch contact messages: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function getSubmission(Request $request, Response $response, array $args): Response
    {
        try {
            if (!$this->userCanManage($request)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Unauthorized',
                ], 403);
            }

            $id = (int)$args['id'];
            $submission = $this->db->first("SELECT * FROM contact_submissions WHERE id = ?", [$id]);

            if (!$submission) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Message not found',
                ], 404);
            }

            $replies = $this->db->all("
                SELECT cr.*, u.email as admin_email, u.first_name, u.last_name
                FROM contact_replies cr
                LEFT JOIN users u ON cr.user_id = u.id
                WHERE cr.submission_id = ?
                ORDER BY cr.created_at DESC
            ", [$id]);

            // Mark as read when opened
            if (empty($submission['is_read'])) {
                $this->db->update('contact_submissions', ['is_read' => 1], 'id = ?', [$id]);
                $submission['is_read'] = 1;
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'submission' => $submission,
                    'replies' => $replies,
                ],
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch message: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function markRead(Request $request, Response $response, array $args): Response
    {
        try {
            if (!$this->userCanManage($request)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Unauthorized',
                ], 403);
            }

            $id = (int)$args['id'];
            $payload = json_decode($request->getBody()->getContents(), true) ?? [];
            $isRead = isset($payload['is_read']) ? (bool)$payload['is_read'] : true;

            $existing = $this->db->first("SELECT id FROM contact_submissions WHERE id = ?", [$id]);
            if (!$existing) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Message not found',
                ], 404);
            }

            $this->db->update('contact_submissions', [
                'is_read' => $isRead ? 1 : 0,
            ], 'id = ?', [$id]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => $isRead ? 'Marked as read' : 'Marked as unread',
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update message: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function reply(Request $request, Response $response, array $args): Response
    {
        try {
            if (!$this->userCanManage($request)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Unauthorized',
                ], 403);
            }

            $userId = $this->getUserId($request);
            $id = (int)$args['id'];
            $payload = json_decode($request->getBody()->getContents(), true) ?? [];

            $required = ['message'];
            $errors = $this->validateRequired($payload, $required);
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors,
                ], 400);
            }

            $submission = $this->db->first("SELECT * FROM contact_submissions WHERE id = ?", [$id]);
            if (!$submission) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Message not found',
                ], 404);
            }

            $subject = $this->sanitizeString($payload['subject'] ?? 'Re: ' . ($submission['subject'] ?: 'Your message'));
            $messageBody = $this->sanitizeString($payload['message']);

            $this->sendReplyEmail($submission, $subject, $messageBody);

            $this->db->insert('contact_replies', [
                'submission_id' => $id,
                'user_id' => $userId,
                'subject' => $subject,
                'message' => $messageBody,
                'recipient_email' => $submission['email'],
            ]);

            $this->db->update('contact_submissions', [
                'is_read' => 1,
                'replied' => 1,
                'replied_at' => date('Y-m-d H:i:s'),
                'replied_by' => $userId,
            ], 'id = ?', [$id]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Reply sent successfully',
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to send reply: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function getInfo(Request $request, Response $response): Response
    {
        try {
            $churchInfo = $this->db->first("SELECT * FROM church_info LIMIT 1");
            if (is_array($churchInfo)) {
                $churchInfo['address'] = $this->formatChurchAddress($churchInfo);
            }
            
            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'church_name' => $churchInfo['name'] ?? 'Eternal Love Church',
                    'address' => $churchInfo['address'] ?? 'A3313 Rd 3935, Mtubatuba, South Africa',
                    'city' => $churchInfo['city'] ?? 'Mtubatuba',
                    'province' => $churchInfo['province'] ?? 'KwaZulu-Natal',
                    'phone' => $churchInfo['phone'] ?? '0727641137',
                    'email' => $churchInfo['email'] ?? '',
                    'website' => $churchInfo['website'] ?? 'https://elchurch.site'
                ]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch contact info: ' . $e->getMessage()
            ], 500);
        }
    }

    private function sanitizeLike(string $value): string
    {
        $clean = trim($value);
        return str_replace(['%', '_'], ['\\%', '\\_'], $clean);
    }

    private function userCanManage(Request $request): bool
    {
        $role = $request->getAttribute('role');
        return $role && in_array($role, $this->adminRoles, true);
    }

    private function sendNotificationEmail(array $data): bool
    {
        try {
            // Get all active pastors and admins to send contact form to
            $pastors = $this->db->all(
                "SELECT id, email, first_name, last_name FROM users 
                 WHERE is_active = 1 AND role IN ('pastor', 'admin', 'superadmin') 
                 AND email IS NOT NULL 
                 ORDER BY first_name ASC"
            );

            if (empty($pastors)) {
                error_log("Contact form: No active pastors/admins found to notify");
                return false;
            }

            $mail = new PHPMailer(true);

            $mail->isSMTP();
            $host = getenv('MAIL_HOST') ?: 'smtp.gmail.com';
            $port = (int)(getenv('MAIL_PORT') ?: 587);
            $encryption = getenv('MAIL_ENCRYPTION') ?: 'tls';
            
            $mail->Host = $host;
            $mail->Port = $port;
            $mail->SMTPAuth = true;
            $mail->Username = getenv('MAIL_USERNAME') ?: '';
            $mail->Password = getenv('MAIL_PASSWORD') ?: '';
            $mail->SMTPSecure = $encryption;
            $mail->Timeout = 10;
            $mail->SMTPKeepAlive = true;
            
            $mail->setFrom(getenv('MAIL_FROM_ADDRESS') ?: 'noreply@elchurch.site', getenv('MAIL_FROM_NAME') ?: 'Eternal Love Church Website');
            
            // Add all pastors/admins as recipients
            $recipientList = [];
            foreach ($pastors as $pastor) {
                $mail->addAddress($pastor['email'], $pastor['first_name'] . ' ' . $pastor['last_name']);
                $recipientList[] = $pastor['email'];
            }
            
            $mail->addReplyTo($data['email'], $data['name']);
            
            $mail->isHTML(true);
            $mail->Subject = '[' . APP_NAME . '] ' . ($data['subject'] ?? 'New Contact Form Submission');
            
            $body = "
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> {$data['name']}</p>
                <p><strong>Email:</strong> {$data['email']}</p>
                " . (isset($data['phone']) ? "<p><strong>Phone:</strong> {$data['phone']}</p>" : "") . "
                <p><strong>Message:</strong></p>
                <p>" . nl2br($data['message']) . "</p>
                <hr>
                <p><small>This message was sent from the Eternal Love Church website contact form.</small></p>
            ";
            
            $mail->Body = $body;
            $mail->AltBody = strip_tags(str_replace('<br>', "\n", $body));

            if ($mail->send()) {
                error_log("Contact form email sent successfully to: " . implode(', ', $recipientList));
                return true;
            } else {
                error_log("Contact form email failed: " . $mail->ErrorInfo);
                error_log("SMTP attempted: $host:$port (encryption: $encryption)");
                return false;
            }
        } catch (MailerException $e) {
            error_log('Contact form mail error: ' . $e->getMessage());
            error_log("SMTP Host: " . (getenv('MAIL_HOST') ?: 'smtp.gmail.com'));
            error_log("SMTP Port: " . (int)(getenv('MAIL_PORT') ?: 587));
            error_log("SMTP Encryption: " . (getenv('MAIL_ENCRYPTION') ?: 'tls'));
            return false;
        }
    }

    private function sendReplyEmail(array $submission, string $subject, string $message): bool
    {
        try {
            $mail = new PHPMailer(true);

            $mail->isSMTP();
            $host = getenv('MAIL_HOST') ?: 'smtp.gmail.com';
            $port = (int)(getenv('MAIL_PORT') ?: 587);
            $encryption = getenv('MAIL_ENCRYPTION') ?: 'tls';
            
            $mail->Host = $host;
            $mail->Port = $port;
            $mail->SMTPAuth = true;
            $mail->Username = getenv('MAIL_USERNAME') ?: '';
            $mail->Password = getenv('MAIL_PASSWORD') ?: '';
            $mail->SMTPSecure = $encryption;
            $mail->Timeout = 10;
            $mail->SMTPKeepAlive = true;

            $fromAddress = getenv('MAIL_FROM_ADDRESS') ?: 'noreply@elchurch.site';
            $fromName = getenv('MAIL_FROM_NAME') ?: 'Eternal Love Church';

            $mail->setFrom($fromAddress, $fromName);
            $mail->addAddress($submission['email'], $submission['name']);
            $mail->addReplyTo($fromAddress, $fromName);

            $mail->isHTML(true);
            $mail->Subject = $subject;

            $body = "
                <p>Dear {$submission['name']},</p>
                <p>{$message}</p>
                <hr>
                <p style=\"font-size:12px;color:#6b7280;\">You contacted " . (defined('APP_NAME') ? APP_NAME : 'Eternal Love Church') . " via the website contact form. This reply was sent from within the admin dashboard.</p>
            ";

            $mail->Body = $body;
            $mail->AltBody = strip_tags(str_replace('<br>', "\n", $body));

            if ($mail->send()) {
                error_log("Reply email sent successfully to: {$submission['email']}");
                return true;
            } else {
                error_log("Reply email failed to {$submission['email']}: " . $mail->ErrorInfo);
                error_log("SMTP attempted: $host:$port (encryption: $encryption)");
                return false;
            }
        } catch (MailerException $e) {
            error_log('Reply mail error: ' . $e->getMessage());
            error_log("SMTP Host: " . (getenv('MAIL_HOST') ?: 'smtp.gmail.com'));
            error_log("SMTP Port: " . (int)(getenv('MAIL_PORT') ?: 587));
            error_log("SMTP Encryption: " . (getenv('MAIL_ENCRYPTION') ?: 'tls'));
            return false;
        }
    }
}
