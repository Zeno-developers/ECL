<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Exception;

class CellChangeRequestController extends BaseController
{
    public function requestChange(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $role = $request->getAttribute('role');
            $data = json_decode($request->getBody()->getContents(), true) ?: [];

            if ($role !== 'member') {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only members can request a cell change'
                ], 403);
            }

            $required = ['requested_cell_id', 'reason'];
            $errors = $this->validateRequired($data, $required);
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $requestedCellId = (int)$data['requested_cell_id'];
            $member = $this->db->first(
                "SELECT u.id, u.cell_id, u.zone_id, u.first_name, u.last_name, m.id as member_id
                 FROM users u
                 LEFT JOIN members m ON m.user_id = u.id
                 WHERE u.id = ?",
                [$userId]
            );

            if (!$member) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Member account not found'
                ], 404);
            }

            if ((int)($member['cell_id'] ?? 0) === $requestedCellId) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'You are already assigned to that cell'
                ], 409);
            }

            $targetCell = $this->db->first(
                "SELECT id, name, zone_id, max_members,
                        (SELECT COUNT(*) FROM users WHERE cell_id = cells.id AND is_active = 1) as member_count
                 FROM cells
                 WHERE id = ? AND is_active = 1",
                [$requestedCellId]
            );

            if (!$targetCell) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Requested cell not found'
                ], 404);
            }

            if ((int)($targetCell['member_count'] ?? 0) >= (int)($targetCell['max_members'] ?? 5)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Requested cell is already at capacity'
                ], 409);
            }

            $existing = $this->db->first(
                "SELECT id FROM cell_change_requests WHERE user_id = ? AND status = 'pending'",
                [$userId]
            );

            if ($existing) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'You already have a pending cell change request'
                ], 409);
            }

            $requestId = $this->db->insert('cell_change_requests', [
                'user_id' => $userId,
                'current_cell_id' => $member['cell_id'] ?: null,
                'requested_cell_id' => $requestedCellId,
                'reason' => $this->sanitizeString((string)$data['reason']),
                'status' => 'pending'
            ]);

            $leadershipRecipients = $this->db->all(
                "SELECT id FROM users
                 WHERE is_active = 1 AND (
                    role IN ('admin', 'pastor', 'superadmin')
                    OR (role = 'zone_leader' AND zone_id = ?)
                    OR (role = 'cell_leader' AND cell_id = ?)
                 )",
                [$targetCell['zone_id'] ?? 0, $member['cell_id'] ?? 0]
            );

            foreach ($leadershipRecipients as $recipient) {
                $this->db->insert('notifications', [
                    'user_id' => (int)$recipient['id'],
                    'title' => 'New Cell Change Request',
                    'message' => "{$member['first_name']} {$member['last_name']} requested to move to {$targetCell['name']}.",
                    'type' => 'cell_change_request'
                ]);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Cell change request submitted successfully',
                'data' => [
                    'id' => $requestId,
                    'requested_cell_id' => $requestedCellId,
                    'status' => 'pending'
                ]
            ], 201);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to submit cell change request: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getMyRequests(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $requests = $this->db->all(
                "SELECT ccr.*,
                        current_cell.name as current_cell_name,
                        requested_cell.name as requested_cell_name,
                        z.name as requested_zone_name,
                        processor.first_name as processed_by_first_name,
                        processor.last_name as processed_by_last_name
                 FROM cell_change_requests ccr
                 LEFT JOIN cells current_cell ON current_cell.id = ccr.current_cell_id
                 LEFT JOIN cells requested_cell ON requested_cell.id = ccr.requested_cell_id
                 LEFT JOIN zones z ON z.id = requested_cell.zone_id
                 LEFT JOIN users processor ON processor.id = ccr.processed_by
                 WHERE ccr.user_id = ?
                 ORDER BY ccr.requested_at DESC",
                [$userId]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $requests
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get cell change requests: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getPendingRequests(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $viewer = $this->db->first("SELECT role, zone_id, cell_id FROM users WHERE id = ?", [$userId]);

            if (!$viewer || !in_array($viewer['role'], ['cell_leader', 'zone_leader', 'admin', 'pastor', 'superadmin'], true)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'You do not have permission to view cell change requests'
                ], 403);
            }

            $sql = "SELECT ccr.*,
                           u.first_name,
                           u.last_name,
                           u.email,
                           current_cell.name as current_cell_name,
                           requested_cell.name as requested_cell_name,
                           z.name as requested_zone_name
                    FROM cell_change_requests ccr
                    JOIN users u ON u.id = ccr.user_id
                    LEFT JOIN cells current_cell ON current_cell.id = ccr.current_cell_id
                    LEFT JOIN cells requested_cell ON requested_cell.id = ccr.requested_cell_id
                    LEFT JOIN zones z ON z.id = requested_cell.zone_id
                    WHERE ccr.status = 'pending'";
            $params = [];

            if ($viewer['role'] === 'zone_leader') {
                $sql .= " AND (u.zone_id = ? OR requested_cell.zone_id = ?)";
                $params[] = $viewer['zone_id'];
                $params[] = $viewer['zone_id'];
            } elseif ($viewer['role'] === 'cell_leader') {
                $sql .= " AND (u.cell_id = ? OR ccr.requested_cell_id = ?)";
                $params[] = $viewer['cell_id'];
                $params[] = $viewer['cell_id'];
            }

            $sql .= " ORDER BY ccr.requested_at DESC";
            $requests = $this->db->all($sql, $params);

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $requests,
                'count' => count($requests)
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to load pending cell change requests: ' . $e->getMessage()
            ], 500);
        }
    }

    public function processRequest(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $viewer = $this->db->first("SELECT role, zone_id, cell_id, first_name, last_name FROM users WHERE id = ?", [$userId]);
            $data = json_decode($request->getBody()->getContents(), true) ?: [];

            $required = ['request_id', 'status'];
            $errors = $this->validateRequired($data, $required);
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $status = $data['status'];
            if (!in_array($status, ['approved', 'rejected'], true)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Status must be approved or rejected'
                ], 400);
            }

            if (!$viewer || !in_array($viewer['role'], ['cell_leader', 'zone_leader', 'admin', 'pastor', 'superadmin'], true)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'You do not have permission to process requests'
                ], 403);
            }

            $requestId = (int)$data['request_id'];
            $changeRequest = $this->db->first(
                "SELECT ccr.*, u.zone_id as user_zone_id, u.cell_id as user_cell_id,
                        requested_cell.zone_id as requested_zone_id, requested_cell.max_members,
                        (SELECT COUNT(*) FROM users WHERE cell_id = ccr.requested_cell_id AND is_active = 1) as requested_cell_count
                 FROM cell_change_requests ccr
                 JOIN users u ON u.id = ccr.user_id
                 JOIN cells requested_cell ON requested_cell.id = ccr.requested_cell_id
                 WHERE ccr.id = ?",
                [$requestId]
            );

            if (!$changeRequest || $changeRequest['status'] !== 'pending') {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Pending cell change request not found'
                ], 404);
            }

            $canProcess = in_array($viewer['role'], ['admin', 'pastor', 'superadmin'], true)
                || ($viewer['role'] === 'zone_leader' && (
                    (int)$viewer['zone_id'] === (int)$changeRequest['user_zone_id']
                    || (int)$viewer['zone_id'] === (int)$changeRequest['requested_zone_id']
                ))
                || ($viewer['role'] === 'cell_leader' && (
                    (int)$viewer['cell_id'] === (int)$changeRequest['user_cell_id']
                    || (int)$viewer['cell_id'] === (int)$changeRequest['requested_cell_id']
                ));

            if (!$canProcess) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'You can only process requests for your own cell or zone'
                ], 403);
            }

            $this->db->beginTransaction();

            if ($status === 'approved') {
                if ((int)($changeRequest['requested_cell_count'] ?? 0) >= (int)($changeRequest['max_members'] ?? 5)) {
                    $this->db->rollBack();
                    return $this->jsonResponse([
                        'status' => 'error',
                        'message' => 'Requested cell is now full'
                    ], 409);
                }

                $this->db->query(
                    "UPDATE users SET cell_id = ?, zone_id = ? WHERE id = ?",
                    [$changeRequest['requested_cell_id'], $changeRequest['requested_zone_id'], $changeRequest['user_id']]
                );
                $this->db->query(
                    "UPDATE members SET cell_id = ?, zone_id = ? WHERE user_id = ?",
                    [$changeRequest['requested_cell_id'], $changeRequest['requested_zone_id'], $changeRequest['user_id']]
                );
            }

            $this->db->query(
                "UPDATE cell_change_requests
                 SET status = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP
                 WHERE id = ?",
                [$status, $userId, $requestId]
            );

            $this->db->insert('notifications', [
                'user_id' => (int)$changeRequest['user_id'],
                'title' => 'Cell Change Request Updated',
                'message' => $status === 'approved'
                    ? 'Your cell change request has been approved.'
                    : 'Your cell change request has been rejected.',
                'type' => 'cell_change_request'
            ]);

            $this->db->commit();

            return $this->jsonResponse([
                'status' => 'success',
                'message' => "Cell change request {$status} successfully"
            ]);
        } catch (Exception $e) {
            if ($this->db->getConnection()->inTransaction()) {
                $this->db->rollBack();
            }

            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to process cell change request: ' . $e->getMessage()
            ], 500);
        }
    }
}
