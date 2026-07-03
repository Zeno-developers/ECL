<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use App\Database;
use Exception;

class ChatController extends BaseController
{
    public function getRooms(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);

            // Auto-join user to all non-private rooms they haven't joined yet
            $this->db->query(
                "INSERT INTO chat_participants (room_id, user_id)
                 SELECT cr.id, ? FROM chat_rooms cr
                 WHERE cr.is_private = 0
                 AND NOT EXISTS (
                     SELECT 1 FROM chat_participants cp2
                     WHERE cp2.room_id = cr.id AND cp2.user_id = ?
                 )",
                [$userId, $userId]
            );

            $rooms = $this->db->all(
                "SELECT cr.*,
                 (SELECT COUNT(*) FROM chat_participants WHERE room_id = cr.id) as participant_count,
                 (SELECT COUNT(*) FROM chat_messages WHERE room_id = cr.id) as message_count
                 FROM chat_rooms cr
                 JOIN chat_participants cp ON cr.id = cp.room_id
                 WHERE cp.user_id = ?
                 ORDER BY cr.created_at DESC",
                [$userId]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $rooms
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch chat rooms: ' . $e->getMessage()
            ], 500);
        }
    }

    public function createRoom(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            $userId = $this->getUserId($request);
            
            $required = ['name', 'type'];
            $errors = $this->validateRequired($data, $required);
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $roomData = [
                'name' => $this->sanitizeString($data['name']),
                'description' => isset($data['description']) ? $this->sanitizeString($data['description']) : null,
                'type' => in_array($data['type'], ['channel', 'direct', 'group']) ? $data['type'] : 'channel',
                'is_private' => isset($data['is_private']) ? (bool)$data['is_private'] : 0,
                'created_by' => $userId
            ];

            $roomId = $this->db->insert('chat_rooms', $roomData);
            
            // Add creator as participant
            $this->db->insert('chat_participants', [
                'room_id' => $roomId,
                'user_id' => $userId
            ]);

            $room = $this->db->first("SELECT * FROM chat_rooms WHERE id = ?", [$roomId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Room created successfully',
                'data' => $room
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to create room: ' . $e->getMessage()
            ], 500);
        }
    }

    public function initializeRooms(Request $request, Response $response): Response
    {
        try {
            // Create default rooms if they don't exist
            $defaultRooms = [
                ['General', 'General discussion for all members', 'channel', 0],
                ['Announcements', 'Important church announcements', 'channel', 0],
                ['Prayer', 'Prayer requests and updates', 'channel', 0],
                ['Events', 'Event planning and coordination', 'channel', 0]
            ];
            
            foreach ($defaultRooms as $room) {
                $existing = $this->db->first("SELECT id FROM chat_rooms WHERE name = ?", [$room[0]]);
                if (!$existing) {
                    $this->db->insert('chat_rooms', [
                        'name' => $room[0],
                        'description' => $room[1],
                        'type' => $room[2],
                        'is_private' => $room[3]
                    ]);
                }
            }

            // Add all active users to every non-private room they're not already in
            $this->db->query(
                "INSERT INTO chat_participants (room_id, user_id)
                 SELECT cr.id, u.id FROM chat_rooms cr
                 CROSS JOIN users u
                 WHERE cr.is_private = 0 AND u.is_active = 1
                 AND NOT EXISTS (
                     SELECT 1 FROM chat_participants cp
                     WHERE cp.room_id = cr.id AND cp.user_id = u.id
                 )",
                []
            );

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Default rooms initialized'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to initialize rooms: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getMessages(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = $this->getUserId($request);
            $roomId = $args['id'];
            $params = $request->getQueryParams();
            $limit = (int)($params['limit'] ?? 50);
            $before = $params['before'] ?? null;
            
            // Check if user is participant
            $participant = $this->db->first(
                "SELECT * FROM chat_participants WHERE room_id = ? AND user_id = ?",
                [$roomId, $userId]
            );
            
            if (!$participant) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'You are not a participant of this room'
                ], 403);
            }
            
            $sql = "SELECT cm.*, u.first_name, u.last_name 
                    FROM chat_messages cm 
                    LEFT JOIN users u ON cm.user_id = u.id 
                    WHERE cm.room_id = ?";
            $paramsArray = [$roomId];
            
            if ($before) {
                $sql .= " AND cm.created_at < ?";
                $paramsArray[] = $before;
            }
            
            $sql .= " ORDER BY cm.created_at DESC LIMIT ?";
            $paramsArray[] = $limit;
            
            $messages = $this->db->all($sql, $paramsArray);
            
            // Mark as read
            $this->db->query(
                "UPDATE chat_participants SET last_read_at = CURRENT_TIMESTAMP WHERE room_id = ? AND user_id = ?",
                [$roomId, $userId]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'data' => array_reverse($messages)
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch messages: ' . $e->getMessage()
            ], 500);
        }
    }

    public function sendMessage(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = $this->getUserId($request);
            $roomId = $args['id'];
            $data = json_decode($request->getBody()->getContents(), true);
            
            if (!isset($data['content'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Message content is required'
                ], 400);
            }

            // Check if user is participant
            $participant = $this->db->first(
                "SELECT * FROM chat_participants WHERE room_id = ? AND user_id = ?",
                [$roomId, $userId]
            );
            
            if (!$participant) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'You are not a participant of this room'
                ], 403);
            }

            $messageData = [
                'room_id' => $roomId,
                'user_id' => $userId,
                'content' => $this->sanitizeString($data['content']),
                'type' => isset($data['type']) && in_array($data['type'], ['text', 'image', 'file', 'system']) ? $data['type'] : 'text',
                'file_url' => isset($data['file_url']) ? $this->sanitizeString($data['file_url']) : null,
                'file_name' => isset($data['file_name']) ? $this->sanitizeString($data['file_name']) : null,
                'parent_id' => isset($data['parent_id']) ? (int)$data['parent_id'] : null
            ];

            $messageId = $this->db->insert('chat_messages', $messageData);
            $message = $this->db->first(
                "SELECT cm.*, u.first_name, u.last_name FROM chat_messages cm LEFT JOIN users u ON cm.user_id = u.id WHERE cm.id = ?",
                [$messageId]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Message sent',
                'data' => $message
            ], 201);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to send message: ' . $e->getMessage()
            ], 500);
        }
    }

    public function joinRoom(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = $this->getUserId($request);
            $roomId = $args['id'];
            
            // Check if room exists
            $room = $this->db->first("SELECT * FROM chat_rooms WHERE id = ?", [$roomId]);
            if (!$room) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Room not found'
                ], 404);
            }
            
            // Check if already participant
            $existing = $this->db->first(
                "SELECT * FROM chat_participants WHERE room_id = ? AND user_id = ?",
                [$roomId, $userId]
            );
            
            if ($existing) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Already a participant'
                ], 400);
            }
            
            $this->db->insert('chat_participants', [
                'room_id' => $roomId,
                'user_id' => $userId
            ]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Joined room successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to join room: ' . $e->getMessage()
            ], 500);
        }
    }

    public function leaveRoom(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = $this->getUserId($request);
            $roomId = $args['id'];
            
            $deleted = $this->db->delete(
                'chat_participants',
                'room_id = ? AND user_id = ?',
                [$roomId, $userId]
            );
            
            if (!$deleted) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Not a participant of this room'
                ], 400);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Left room successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to leave room: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getRoomInfo(Request $request, Response $response, array $args): Response
    {
        try {
            $roomId = $args['id'];
            $room = $this->db->first("SELECT * FROM chat_rooms WHERE id = ?", [$roomId]);
            
            if (!$room) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Room not found'
                ], 404);
            }
            
            $participants = $this->db->all(
                "SELECT cp.*, u.first_name, u.last_name, u.email 
                 FROM chat_participants cp 
                 JOIN users u ON cp.user_id = u.id 
                 WHERE cp.room_id = ?",
                [$roomId]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'room' => $room,
                    'participants' => $participants
                ]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get room info: ' . $e->getMessage()
            ], 500);
        }
    }

    public function markAsRead(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = $this->getUserId($request);
            $roomId = $args['id'];
            
            $this->db->query(
                "UPDATE chat_participants SET last_read_at = CURRENT_TIMESTAMP WHERE room_id = ? AND user_id = ?",
                [$roomId, $userId]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Messages marked as read'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to mark messages as read: ' . $e->getMessage()
            ], 500);
        }
    }

    public function searchMessages(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = $this->getUserId($request);
            $roomId = $args['id'];
            $query = $request->getQueryParams()['q'] ?? '';
            
            if (empty($query)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Search query is required'
                ], 400);
            }
            
            // Check if user is participant
            $participant = $this->db->first(
                "SELECT * FROM chat_participants WHERE room_id = ? AND user_id = ?",
                [$roomId, $userId]
            );
            
            if (!$participant) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'You are not a participant of this room'
                ], 403);
            }
            
            $searchTerm = "%$query%";
            $messages = $this->db->all(
                "SELECT cm.*, u.first_name, u.last_name 
                 FROM chat_messages cm 
                 LEFT JOIN users u ON cm.user_id = u.id 
                 WHERE cm.room_id = ? AND cm.content LIKE ? 
                 ORDER BY cm.created_at DESC LIMIT 50",
                [$roomId, $searchTerm]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $messages
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to search messages: ' . $e->getMessage()
            ], 500);
        }
    }

    public function reactToMessage(Request $request, Response $response, array $args): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            if (!isset($data['emoji'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Emoji is required'
                ], 400);
            }

            $messageId = $args['id'];
            $message = $this->db->first("SELECT reactions FROM chat_messages WHERE id = ?", [$messageId]);
            if (!$message) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Message not found'
                ], 404);
            }

            $reactions = json_decode($message['reactions'] ?? '{}', true) ?: [];
            $emoji = $data['emoji'];

            if (isset($reactions[$emoji])) {
                $reactions[$emoji]++;
            } else {
                $reactions[$emoji] = 1;
            }

            $this->db->query(
                "UPDATE chat_messages SET reactions = ? WHERE id = ?",
                [json_encode($reactions), $messageId]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Reaction added',
                'data' => ['reactions' => $reactions]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to add reaction: ' . $e->getMessage()
            ], 500);
        }
    }

    public function deleteMessage(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = $this->getUserId($request);
            $messageId = $args['id'];
            
            $message = $this->db->first(
                "SELECT * FROM chat_messages WHERE id = ? AND user_id = ?",
                [$messageId, $userId]
            );
            
            if (!$message) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Message not found or you do not have permission to delete it'
                ], 404);
            }
            
            $this->db->delete('chat_messages', 'id = ?', [$messageId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Message deleted'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to delete message: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getStats(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            
            $stats = [
                'total_rooms' => $this->db->first(
                    "SELECT COUNT(*) as count FROM chat_participants WHERE user_id = ?",
                    [$userId]
                )['count'] ?? 0,
                'total_messages' => $this->db->first(
                    "SELECT COUNT(*) as count FROM chat_messages WHERE user_id = ?",
                    [$userId]
                )['count'] ?? 0,
                'rooms_activity' => $this->db->all(
                    "SELECT cr.name, COUNT(cm.id) as message_count 
                     FROM chat_rooms cr 
                     JOIN chat_messages cm ON cr.id = cm.room_id 
                     JOIN chat_participants cp ON cr.id = cp.room_id 
                     WHERE cp.user_id = ? 
                     GROUP BY cr.id 
                     ORDER BY message_count DESC 
                     LIMIT 5",
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
                'message' => 'Failed to get chat stats: ' . $e->getMessage()
            ], 500);
        }
    }
}

