<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use App\Database;
use Exception;

class AnnouncementsController extends BaseController
{
    /**
     * Get announcements (filtered by user role/zone/cell)
     */
    public function getAll(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $user = $this->db->first("SELECT role, zone_id, cell_id FROM users WHERE id = ?", [$userId]);
            
            $params = $request->getQueryParams();
            $limit = $params['limit'] ?? 50;
            $offset = $params['offset'] ?? 0;
            $activeOnly = $params['active_only'] ?? true;

            $sql = "SELECT a.*, 
                           u.first_name as created_by_first_name,
                           u.last_name as created_by_last_name,
                           z.name as zone_name,
                           c.name as cell_name
                    FROM announcements a
                    JOIN users u ON a.created_by = u.id
                    LEFT JOIN zones z ON a.zone_id = z.id
                    LEFT JOIN cells c ON a.cell_id = c.id
                    WHERE 1=1";
            
            $queryParams = [];

            if ($activeOnly) {
                $sql .= " AND a.is_active = 1 AND (a.expires_at IS NULL OR a.expires_at >= DATE('now'))";
            }

            // Filter by audience based on user role
            $sql .= $this->getAudienceFilter($user, $queryParams);

            $sql .= " ORDER BY a.created_at DESC LIMIT ? OFFSET ?";
            $queryParams[] = $limit;
            $queryParams[] = $offset;

            $announcements = $this->db->all($sql, $queryParams);

            // Get total count
            $countSql = "SELECT COUNT(*) as total FROM announcements a WHERE 1=1";
            $countParams = [];
            if ($activeOnly) {
                $countSql .= " AND a.is_active = 1 AND (a.expires_at IS NULL OR a.expires_at >= DATE('now'))";
            }
            $countSql .= $this->getAudienceFilter($user, $countParams);
            $total = $this->db->first($countSql, $countParams)['total'] ?? 0;

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $announcements,
                'pagination' => [
                    'total' => $total,
                    'limit' => $limit,
                    'offset' => $offset,
                    'has_more' => ($offset + $limit) < $total
                ]
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get announcements: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create announcement (admin/pastor only)
     */
    public function create(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            $userId = $this->getUserId($request);
            
            // Check permissions
            $user = $this->db->first("SELECT role FROM users WHERE id = ?", [$userId]);
            if (!in_array($user['role'], ['admin', 'pastor', 'superadmin'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only admin or pastor can create announcements'
                ], 403);
            }

            $required = ['title', 'content'];
            $errors = $this->validateRequired($data, $required);
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $announcementId = $this->db->insert('announcements', [
                'title' => $this->sanitizeString($data['title']),
                'content' => $data['content'], // Allow HTML
                'created_by' => $userId,
                'audience' => $data['audience'] ?? 'all',
                'zone_id' => $data['zone_id'] ?? null,
                'cell_id' => $data['cell_id'] ?? null,
                'expires_at' => $data['expires_at'] ?? null,
                'is_active' => $data['is_active'] ?? 1
            ]);

            // Notify target audience (email + optional WhatsApp)
            $notifyWhatsapp = !empty($data['notify_whatsapp']);
            $notify = $this->notifyAudience($announcementId, $data['audience'], $data['zone_id'] ?? null, $data['cell_id'] ?? null, $notifyWhatsapp);

            // Send pastor notification about new announcement
            try {
                $notificationService = new \App\Service\PastorNotificationService($this->db);
                $notificationService->notifyNewAnnouncement([
                    'title' => $data['title'],
                    'content' => $data['content'],
                    'category' => $data['audience'] ?? 'General'
                ]);
            } catch (Exception $notifyError) {
                error_log('Failed to send pastor notification: ' . $notifyError->getMessage());
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Announcement created successfully',
                'data' => [
                    'id'             => $announcementId,
                    'emails_sent'    => $notify['emails_sent'],
                    'whatsapp_sent'  => $notify['whatsapp_sent'],
                    'recipients'     => $notify['recipients'],
                ]
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to create announcement: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update announcement
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        try {
            $announcementId = (int)$args['id'];
            $data = json_decode($request->getBody()->getContents(), true);
            $userId = $this->getUserId($request);
            
            // Check permissions
            $user = $this->db->first("SELECT role FROM users WHERE id = ?", [$userId]);
            if (!in_array($user['role'], ['admin', 'pastor', 'superadmin'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only admin or pastor can update announcements'
                ], 403);
            }

            // Check if exists
            $existing = $this->db->first("SELECT * FROM announcements WHERE id = ?", [$announcementId]);
            if (!$existing) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Announcement not found'
                ], 404);
            }

            $updateData = [];
            $allowedFields = ['title', 'content', 'audience', 'zone_id', 'cell_id', 'expires_at', 'is_active'];
            
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $updateData[$field] = $field === 'title' || $field === 'content' 
                        ? $this->sanitizeString($data[$field]) 
                        : $data[$field];
                }
            }

            if (!empty($updateData)) {
                $set = implode(', ', array_map(fn($key) => "$key = ?", array_keys($updateData)));
                $sql = "UPDATE announcements SET $set WHERE id = ?";
                $this->db->query($sql, array_merge(array_values($updateData), [$announcementId]));
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Announcement updated successfully'
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update announcement: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete announcement
     */
    public function delete(Request $request, Response $response, array $args): Response
    {
        try {
            $announcementId = (int)$args['id'];
            $userId = $this->getUserId($request);
            
            // Check permissions
            $user = $this->db->first("SELECT role FROM users WHERE id = ?", [$userId]);
            if (!in_array($user['role'], ['admin', 'pastor', 'superadmin'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only admin or pastor can delete announcements'
                ], 403);
            }

            $this->db->query("DELETE FROM announcements WHERE id = ?", [$announcementId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Announcement deleted successfully'
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to delete announcement: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get announcements for specific user (filtered)
     */
    private function getAudienceFilter(array $user, array &$params): string
    {
        $role = $user['role'];
        $zoneId = $user['zone_id'];
        $cellId = $user['cell_id'];
        
        switch ($role) {
            case 'admin':
            case 'pastor':
            case 'superadmin':
                return ""; // See all announcements
                
            case 'zone_leader':
                if ($zoneId) {
                    $params[] = $zoneId;
                    return " AND (a.audience = 'all' OR a.audience = 'zone_leaders' OR (a.audience = 'specific_zones' AND a.zone_id = ?))";
                }
                return " AND (a.audience = 'all' OR a.audience = 'zone_leaders')";
                
            case 'cell_leader':
                if ($cellId) {
                    $params[] = $cellId;
                    return " AND (a.audience = 'all' OR a.audience = 'cell_leaders' OR (a.audience = 'specific_cells' AND a.cell_id = ?))";
                }
                return " AND (a.audience = 'all' OR a.audience = 'cell_leaders')";
                
            case 'member':
            default:
                return " AND (a.audience = 'all' OR a.audience = 'members')";
        }
    }

    /**
     * Notify audience about new announcement
     */
    private function notifyAudience(int $announcementId, string $audience, ?int $zoneId, ?int $cellId, bool $notifyWhatsapp = false): array
    {
        // Build query to get users to notify
        $sql = "SELECT id, email, phone, first_name, last_name FROM users WHERE is_active = 1";
        $params = [];
        
        switch ($audience) {
            case 'all':
                // No additional filter
                break;
            case 'zone_leaders':
                $sql .= " AND role = 'zone_leader'";
                break;
            case 'cell_leaders':
                $sql .= " AND role = 'cell_leader'";
                break;
            case 'members':
                $sql .= " AND role = 'member'";
                break;
            case 'specific_zones':
                if ($zoneId) {
                    $sql .= " AND zone_id = ?";
                    $params[] = $zoneId;
                }
                break;
            case 'specific_cells':
                if ($cellId) {
                    $sql .= " AND cell_id = ?";
                    $params[] = $cellId;
                }
                break;
        }
        
        $users = $this->db->all($sql, $params);

        // Get announcement details
        $announcement = $this->db->first(
            "SELECT a.*, u.first_name as creator_first, u.last_name as creator_last FROM announcements a
             LEFT JOIN users u ON a.created_by = u.id
             WHERE a.id = ?",
            [$announcementId]
        );

        if (!$announcement) {
            return ['emails_sent' => 0, 'whatsapp_sent' => 0, 'recipients' => 0];
        }

        $emailRecipients    = [];
        $whatsappRecipients = [];

        foreach ($users as $user) {
            $this->db->insert('notifications', [
                'user_id' => $user['id'],
                'title'   => "Announcement: " . substr($announcement['title'], 0, 100),
                'message' => strip_tags(substr($announcement['content'], 0, 200)),
                'type'    => 'announcement'
            ]);

            if (!empty($user['email'])) {
                $emailRecipients[] = [
                    'email' => $user['email'],
                    'name'  => trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''))
                ];
            }

            if ($notifyWhatsapp && !empty($user['phone'])) {
                $whatsappRecipients[] = [
                    'phone' => $user['phone'],
                    'name'  => trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''))
                ];
            }
        }

        $emailsSent    = $this->sendAnnouncementEmails($announcement, $emailRecipients);
        $whatsappSent  = 0;
        if ($notifyWhatsapp && !empty($whatsappRecipients)) {
            $whatsappSent = $this->sendAnnouncementWhatsApp($announcement, $whatsappRecipients);
        }

        return [
            'emails_sent'   => $emailsSent,
            'whatsapp_sent' => $whatsappSent,
            'recipients'    => count($users),
        ];
    }
    
    /**
     * Send announcement emails and return count sent
     */
    private function sendAnnouncementEmails(array $announcement, array $recipients): int
    {
        if (empty($recipients)) {
            return 0;
        }

        try {
            $mailService = new \App\Services\MailService();
            return (int) $mailService->sendAnnouncementEmail(
                $recipients,
                $announcement['title'],
                $announcement['content'],
                $announcement['expires_at'] ?? null
            );
        } catch (Exception $e) {
            error_log('Failed to send announcement emails: ' . $e->getMessage());
            return 0;
        }
    }

    /**
     * Send announcement via WhatsApp and return count sent
     */
    private function sendAnnouncementWhatsApp(array $announcement, array $recipients): int
    {
        if (empty($recipients)) {
            return 0;
        }

        try {
            $waService = new \App\Services\WhatsAppService();
            if (!$waService->isConfigured()) {
                error_log('WhatsApp service not configured — skipping announcement send');
                return 0;
            }

            $body   = "ELC Announcement: {$announcement['title']}\n\n" . strip_tags($announcement['content']);
            $result = $waService->send($recipients, $body);
            error_log("WhatsApp announcement: sent={$result['sent']}, failed={$result['failed']}");
            return (int) $result['sent'];
        } catch (Exception $e) {
            error_log('Failed to send announcement WhatsApp: ' . $e->getMessage());
            return 0;
        }
    }
}
