<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use App\Database;
use Exception;

class AbsenceController extends BaseController
{
    /**
     * Get flagged members (absent 2+ Sundays)
     */
    public function getFlags(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $user = $this->db->first("SELECT role, zone_id, cell_id FROM users WHERE id = ?", [$userId]);
            
            $params = $request->getQueryParams();
            $status = $params['status'] ?? 'active'; // active, resolved
            
            $sql = "SELECT af.*, 
                           u.first_name, 
                           u.last_name, 
                           u.email, 
                           u.phone, 
                           u.role,
                           u.cell_id,
                           u.zone_id,
                           c.name as cell_name,
                           z.name as zone_name
                    FROM absence_flags af
                    JOIN users u ON af.user_id = u.id
                    LEFT JOIN cells c ON u.cell_id = c.id
                    LEFT JOIN zones z ON u.zone_id = z.id
                    WHERE af.resolved_at IS NULL";
            
            $queryParams = [];
            
            // Filter by zone for zone leaders
            if ($user['role'] === 'zone_leader' && $user['zone_id']) {
                $sql .= " AND u.zone_id = ?";
                $queryParams[] = $user['zone_id'];
            }
            
            $sql .= " ORDER BY af.flagged_at DESC";
            
            $flags = $this->db->all($sql, $queryParams);

            // Get recent attendance for each flagged member
            foreach ($flags as &$flag) {
                $recentAttendance = $this->db->all(
                    "SELECT attendance_date FROM attendance_sunday 
                     WHERE user_id = ? 
                     ORDER BY attendance_date DESC LIMIT 10",
                    [$flag['user_id']]
                );
                $flag['recent_attendance'] = array_column($recentAttendance, 'attendance_date');
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $flags,
                'count' => count($flags)
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get absence flags: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Resolve absence flag
     */
    public function resolveFlag(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            $userId = $this->getUserId($request);
            
            $required = ['flag_id', 'resolution_notes'];
            $errors = $this->validateRequired($data, $required);
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $flagId = (int)$data['flag_id'];
            $resolutionNotes = $data['resolution_notes'];

            // Check permissions (cell leader of member's cell, zone leader, or admin/pastor)
            $flag = $this->db->first(
                "SELECT af.*, u.cell_id, u.zone_id FROM absence_flags af 
                 JOIN users u ON af.user_id = u.id 
                 WHERE af.id = ? AND af.resolved_at IS NULL",
                [$flagId]
            );

            if (!$flag) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Flag not found or already resolved'
                ], 404);
            }

            $resolver = $this->db->first("SELECT role, cell_id, zone_id FROM users WHERE id = ?", [$userId]);
            
            $isCellLeader = $resolver['cell_id'] == $flag['cell_id'];
            $isZoneLeader = $resolver['zone_id'] == $flag['zone_id'];
            $isAdmin = in_array($resolver['role'], ['admin', 'pastor', 'superadmin']);
            
            if (!$isCellLeader && !$isZoneLeader && !$isAdmin) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'You can only resolve flags for members in your cell/zone'
                ], 403);
            }

            // Resolve flag
            $this->db->query(
                "UPDATE absence_flags SET resolved_at = CURRENT_TIMESTAMP, resolved_by = ? WHERE id = ?",
                [$userId, $flagId]
            );

            // Log activity
            $this->logActivity($userId, 'absence_resolved', 'absence_flag', $flagId, [
                'member_id' => $flag['user_id'],
                'notes' => $resolutionNotes
            ]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Absence flag resolved successfully'
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to resolve flag: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Pre-mark absence (member requests absence)
     */
    public function preMarkAbsence(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            $userId = $this->getUserId($request);
            
            $required = ['absence_date', 'reason'];
            $errors = $this->validateRequired($data, $required);
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $absenceDate = $data['absence_date'];
            $reason = $this->sanitizeString($data['reason']);

            // Validate date is in future
            if (strtotime($absenceDate) <= time()) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Absence date must be in the future'
                ], 400);
            }

            // Check if already requested
            $existing = $this->db->first(
                "SELECT * FROM absence_requests 
                 WHERE user_id = ? AND absence_date = ? AND status = 'pending'",
                [$userId, $absenceDate]
            );

            if ($existing) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'You already have a pending request for this date'
                ], 409);
            }

            // Create request
            $this->db->insert('absence_requests', [
                'user_id' => $userId,
                'absence_date' => $absenceDate,
                'reason' => $reason,
                'status' => 'pending'
            ]);

            // Notify cell leader
            $this->notifyCellLeader($userId, $absenceDate, $reason);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Absence request submitted successfully'
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to submit absence request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get my absence requests
     */
    public function getMyRequests(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            
            $requests = $this->db->all(
                "SELECT ar.*, 
                        u.first_name as processed_by_first_name,
                        u.last_name as processed_by_last_name
                 FROM absence_requests ar
                 LEFT JOIN users u ON ar.processed_by = u.id
                 WHERE ar.user_id = ?
                 ORDER BY ar.created_at DESC
                 LIMIT 20",
                [$userId]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $requests
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get absence requests: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process absence request (approve/decline) - for cell leaders and admins
     */
    public function processRequest(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            $userId = $this->getUserId($request);
            
            $required = ['request_id', 'status'];
            $errors = $this->validateRequired($data, $required);
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $requestId = (int)$data['request_id'];
            $status = $data['status']; // approved, declined
            
            if (!in_array($status, ['approved', 'declined'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Invalid status. Must be approved or declined'
                ], 400);
            }

            // Get request and member info
            $absenceRequest = $this->db->first(
                "SELECT ar.*, u.cell_id, u.zone_id 
                 FROM absence_requests ar
                 JOIN users u ON ar.user_id = u.id
                 WHERE ar.id = ? AND ar.status = 'pending'",
                [$requestId]
            );

            if (!$absenceRequest) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Request not found or already processed'
                ], 404);
            }

            // Check permissions
            $processor = $this->db->first("SELECT role, cell_id, zone_id FROM users WHERE id = ?", [$userId]);
            
            $isCellLeader = $processor['cell_id'] == $absenceRequest['cell_id'];
            $isZoneLeader = $processor['zone_id'] == $absenceRequest['zone_id'];
            $isAdmin = in_array($processor['role'], ['admin', 'pastor', 'superadmin']);
            
            if (!$isCellLeader && !$isZoneLeader && !$isAdmin) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'You can only process requests for your cell/zone'
                ], 403);
            }

            // Update request
            $this->db->query(
                "UPDATE absence_requests SET status = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?",
                [$status, $userId, $requestId]
            );

            // Log activity
            $this->logActivity($userId, 'absence_request_' . $status, 'absence_request', $requestId, [
                'member_id' => $absenceRequest['user_id'],
                'absence_date' => $absenceRequest['absence_date']
            ]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => "Absence request $status successfully"
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to process request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get absence summary for dashboard
     */
    public function getSummary(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $user = $this->db->first("SELECT role, zone_id, cell_id FROM users WHERE id = ?", [$userId]);
            
            // Build query based on role
            $sql = "SELECT 
                        COUNT(*) as total_flags,
                        COUNT(CASE WHEN consecutive_sunday_misses >= 3 THEN 1 END) as critical,
                        COUNT(CASE WHEN DATE(flagged_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as new_this_week
                    FROM absence_flags af
                    JOIN users u ON af.user_id = u.id
                    WHERE af.resolved_at IS NULL";
            
            $params = [];
            
            if ($user['role'] === 'zone_leader' && $user['zone_id']) {
                $sql .= " AND u.zone_id = ?";
                $params[] = $user['zone_id'];
            } elseif ($user['role'] === 'cell_leader' && $user['cell_id']) {
                $sql .= " AND u.cell_id = ?";
                $params[] = $user['cell_id'];
            }
            
            $summary = $this->db->first($sql, $params);

            // Get pending absence requests
            $requestsSql = "SELECT COUNT(*) as count FROM absence_requests ar
                            JOIN users u ON ar.user_id = u.id
                            WHERE ar.status = 'pending'";
            
            if ($user['role'] === 'zone_leader' && $user['zone_id']) {
                $requestsSql .= " AND u.zone_id = ?";
                $params[] = $user['zone_id'];
            } elseif ($user['role'] === 'cell_leader' && $user['cell_id']) {
                $requestsSql .= " AND u.cell_id = ?";
                $params[] = $user['cell_id'];
            }
            
            $requests = $this->db->first($requestsSql, $params);

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'absence_flags' => $summary,
                    'pending_requests' => $requests['count'] ?? 0
                ]
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get summary: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Notify cell leader about absence request
     */
    private function notifyCellLeader(int $memberId, string $absenceDate, string $reason): void
    {
        $member = $this->db->first(
            "SELECT u.cell_id, u.first_name, u.last_name, c.cell_leader_id 
             FROM users u 
             LEFT JOIN cells c ON u.cell_id = c.id 
             WHERE u.id = ?",
            [$memberId]
        );

        if (!$member || !$member['cell_leader_id']) {
            return;
        }

        $cellLeader = $this->db->first(
            "SELECT email, first_name, last_name FROM users WHERE id = ?",
            [$member['cell_leader_id']]
        );

        if (!$cellLeader) {
            return;
        }

        // Create notification (could also send email)
        $this->db->insert('notifications', [
            'user_id' => $member['cell_leader_id'],
            'title' => 'Absence Request',
            'message' => "{$member['first_name']} {$member['last_name']} requested absence on $absenceDate. Reason: $reason",
            'type' => 'absence_request'
        ]);
    }

    /**
     * Log activity
     */
    private function logActivity(int $userId, string $action, string $entityType, ?int $entityId, array $details = []): void
    {
        try {
            $this->db->insert('activity_logs', [
                'user_id' => $userId,
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'details' => json_encode($details)
            ]);
        } catch (Exception $e) {
            error_log('Failed to log activity: ' . $e->getMessage());
        }
    }
}
