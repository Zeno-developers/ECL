<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use App\Database;
use Exception;

class CellsController extends BaseController
{
    private array $assignableCellLeaderRoles = ['cell_leader', 'pastor', 'admin', 'superadmin', 'elder'];
    private array $allowedMeetingDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    private function canManageCellStructure(array $user, ?int $zoneId = null): bool
    {
        if (in_array($user['role'] ?? '', ['admin', 'pastor', 'superadmin'], true)) {
            return true;
        }

        return ($user['role'] ?? '') === 'zone_leader'
            && $zoneId !== null
            && (int)($user['zone_id'] ?? 0) === (int)$zoneId;
    }

    private function normalizeMeetingDay(?string $meetingDay): string
    {
        $normalized = strtolower(trim((string)$meetingDay));
        return in_array($normalized, $this->allowedMeetingDays, true) ? $normalized : 'monday';
    }

    private function recalculateLeadershipRole(int $userId): void
    {
        $user = $this->db->first("SELECT role FROM users WHERE id = ?", [$userId]);
        if (!$user) {
            return;
        }

        if (in_array($user['role'] ?? '', ['admin', 'pastor', 'superadmin'], true)) {
            return;
        }

        $zoneLeader = $this->db->first("SELECT id FROM zones WHERE zone_leader_id = ? LIMIT 1", [$userId]);
        if ($zoneLeader) {
            $this->db->query(
                "UPDATE users SET role = 'zone_leader', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [$userId]
            );
            return;
        }

        $cellLeader = $this->db->first("SELECT id FROM cells WHERE cell_leader_id = ? LIMIT 1", [$userId]);
        if ($cellLeader) {
            $this->db->query(
                "UPDATE users SET role = 'cell_leader', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [$userId]
            );
            return;
        }

        $this->db->query(
            "UPDATE users SET role = 'member', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [$userId]
        );
    }
    /**
     * Get all cells with optional filtering
     */
    public function getAll(Request $request, Response $response): Response
    {
        try {
            $params = $request->getQueryParams();
            $zoneId = $params['zone_id'] ?? null;
            $isActive = $params['is_active'] ?? 1; // Default to active cells

            $sql = "SELECT c.*, 
                           u.first_name as leader_first_name,
                           u.last_name as leader_last_name,
                           u.email as leader_email,
                           u.phone as leader_phone,
                           z.name as zone_name,
                           (SELECT COUNT(*) FROM users WHERE cell_id = c.id AND is_active = 1) as member_count
                    FROM cells c
                    LEFT JOIN users u ON c.cell_leader_id = u.id
                    LEFT JOIN zones z ON c.zone_id = z.id
                    WHERE c.is_active = ?";
            
            $queryParams = [$isActive];
            
            if ($zoneId) {
                $sql .= " AND c.zone_id = ?";
                $queryParams[] = $zoneId;
            }
            
            $sql .= " ORDER BY c.name ASC";
            
            $cells = $this->db->all($sql, $queryParams);

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $cells,
                'count' => count($cells)
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get cells: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single cell by ID
     */
    public function getOne(Request $request, Response $response, array $args): Response
    {
        try {
            $cellId = (int)$args['id'];
            
            $cell = $this->db->first(
                "SELECT c.*, 
                        u.first_name as leader_first_name,
                        u.last_name as leader_last_name,
                        u.email as leader_email,
                        u.phone as leader_phone,
                        z.name as zone_name
                 FROM cells c
                 LEFT JOIN users u ON c.cell_leader_id = u.id
                 LEFT JOIN zones z ON c.zone_id = z.id
                 WHERE c.id = ?",
                [$cellId]
            );

            if (!$cell) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Cell not found'
                ], 404);
            }

            // Get members in this cell
            $members = $this->db->all(
                "SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, m.member_number 
                 FROM users u
                 LEFT JOIN members m ON u.id = m.user_id
                 WHERE u.cell_id = ? AND u.is_active = 1
                 ORDER BY u.last_name ASC",
                [$cellId]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'cell' => $cell,
                    'members' => $members,
                    'member_count' => count($members)
                ]
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get cell: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new cell
     */
    public function create(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            $userId = $this->getUserId($request);
            
            $required = ['name'];
            $errors = $this->validateRequired($data, $required);
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $zoneId = isset($data['zone_id']) && $data['zone_id'] !== null ? (int)$data['zone_id'] : null;
            $user = $this->db->first("SELECT role, zone_id FROM users WHERE id = ?", [$userId]);
            if (!$this->canManageCellStructure($user ?? [], $zoneId)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only admin, pastor, superadmin, or the assigned zone leader can create cells'
                ], 403);
            }

            $cellId = $this->db->insert('cells', [
                'name' => $this->sanitizeString($data['name']),
                'cell_leader_id' => $data['cell_leader_id'] ?? null,
                'zone_id' => $zoneId,
                'max_members' => $data['max_members'] ?? 5,
                'meeting_day' => $this->normalizeMeetingDay($data['meeting_day'] ?? 'monday'),
                'meeting_time' => $data['meeting_time'] ?? '19:00:00',
                'meeting_location' => $data['meeting_location'] ?? null,
                'is_active' => $data['is_active'] ?? 1
            ]);

            // If cell leader assigned, update their cell_id
            if (isset($data['cell_leader_id']) && $data['cell_leader_id']) {
                $this->db->query(
                    "UPDATE users SET cell_id = ? WHERE id = ?",
                    [$cellId, $data['cell_leader_id']]
                );
            }

            $this->db->insert('activity_logs', [
                'user_id' => $userId,
                'action' => 'cell_created',
                'entity_type' => 'cell',
                'entity_id' => $cellId,
                'details' => json_encode([
                    'name' => $data['name'],
                    'zone_id' => $data['zone_id'] ?? null,
                    'max_members' => $data['max_members'] ?? 5
                ])
            ]);

            $cell = $this->db->first("SELECT * FROM cells WHERE id = ?", [$cellId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Cell created successfully',
                'data' => $cell
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to create cell: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update cell
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        try {
            $cellId = (int)$args['id'];
            $data = json_decode($request->getBody()->getContents(), true);
            $userId = $this->getUserId($request);
            
            $user = $this->db->first("SELECT role, zone_id FROM users WHERE id = ?", [$userId]);
            $existing = $this->db->first("SELECT * FROM cells WHERE id = ?", [$cellId]);
            if (!$existing) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Cell not found'
                ], 404);
            }

            $targetZoneId = isset($data['zone_id']) && $data['zone_id'] !== null
                ? (int)$data['zone_id']
                : (int)($existing['zone_id'] ?? 0);
            if (!$this->canManageCellStructure($user ?? [], $targetZoneId ?: null)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only admin, pastor, superadmin, or the assigned zone leader can update cells'
                ], 403);
            }

            $updateData = [];
            $allowedFields = ['name', 'cell_leader_id', 'zone_id', 'max_members', 
                            'meeting_day', 'meeting_time', 'meeting_location', 'is_active'];
            
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    if ($field === 'name') {
                        $updateData[$field] = $this->sanitizeString($data[$field]);
                    } elseif ($field === 'meeting_day') {
                        $updateData[$field] = $this->normalizeMeetingDay($data[$field]);
                    } else {
                        $updateData[$field] = $data[$field];
                    }
                }
            }

            if (!empty($updateData)) {
                $set = implode(', ', array_map(fn($key) => "$key = ?", array_keys($updateData)));
                $sql = "UPDATE cells SET $set WHERE id = ?";
                $this->db->query($sql, array_merge(array_values($updateData), [$cellId]));
            }

            // If cell leader changed, update old and new leader's cell_id
            if (isset($data['cell_leader_id'])) {
                // Remove cell from old leader
                $this->db->query(
                    "UPDATE users SET cell_id = NULL WHERE cell_id = ? AND id = ?",
                    [$cellId, $existing['cell_leader_id']]
                );
                // Assign cell to new leader
                if ($data['cell_leader_id']) {
                    $this->db->query(
                        "UPDATE users SET cell_id = ? WHERE id = ?",
                        [$cellId, $data['cell_leader_id']]
                    );
                }
            }

            $updatedCell = $this->db->first("SELECT * FROM cells WHERE id = ?", [$cellId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Cell updated successfully',
                'data' => $updatedCell
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update cell: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete cell (soft delete - set is_active = 0)
     */
    public function delete(Request $request, Response $response, array $args): Response
    {
        try {
            $cellId = (int)$args['id'];
            $userId = $this->getUserId($request);
            
            $user = $this->db->first("SELECT role, zone_id FROM users WHERE id = ?", [$userId]);
            $existing = $this->db->first("SELECT zone_id FROM cells WHERE id = ?", [$cellId]);
            if (!$existing) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Cell not found'
                ], 404);
            }

            if (!$this->canManageCellStructure($user ?? [], (int)($existing['zone_id'] ?? 0) ?: null)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only admin, pastor, superadmin, or the assigned zone leader can delete cells'
                ], 403);
            }

            // Soft delete
            $this->db->query(
                "UPDATE cells SET is_active = 0 WHERE id = ?",
                [$cellId]
            );

            // Remove cell_id from members
            $this->db->query(
                "UPDATE users SET cell_id = NULL WHERE cell_id = ?",
                [$cellId]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Cell deleted successfully'
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to delete cell: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Assign member to cell
     */
    public function assignMember(Request $request, Response $response, array $args): Response
    {
        try {
            $cellId = (int)$args['id'];
            $data = json_decode($request->getBody()->getContents(), true);
            $userId = $this->getUserId($request);
            
            $memberIdRaw = $data['member_id'] ?? $data['user_id'] ?? null;
            $errors = [];
            if ($memberIdRaw === null || $memberIdRaw === '') {
                $errors['member_id'] = 'member_id is required';
            }
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $memberId = (int)$memberIdRaw;

            // Check permissions - allow: cell leader, admin/pastor, OR zone leader of this cell's zone
            $cell = $this->db->first("SELECT cell_leader_id, zone_id FROM cells WHERE id = ?", [$cellId]);
            $user = $this->db->first("SELECT role, zone_id FROM users WHERE id = ?", [$userId]);
            
            $isCellLeader = $cell && $cell['cell_leader_id'] == $userId;
            $isAdmin = in_array($user['role'], ['admin', 'pastor', 'superadmin']);
            $isZoneLeader = $user['role'] === 'zone_leader' && $cell && (int)$user['zone_id'] === (int)$cell['zone_id'];
            
            if (!$isCellLeader && !$isAdmin && !$isZoneLeader) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only cell leader, zone leader, or admin can assign members'
                ], 403);
            }

            // Check if member exists
            $member = $this->db->first("SELECT * FROM users WHERE id = ? AND is_active = 1", [$memberId]);
            if (!$member) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Member not found'
                ], 404);
            }

            // Check if cell has space
            $currentCount = $this->db->first(
                "SELECT COUNT(*) as count FROM users WHERE cell_id = ? AND is_active = 1",
                [$cellId]
            )['count'] ?? 0;
            
            $maxMembers = $this->db->first("SELECT max_members FROM cells WHERE id = ?", [$cellId])['max_members'] ?? 5;
            
            if ($currentCount >= $maxMembers) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => "Cell is full (max $maxMembers members)"
                ], 400);
            }

            // Assign member to cell
            $this->db->query(
                "UPDATE users SET cell_id = ? WHERE id = ?",
                [$cellId, $memberId]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Member assigned to cell successfully'
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to assign member: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk assign members to cell
     */
    public function bulkAssignMembers(Request $request, Response $response, array $args): Response
    {
        try {
            $cellId = (int)$args['id'];
            $data = json_decode($request->getBody()->getContents(), true);
            $userId = $this->getUserId($request);
            
            $memberIds = $data['member_ids'] ?? [];
            if (!is_array($memberIds) || empty($memberIds)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'member_ids array is required'
                ], 400);
            }

            // Check permissions
            $cell = $this->db->first("SELECT cell_leader_id, zone_id FROM cells WHERE id = ?", [$cellId]);
            $user = $this->db->first("SELECT role, zone_id FROM users WHERE id = ?", [$userId]);
            
            $isCellLeader = $cell && $cell['cell_leader_id'] == $userId;
            $isAdmin = in_array($user['role'], ['admin', 'pastor', 'superadmin']);
            $isZoneLeader = $user['role'] === 'zone_leader' && $cell && (int)$user['zone_id'] === (int)$cell['zone_id'];
            
            if (!$isCellLeader && !$isAdmin && !$isZoneLeader) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only cell leader, zone leader, or admin can assign members'
                ], 403);
            }

            // Check cell capacity
            $currentCount = (int)($this->db->first(
                "SELECT COUNT(*) as count FROM users WHERE cell_id = ? AND is_active = 1",
                [$cellId]
            )['count'] ?? 0);
            
            $maxMembers = (int)($this->db->first("SELECT max_members FROM cells WHERE id = ?", [$cellId])['max_members'] ?? 5);
            $availableSlots = $maxMembers - $currentCount;
            
            if ($availableSlots <= 0) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => "Cell is full (max $maxMembers members)"
                ], 400);
            }

            if (count($memberIds) > $availableSlots) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => "Only $availableSlots slots available. Trying to assign " . count($memberIds)
                ], 400);
            }

            // Verify all members exist
            $placeholders = implode(',', array_fill(0, count($memberIds), '?'));
            $existingMembers = $this->db->query(
                "SELECT id FROM users WHERE id IN ($placeholders) AND is_active = 1",
                $memberIds
            );
            $foundIds = array_map(fn($m) => $m['id'], $existingMembers);
            
            if (count($foundIds) !== count($memberIds)) {
                $missing = array_diff($memberIds, $foundIds);
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Some members not found: ' . implode(', ', $missing)
                ], 404);
            }

            // Assign all members
            foreach ($memberIds as $memberId) {
                $this->db->query(
                    "UPDATE users SET cell_id = ? WHERE id = ?",
                    [$cellId, $memberId]
                );
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => count($memberIds) . ' members assigned to cell successfully',
                'data' => ['assigned_count' => count($memberIds)]
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to bulk assign members: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove member from cell
     */
    public function removeMember(Request $request, Response $response, array $args): Response
    {
        try {
            $cellId = (int)$args['id'];
            $data = json_decode($request->getBody()->getContents(), true);
            $userId = $this->getUserId($request);
            
            $memberIdRaw = $data['member_id'] ?? $data['user_id'] ?? null;
            $errors = [];
            if ($memberIdRaw === null || $memberIdRaw === '') {
                $errors['member_id'] = 'member_id is required';
            }
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $memberId = (int)$memberIdRaw;

            // Check permissions
            $cell = $this->db->first("SELECT cell_leader_id FROM cells WHERE id = ?", [$cellId]);
            $user = $this->db->first("SELECT role FROM users WHERE id = ?", [$userId]);
            
            $isCellLeader = $cell && $cell['cell_leader_id'] == $userId;
            $isAdmin = in_array($user['role'], ['admin', 'pastor', 'superadmin']);
            
            if (!$isCellLeader && !$isAdmin) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only cell leader or admin can remove members'
                ], 403);
            }

            // Remove member from cell
            $result = $this->db->query(
                "UPDATE users SET cell_id = NULL WHERE id = ? AND cell_id = ?",
                [$memberId, $cellId]
            );

            if ($result->rowCount() === 0) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Member is not in this cell'
                ], 400);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Member removed from cell successfully'
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to remove member: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get cell members
     */
    public function getMembers(Request $request, Response $response, array $args): Response
    {
        try {
            $cellId = (int)$args['id'];
            $params = $request->getQueryParams();
            $includeInactive = $params['include_inactive'] ?? 0;

            $sql = "SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, 
                           m.member_number, m.membership_date, m.gender, m.marital_status
                    FROM users u
                    LEFT JOIN members m ON u.id = m.user_id
                    WHERE u.cell_id = ?";
            
            if (!$includeInactive) {
                $sql .= " AND u.is_active = 1";
            }
            
            $sql .= " ORDER BY u.last_name ASC";
            
            $members = $this->db->all($sql, [$cellId]);

            // Get attendance stats for each member (last 30 days)
            $thirtyDaysAgo = date('Y-m-d', strtotime('-30 days'));
            foreach ($members as &$member) {
                $sundayCount = $this->db->first(
                    "SELECT COUNT(*) as count FROM attendance_sunday WHERE user_id = ? AND attendance_date >= ?",
                    [$member['id'], $thirtyDaysAgo]
                )['count'] ?? 0;
                
                $cellCount = $this->db->first(
                    "SELECT COUNT(*) as count FROM attendance_cell WHERE user_id = ? AND meeting_date >= ?",
                    [$member['id'], $thirtyDaysAgo]
                )['count'] ?? 0;
                
                $member['recent_attendance'] = [
                    'sunday_count' => $sundayCount,
                    'cell_count' => $cellCount,
                    'total' => $sundayCount + $cellCount
                ];
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $members,
                'count' => count($members)
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get cell members: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Assign cell leader to a cell (admin/pastor only)
     */
    public function assignLeader(Request $request, Response $response, array $args): Response
    {
        try {
            $cellId = (int)$args['id'];
            $data = json_decode($request->getBody()->getContents(), true) ?: [];
            $userId = $this->getUserId($request);

            $required = ['leader_id'];
            $errors = $this->validateRequired($data, $required);
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $leaderId = (int)$data['leader_id'];

            $actor = $this->db->first("SELECT role, zone_id FROM users WHERE id = ?", [$userId]);
            
            $cell = $this->db->first("SELECT id, zone_id FROM cells WHERE id = ?", [$cellId]);
            if (!$cell) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Cell not found'
                ], 404);
            }
            
            $isAdmin = $actor && in_array($actor['role'], ['admin', 'pastor', 'superadmin'], true);
            $isZoneLeader = $actor && $actor['role'] === 'zone_leader' && $cell && (int)$actor['zone_id'] === (int)$cell['zone_id'];
            
            if (!$isAdmin && !$isZoneLeader) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only admin, pastor, or zone leaders can assign cell leaders'
                ], 403);
            }

            $leader = $this->db->first(
                "SELECT id, first_name, last_name, email, role, zone_id, cell_id FROM users WHERE id = ? AND is_active = 1",
                [$leaderId]
            );
            if (!$leader) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Invalid cell leader'
                ], 400);
            }

            $previousLeaderId = (int)($cell['cell_leader_id'] ?? 0);
            $assignedRole = in_array($leader['role'], ['admin', 'pastor', 'superadmin'], true)
                ? $leader['role']
                : 'cell_leader';
            $cellZoneId = !empty($cell['zone_id']) ? (int)$cell['zone_id'] : null;
            $cellNameRow = $this->db->first("SELECT name FROM cells WHERE id = ?", [$cellId]);
            $cellName = $cellNameRow['name'] ?? 'Cell';

            $this->db->beginTransaction();

            $this->db->query("UPDATE cells SET cell_leader_id = ? WHERE id = ?", [$leaderId, $cellId]);
            $this->db->query(
                "UPDATE users SET role = ?, cell_id = ?, zone_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [$assignedRole, $cellId, $cellZoneId, $leaderId]
            );
            $this->db->query(
                "UPDATE members SET cell_id = ?, zone_id = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                [$cellId, $cellZoneId, $leaderId]
            );

            if ($previousLeaderId && $previousLeaderId !== $leaderId) {
                $this->recalculateLeadershipRole($previousLeaderId);
            }

            $this->db->insert('activity_logs', [
                'user_id' => $userId,
                'action' => 'leader_promoted',
                'entity_type' => 'user',
                'entity_id' => $leaderId,
                'details' => json_encode([
                    'new_role' => $assignedRole,
                    'assignment_type' => 'cell',
                    'cell_id' => $cellId,
                    'cell_name' => $cellName,
                    'zone_id' => $cellZoneId,
                    'source' => 'cell_assignment'
                ])
            ]);

            $this->db->commit();

            $notificationService = new \App\Service\PastorNotificationService($this->db);
            $notificationService->notifyLeadershipPromotion($leader, $assignedRole, [
                'assignment' => "Cell: {$cellName}"
            ]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Cell leader assigned successfully'
            ]);
        } catch (Exception $e) {
            if ($this->db->getConnection()->inTransaction()) {
                $this->db->rollBack();
            }
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to assign cell leader: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get members available to be assigned to this cell
     */
    public function getAvailableMembers(Request $request, Response $response, array $args): Response
    {
        try {
            $cellId = (int)$args['id'];
            $userId = $this->getUserId($request);

            $cell = $this->db->first("SELECT cell_leader_id, zone_id FROM cells WHERE id = ?", [$cellId]);
            if (!$cell) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Cell not found'
                ], 404);
            }

            $actor = $this->db->first("SELECT role, zone_id FROM users WHERE id = ?", [$userId]);
            $isCellLeader = $cell['cell_leader_id'] == $userId;
            $isAdmin = $actor && in_array($actor['role'], ['admin', 'pastor', 'superadmin'], true);
            $isZoneLeader = $actor && $actor['role'] === 'zone_leader' && $cell && (int)$actor['zone_id'] === (int)$cell['zone_id'];

            if (!$isCellLeader && !$isAdmin && !$isZoneLeader) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only this cell leader, zone leader, or admin can view available members'
                ], 403);
            }

            $members = $this->db->all(
                "SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, m.member_number
                 FROM users u
                 LEFT JOIN members m ON m.user_id = u.id
                 WHERE u.is_active = 1
                   AND (u.cell_id IS NULL OR u.cell_id != ?)
                 ORDER BY u.last_name ASC, u.first_name ASC",
                [$cellId]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $members,
                'count' => count($members)
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch available members: ' . $e->getMessage()
            ], 500);
        }
    }
}
