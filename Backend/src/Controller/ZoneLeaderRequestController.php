<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Exception;

class ZoneLeaderRequestController extends BaseController
{
    /**
     * Check if table exists
     */
    private function tableExists($tableName): bool
    {
        try {
            $result = $this->db->first(
                "SELECT COUNT(*) AS total
                 FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
                [$tableName]
            );
            return (int)($result['total'] ?? 0) > 0;
        } catch (Exception $e) {
            return false;
        }
    }
    /**
     * Member requests to become zone leader
     */
    public function requestZoneLeader(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $data = json_decode($request->getBody()->getContents(), true);

            $required = ['zone_id'];
            $errors = $this->validateRequired($data, $required);
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            // Check if table exists
            if (!$this->tableExists('zone_leader_requests')) {
                return $this->jsonResponse([
                    'status' => 'table_not_found',
                    'message' => 'The zone_leader_requests table has not been initialized. Run database migrations.',
                ], 200);
            }

            // Check if user is a member
            $role = $request->getAttribute('role');
            if ($role !== 'member') {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only members can request to be zone leaders'
                ], 403);
            }

            // Check if zone exists
            $zone = $this->db->first("SELECT * FROM zones WHERE id = ?", [$data['zone_id']]);
            if (!$zone) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Zone not found'
                ], 404);
            }

            // Check if already a zone leader or has pending request
            $existing = $this->db->first(
                "SELECT * FROM zone_leader_requests WHERE user_id = ? AND zone_id = ? AND status IN ('pending', 'approved')",
                [$userId, $data['zone_id']]
            );
            
            if ($existing) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'You already have a pending or approved request for this zone'
                ], 400);
            }

            // Create request
            $requestId = $this->db->insert('zone_leader_requests', [
                'user_id' => $userId,
                'zone_id' => (int)$data['zone_id'],
                'motivation' => $data['motivation'] ?? null,
                'status' => 'pending',
                'requested_at' => date('Y-m-d H:i:s'),
                'reviewed_by' => null,
                'reviewed_at' => null
            ]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Zone leader request submitted successfully',
                'data' => [
                    'id' => $requestId,
                    'user_id' => $userId,
                    'zone_id' => $data['zone_id'],
                    'status' => 'pending'
                ]
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to submit request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get pending zone leader requests (leadership only)
     */
    public function getPendingRequests(Request $request, Response $response): Response
    {
        try {
            $role = $request->getAttribute('role');
            if (!in_array($role, ['admin', 'pastor', 'superadmin'], true)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only admin, pastor, or superadmin can view zone leader requests'
                ], 403);
            }

            // Check if table exists
            if (!$this->tableExists('zone_leader_requests')) {
                return $this->jsonResponse([
                    'status' => 'table_not_found',
                    'message' => 'The zone_leader_requests table has not been initialized. Run database migrations.',
                    'data' => [],
                    'count' => 0
                ], 200);
            }

            $requests = $this->db->all(
                "SELECT zlr.*,
                        u.first_name, u.last_name, u.email, u.phone,
                        (u.first_name || ' ' || u.last_name) as member_name,
                        u.email as member_email,
                        z.name as zone_name,
                        ru.first_name as reviewer_first_name, ru.last_name as reviewer_last_name
                 FROM zone_leader_requests zlr
                 JOIN users u ON zlr.user_id = u.id
                 JOIN zones z ON zlr.zone_id = z.id
                 LEFT JOIN users ru ON zlr.reviewed_by = ru.id
                 WHERE zlr.status IN ('pending', 'approved', 'rejected')
                 ORDER BY zlr.status = 'pending' DESC, zlr.requested_at DESC"
            );

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $requests,
                'count' => count($requests)
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get requests: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve zone leader request (leadership only)
     */
    public function approveRequest(Request $request, Response $response, array $args): Response
    {
        try {
            $requestId = (int)$args['id'];
            $userId = $this->getUserId($request);
            
            $role = $request->getAttribute('role');
            if (!in_array($role, ['admin', 'pastor', 'superadmin'], true)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only admin, pastor, or superadmin can approve zone leader requests'
                ], 403);
            }

            // Check if table exists
            if (!$this->tableExists('zone_leader_requests')) {
                return $this->jsonResponse([
                    'status' => 'table_not_found',
                    'message' => 'The zone_leader_requests table has not been initialized'
                ], 200);
            }

            // Get request
            $zlRequest = $this->db->first("SELECT * FROM zone_leader_requests WHERE id = ?", [$requestId]);
            if (!$zlRequest) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Request not found'
                ], 404);
            }

            if ($zlRequest['status'] !== 'pending') {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Request has already been reviewed'
                ], 400);
            }

            // Begin transaction
            $this->db->query("BEGIN");

            try {
                $previousLeader = $this->db->first("SELECT zone_leader_id FROM zones WHERE id = ?", [$zlRequest['zone_id']]);

                // Update request status
                $this->db->query(
                    "UPDATE zone_leader_requests SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?",
                    ['approved', $userId, $requestId]
                );

                // Update user role to zone_leader
                $this->db->query(
                    "UPDATE users SET role = ?, zone_id = ?, cell_id = NULL WHERE id = ?",
                    ['zone_leader', $zlRequest['zone_id'], $zlRequest['user_id']]
                );

                // Assign user to zone
                $this->db->query(
                    "UPDATE users SET zone_id = ?, cell_id = NULL WHERE id = ?",
                    [$zlRequest['zone_id'], $zlRequest['user_id']]
                );

                $this->db->query(
                    "UPDATE members SET zone_id = ?, cell_id = NULL WHERE user_id = ?",
                    [$zlRequest['zone_id'], $zlRequest['user_id']]
                );

                // Assign user as zone leader
                $this->db->query(
                    "UPDATE zones SET zone_leader_id = ? WHERE id = ?",
                    [$zlRequest['user_id'], $zlRequest['zone_id']]
                );

                $this->db->insert('activity_logs', [
                    'user_id' => $userId,
                    'action' => 'leader_promoted',
                    'entity_type' => 'user',
                    'entity_id' => (int)$zlRequest['user_id'],
                    'details' => json_encode([
                        'new_role' => 'zone_leader',
                        'zone_id' => (int)$zlRequest['zone_id'],
                    'source' => 'zone_leader_request'
                    ])
                ]);

                $this->db->query("COMMIT");

                if (!empty($previousLeader['zone_leader_id']) && (int)$previousLeader['zone_leader_id'] !== (int)$zlRequest['user_id']) {
                    $oldLeader = $this->db->first("SELECT role FROM users WHERE id = ?", [(int)$previousLeader['zone_leader_id']]);
                    if ($oldLeader && !in_array($oldLeader['role'] ?? '', ['admin', 'pastor', 'superadmin'], true)) {
                        $hasZone = $this->db->first("SELECT id FROM zones WHERE zone_leader_id = ? LIMIT 1", [(int)$previousLeader['zone_leader_id']]);
                        $hasCell = $this->db->first("SELECT id FROM cells WHERE cell_leader_id = ? LIMIT 1", [(int)$previousLeader['zone_leader_id']]);
                        $newRole = $hasZone ? 'zone_leader' : ($hasCell ? 'cell_leader' : 'member');
                        $this->db->query(
                            "UPDATE users SET role = ? WHERE id = ?",
                            [$newRole, (int)$previousLeader['zone_leader_id']]
                        );
                    }
                }

                $promotedUser = $this->db->first(
                    "SELECT id, first_name, last_name, email, role FROM users WHERE id = ?",
                    [$zlRequest['user_id']]
                );
                if ($promotedUser) {
                    $notificationService = new \App\Service\PastorNotificationService($this->db);
                    $zone = $this->db->first("SELECT name FROM zones WHERE id = ?", [$zlRequest['zone_id']]);
                    $notificationService->notifyLeadershipPromotion($promotedUser, 'zone_leader', [
                        'assignment' => 'Zone: ' . ($zone['name'] ?? 'Zone')
                    ]);
                }

                return $this->jsonResponse([
                    'status' => 'success',
                    'message' => 'Zone leader request approved successfully'
                ]);

            } catch (Exception $e) {
                $this->db->query("ROLLBACK");
                throw $e;
            }

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to approve request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject zone leader request (leadership only)
     */
    public function rejectRequest(Request $request, Response $response, array $args): Response
    {
        try {
            $requestId = (int)$args['id'];
            $userId = $this->getUserId($request);
            $data = json_decode($request->getBody()->getContents(), true);
            
            $role = $request->getAttribute('role');
            if (!in_array($role, ['admin', 'pastor', 'superadmin'], true)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only admin, pastor, or superadmin can reject zone leader requests'
                ], 403);
            }

            // Check if table exists
            if (!$this->tableExists('zone_leader_requests')) {
                return $this->jsonResponse([
                    'status' => 'table_not_found',
                    'message' => 'The zone_leader_requests table has not been initialized'
                ], 200);
            }

            // Get request
            $zlRequest = $this->db->first("SELECT * FROM zone_leader_requests WHERE id = ?", [$requestId]);
            if (!$zlRequest) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Request not found'
                ], 404);
            }

            if ($zlRequest['status'] !== 'pending') {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Request has already been reviewed'
                ], 400);
            }

            // Update request status
            $this->db->query(
                "UPDATE zone_leader_requests SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ? WHERE id = ?",
                ['rejected', $userId, $data['reason'] ?? null, $requestId]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Zone leader request rejected successfully'
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to reject request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user's own requests
     */
    public function getMyRequests(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);

            // Check if table exists
            if (!$this->tableExists('zone_leader_requests')) {
                return $this->jsonResponse([
                    'status' => 'table_not_found',
                    'message' => 'The zone_leader_requests table has not been initialized',
                    'data' => []
                ], 200);
            }

            $requests = $this->db->all(
                "SELECT zlr.*, z.name as zone_name
                 FROM zone_leader_requests zlr
                 JOIN zones z ON zlr.zone_id = z.id
                 WHERE zlr.user_id = ?
                 ORDER BY zlr.requested_at DESC",
                [$userId]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $requests
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get requests: ' . $e->getMessage()
            ], 500);
        }
    }
}
