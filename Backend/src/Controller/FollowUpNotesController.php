<?php

namespace App\Controller;

use Exception;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class FollowUpNotesController extends BaseController
{
    public function getAll(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $user = $this->db->first("SELECT role, zone_id, cell_id FROM users WHERE id = ?", [$userId]);
            $params = $request->getQueryParams();

            $sql = "SELECT n.*,
                           m.first_name,
                           m.last_name,
                           m.email,
                           m.phone,
                           author.first_name AS author_first_name,
                           author.last_name AS author_last_name
                    FROM follow_up_notes n
                    JOIN members m ON n.member_id = m.id
                    LEFT JOIN users author ON n.created_by = author.id
                    WHERE 1 = 1";
            $queryParams = [];

            if (!empty($params['member_id'])) {
                $sql .= " AND n.member_id = ?";
                $queryParams[] = (int)$params['member_id'];
            }

            if (!empty($params['status'])) {
                $sql .= " AND n.status = ?";
                $queryParams[] = $params['status'];
            }

            if ($user && !in_array($user['role'], ['admin', 'superadmin', 'pastor', 'elder'], true)) {
                if ($user['role'] === 'zone_leader' && !empty($user['zone_id'])) {
                    $sql .= " AND EXISTS (SELECT 1 FROM users u WHERE u.id = m.user_id AND u.zone_id = ?)";
                    $queryParams[] = (int)$user['zone_id'];
                } elseif ($user['role'] === 'cell_leader' && !empty($user['cell_id'])) {
                    $sql .= " AND EXISTS (SELECT 1 FROM users u WHERE u.id = m.user_id AND u.cell_id = ?)";
                    $queryParams[] = (int)$user['cell_id'];
                } else {
                    $sql .= " AND n.created_by = ?";
                    $queryParams[] = $userId;
                }
            }

            $sql .= " ORDER BY COALESCE(n.follow_up_date, n.created_at) DESC, n.created_at DESC";
            $notes = $this->db->all($sql, $queryParams);

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $notes
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch follow-up notes: ' . $e->getMessage()
            ], 500);
        }
    }

    public function create(Request $request, Response $response): Response
    {
        try {
            $payload = json_decode($request->getBody()->getContents(), true) ?? [];
            $userId = $this->getUserId($request);
            $required = ['member_id', 'note'];
            $errors = $this->validateRequired($payload, $required);

            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $noteId = $this->db->insert('follow_up_notes', [
                'member_id' => (int)$payload['member_id'],
                'created_by' => $userId,
                'note' => $this->sanitizeString($payload['note']),
                'contact_method' => !empty($payload['contact_method']) ? $this->sanitizeString($payload['contact_method']) : null,
                'status' => !empty($payload['status']) ? $this->sanitizeString($payload['status']) : 'open',
                'follow_up_date' => !empty($payload['follow_up_date']) ? $payload['follow_up_date'] : null,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Follow-up note created successfully',
                'data' => ['id' => $noteId]
            ], 201);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to create follow-up note: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        try {
            $id = (int)$args['id'];
            $payload = json_decode($request->getBody()->getContents(), true) ?? [];

            $existing = $this->db->first("SELECT id FROM follow_up_notes WHERE id = ?", [$id]);
            if (!$existing) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Follow-up note not found'
                ], 404);
            }

            $updates = [];
            if (array_key_exists('note', $payload)) {
                $updates['note'] = $this->sanitizeString((string)$payload['note']);
            }
            if (array_key_exists('contact_method', $payload)) {
                $updates['contact_method'] = !empty($payload['contact_method']) ? $this->sanitizeString((string)$payload['contact_method']) : null;
            }
            if (array_key_exists('status', $payload)) {
                $updates['status'] = $this->sanitizeString((string)$payload['status']);
            }
            if (array_key_exists('follow_up_date', $payload)) {
                $updates['follow_up_date'] = !empty($payload['follow_up_date']) ? $payload['follow_up_date'] : null;
            }
            $updates['updated_at'] = date('Y-m-d H:i:s');

            $this->db->update('follow_up_notes', $updates, 'id = ?', [$id]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Follow-up note updated successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update follow-up note: ' . $e->getMessage()
            ], 500);
        }
    }
}
