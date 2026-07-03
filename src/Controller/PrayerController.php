<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use App\Database;
use Exception;

class PrayerController extends BaseController
{
    public function getAll(Request $request, Response $response): Response
    {
        try {
            $page = (int)($request->getQueryParams()['page'] ?? 1);
            $limit = (int)($request->getQueryParams()['limit'] ?? 20);
            $result = $this->paginate('prayers', $page, $limit);
            
            return $this->jsonResponse([
                'status' => 'success',
                'data' => $result['data'],
                'pagination' => $result['pagination']
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch prayers: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getAllIncludingArchived(Request $request, Response $response): Response
    {
        try {
            $prayers = $this->db->all("SELECT * FROM prayers ORDER BY created_at DESC");
            
            return $this->jsonResponse([
                'status' => 'success',
                'data' => $prayers
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch prayers: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getOne(Request $request, Response $response, array $args): Response
    {
        try {
            $prayer = $this->db->first("SELECT * FROM prayers WHERE id = ?", [$args['id']]);
            
            if (!$prayer) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Prayer request not found'
                ], 404);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $prayer
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch prayer: ' . $e->getMessage()
            ], 500);
        }
    }

    public function submit(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            $userId = $this->getUserId($request);
            
            $required = ['title', 'description'];
            $errors = $this->validateRequired($data, $required);
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $prayerData = [
                'title' => $this->sanitizeString($data['title']),
                'description' => $this->sanitizeString($data['description']),
                'user_id' => $userId,
                'is_anonymous' => isset($data['is_anonymous']) ? (bool)$data['is_anonymous'] : 0,
                'is_public' => isset($data['is_public']) ? (bool)$data['is_public'] : 1,
                'status' => isset($data['status']) && in_array($data['status'], ['pending', 'praying', 'answered', 'archived']) ? $data['status'] : 'pending',
                'priority' => isset($data['priority']) && in_array($data['priority'], ['low', 'medium', 'high']) ? $data['priority'] : 'medium'
            ];

            $prayerId = $this->db->insert('prayers', $prayerData);
            $prayer = $this->db->first("SELECT * FROM prayers WHERE id = ?", [$prayerId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Prayer request submitted successfully',
                'data' => $prayer
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to submit prayer request: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateStatus(Request $request, Response $response, array $args): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            if (!isset($data['status']) || !in_array($data['status'], ['pending', 'praying', 'answered', 'archived', 'approved', 'rejected'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Invalid status. Must be pending, praying, answered, archived, approved, or rejected'
                ], 400);
            }

            $this->db->query(
                "UPDATE prayers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [$data['status'], $args['id']]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Prayer status updated successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update status: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updatePriority(Request $request, Response $response, array $args): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            if (!isset($data['priority']) || !in_array($data['priority'], ['low', 'medium', 'high'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Invalid priority. Must be low, medium, or high'
                ], 400);
            }

            $this->db->query(
                "UPDATE prayers SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [$data['priority'], $args['id']]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Prayer priority updated successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update priority: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getStats(Request $request, Response $response): Response
    {
        try {
            $stats = [
                'total_prayers' => $this->db->first("SELECT COUNT(*) as count FROM prayers")['count'],
                'public_prayers' => $this->db->first("SELECT COUNT(*) as count FROM prayers WHERE is_public = 1")['count'],
                'by_status' => [
                    'pending' => $this->db->first("SELECT COUNT(*) as count FROM prayers WHERE status = 'pending'")['count'],
                    'praying' => $this->db->first("SELECT COUNT(*) as count FROM prayers WHERE status = 'praying'")['count'],
                    'answered' => $this->db->first("SELECT COUNT(*) as count FROM prayers WHERE status = 'answered'")['count'],
                    'archived' => $this->db->first("SELECT COUNT(*) as count FROM prayers WHERE status = 'archived'")['count']
                ],
                'by_priority' => [
                    'high' => $this->db->first("SELECT COUNT(*) as count FROM prayers WHERE priority = 'high'")['count'],
                    'medium' => $this->db->first("SELECT COUNT(*) as count FROM prayers WHERE priority = 'medium'")['count'],
                    'low' => $this->db->first("SELECT COUNT(*) as count FROM prayers WHERE priority = 'low'")['count']
                ]
            ];

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $stats
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get stats: ' . $e->getMessage()
            ], 500);
        }
    }
}

