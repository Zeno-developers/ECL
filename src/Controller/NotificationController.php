<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use App\Database;
use Exception;

class NotificationController extends BaseController
{
    public function send(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            $required = ['title', 'message'];
            $errors = $this->validateRequired($data, $required);
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $notificationData = [
                'user_id' => isset($data['user_id']) ? (int)$data['user_id'] : null,
                'title' => $this->sanitizeString($data['title']),
                'message' => $this->sanitizeString($data['message']),
                'type' => isset($data['type']) ? $this->sanitizeString($data['type']) : 'general',
                'scheduled_for' => isset($data['scheduled_for']) ? $data['scheduled_for'] : null
            ];

            $notificationId = $this->db->insert('notifications', $notificationData);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Notification created successfully',
                'data' => ['notification_id' => $notificationId]
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to send notification: ' . $e->getMessage()
            ], 500);
        }
    }

    public function sendBulk(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            if (!isset($data['message']) || !isset($data['user_ids']) || !is_array($data['user_ids'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Message and user_ids array are required'
                ], 400);
            }

            $sentCount = 0;
            foreach ($data['user_ids'] as $userId) {
                $this->db->insert('notifications', [
                    'user_id' => (int)$userId,
                    'title' => $this->sanitizeString($data['title'] ?? 'Bulk Notification'),
                    'message' => $this->sanitizeString($data['message']),
                    'type' => $this->sanitizeString($data['type'] ?? 'bulk'),
                    'scheduled_for' => isset($data['scheduled_for']) ? $data['scheduled_for'] : null
                ]);
                $sentCount++;
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => "Bulk notification scheduled for $sentCount users"
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to send bulk notification: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getTemplates(Request $request, Response $response): Response
    {
        try {
            $templates = $this->db->all("SELECT * FROM notification_templates ORDER BY name");
            
            return $this->jsonResponse([
                'status' => 'success',
                'data' => $templates
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch templates: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getStats(Request $request, Response $response): Response
    {
        try {
            $stats = [
                'total_notifications' => $this->db->first("SELECT COUNT(*) as count FROM notifications")['count'],
                'unread_count' => $this->db->first("SELECT COUNT(*) as count FROM notifications WHERE is_read = 0")['count'],
                'sent_today' => $this->db->first(
                    "SELECT COUNT(*) as count FROM notifications WHERE DATE(sent_at) = CURRENT_DATE OR DATE(created_at) = CURRENT_DATE"
                )['count'],
                'scheduled_count' => $this->db->first(
                    "SELECT COUNT(*) as count FROM notifications WHERE scheduled_for IS NOT NULL AND sent_at IS NULL"
                )['count'],
                'by_type' => $this->db->all("SELECT type, COUNT(*) as count FROM notifications WHERE type IS NOT NULL GROUP BY type")
            ];

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $stats
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get notification stats: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getUserNotifications(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $params = $request->getQueryParams();
            $page = (int)($params['page'] ?? 1);
            $limit = (int)($params['limit'] ?? 20);
            $unreadOnly = isset($params['unreadOnly']) && $params['unreadOnly'] == 'true';
            $markRead = isset($params['markRead']) && $params['markRead'] == 'true';
            
            $where = "user_id = ?";
            $paramsArray = [$userId];
            
            if ($unreadOnly) {
                $where .= " AND is_read = 0";
            }
            
            $offset = ($page - 1) * $limit;
            $sql = "SELECT * FROM notifications WHERE $where ORDER BY created_at DESC LIMIT ? OFFSET ?";
            $notifications = $this->db->all($sql, array_merge($paramsArray, [$limit, $offset]));
            
            $total = $this->db->first("SELECT COUNT(*) as count FROM notifications WHERE $where", $paramsArray)['count'];
            $unreadCount = $this->db->first(
                "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
                [$userId]
            )['count'];
            
            if ($markRead) {
                $this->db->query("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", [$userId]);
                $unreadCount = 0;
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'notifications' => $notifications,
                    'pagination' => [
                        'page' => $page,
                        'limit' => $limit,
                        'total' => $total,
                        'pages' => ceil($total / $limit)
                    ],
                    'unread_count' => $unreadCount
                ]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch notifications: ' . $e->getMessage()
            ], 500);
        }
    }

    public function markAsRead(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = $this->getUserId($request);
            $this->db->query(
                "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
                [$args['id'], $userId]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Notification marked as read'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to mark notification as read: ' . $e->getMessage()
            ], 500);
        }
    }

    public function markAllAsRead(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $this->db->query(
                "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
                [$userId]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'All notifications marked as read',
                'data' => ['unread_count' => 0]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to mark all notifications as read: ' . $e->getMessage()
            ], 500);
        }
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = $this->getUserId($request);
            $affected = $this->db->query(
                "DELETE FROM notifications WHERE id = ? AND user_id = ?",
                [$args['id'], $userId]
            );

            if ($affected === 0) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Notification not found'], 404);
            }

            return $this->jsonResponse(['status' => 'success', 'message' => 'Notification deleted']);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to delete notification: ' . $e->getMessage()
            ], 500);
        }
    }
}

