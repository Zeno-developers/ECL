<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use App\Database;
use Exception;

class ZonesController extends BaseController
{
    private function normalizeNullableText(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_array($value)) {
            $value = implode("\n", array_filter(array_map(
                fn($item) => is_string($item) ? trim($item) : trim((string)$item),
                $value
            ), fn($item) => $item !== ''));
        }

        $value = trim((string)$value);
        if ($value === '') {
            return null;
        }

        return $this->sanitizeString($value);
    }

    private function canManageZoneMembers(array $user, int $zoneId): bool
    {
        if (in_array($user['role'] ?? '', ['admin', 'pastor', 'superadmin'], true)) {
            return true;
        }

        return ($user['role'] ?? '') === 'zone_leader' && (int)($user['zone_id'] ?? 0) === $zoneId;
    }

    private function syncZoneMemberAssignment(int $memberId, ?int $zoneId): void
    {
        $member = $this->db->first("SELECT id, user_id, cell_id FROM members WHERE id = ?", [$memberId]);
        if (!$member) {
            throw new Exception('Member not found');
        }

        $cellId = $member['cell_id'] !== null ? (int)$member['cell_id'] : null;
        if ($cellId) {
            $cell = $this->db->first("SELECT zone_id FROM cells WHERE id = ?", [$cellId]);
            if ($zoneId === null || (int)($cell['zone_id'] ?? 0) !== (int)$zoneId) {
                $cellId = null;
            }
        }

        $this->db->query(
            "UPDATE members SET zone_id = ?, cell_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [$zoneId, $cellId, $memberId]
        );

        if (!empty($member['user_id'])) {
            $this->db->query(
                "UPDATE users SET zone_id = ?, cell_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [$zoneId, $cellId, (int)$member['user_id']]
            );
        }
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
     * Get all zones with optional filtering
     */
    public function getAll(Request $request, Response $response): Response
    {
        try {
            $params = $request->getQueryParams();
            $isActive = $params['is_active'] ?? 1;

            $sql = "SELECT z.*, 
                           u.first_name as leader_first_name,
                           u.last_name as leader_last_name,
                           u.email as leader_email,
                           u.phone as leader_phone,
                           (SELECT COUNT(*) FROM cells WHERE zone_id = z.id AND is_active = 1) as cell_count,
                           (SELECT COUNT(*) FROM users WHERE zone_id = z.id AND is_active = 1) as member_count
                    FROM zones z
                    LEFT JOIN users u ON z.zone_leader_id = u.id
                    WHERE z.is_active = ?
                    ORDER BY z.name ASC";
            
            $zones = $this->db->all($sql, [$isActive]);

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $zones,
                'count' => count($zones)
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get zones: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single zone by ID
     */
    public function getOne(Request $request, Response $response, array $args): Response
    {
        try {
            $zoneId = (int)$args['id'];
            
            $zone = $this->db->first(
                "SELECT z.*, 
                        u.first_name as leader_first_name,
                        u.last_name as leader_last_name,
                        u.email as leader_email,
                        u.phone as leader_phone
                 FROM zones z
                 LEFT JOIN users u ON z.zone_leader_id = u.id
                 WHERE z.id = ?",
                [$zoneId]
            );

            if (!$zone) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Zone not found'
                ], 404);
            }

            // Get cells in this zone
            $cells = $this->db->all(
                "SELECT c.*, 
                        u.first_name as leader_first_name,
                        u.last_name as leader_last_name,
                        (SELECT COUNT(*) FROM users WHERE cell_id = c.id AND is_active = 1) as member_count
                 FROM cells c
                 LEFT JOIN users u ON c.cell_leader_id = u.id
                 WHERE c.zone_id = ? AND c.is_active = 1
                 ORDER BY c.name ASC",
                [$zoneId]
            );

            // Get total members in zone
            $totalMembers = $this->db->first(
                "SELECT COUNT(*) as count FROM users WHERE zone_id = ? AND is_active = 1",
                [$zoneId]
            )['count'] ?? 0;

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'zone' => $zone,
                    'cells' => $cells,
                    'cell_count' => count($cells),
                    'total_members' => $totalMembers
                ]
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get zone: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new zone
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

            // Check permissions (admin or pastor only)
            $user = $this->db->first("SELECT role FROM users WHERE id = ?", [$userId]);
            if (!in_array($user['role'], ['admin', 'pastor', 'superadmin'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only admin or pastor can create zones'
                ], 403);
            }

            $zoneId = $this->db->insert('zones', [
                'name' => $this->sanitizeString($data['name']),
                'zone_leader_id' => $data['zone_leader_id'] ?? null,
                'description' => $data['description'] ?? null,
                'area' => $this->normalizeNullableText($data['area'] ?? null),
                'churches' => $this->normalizeNullableText($data['churches'] ?? null),
                'is_active' => $data['is_active'] ?? 1
            ]);

            // If zone leader assigned, update their zone_id
            if (isset($data['zone_leader_id']) && $data['zone_leader_id']) {
                $this->db->query(
                    "UPDATE users SET zone_id = ? WHERE id = ?",
                    [$zoneId, $data['zone_leader_id']]
                );
            }

            $zone = $this->db->first("SELECT * FROM zones WHERE id = ?", [$zoneId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Zone created successfully',
                'data' => $zone
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to create zone: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update zone
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        try {
            $zoneId = (int)$args['id'];
            $data = json_decode($request->getBody()->getContents(), true);
            $userId = $this->getUserId($request);
            
            // Check permissions
            $user = $this->db->first("SELECT role FROM users WHERE id = ?", [$userId]);
            if (!in_array($user['role'], ['admin', 'pastor', 'superadmin'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only admin or pastor can update zones'
                ], 403);
            }

            // Check if zone exists
            $existing = $this->db->first("SELECT * FROM zones WHERE id = ?", [$zoneId]);
            if (!$existing) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Zone not found'
                ], 404);
            }

            $updateData = [];
            $allowedFields = ['name', 'zone_leader_id', 'description', 'area', 'churches', 'is_active'];
            
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    if ($field === 'name') {
                        $updateData[$field] = $this->sanitizeString($data[$field]);
                    } elseif (in_array($field, ['area', 'churches'], true)) {
                        $updateData[$field] = $this->normalizeNullableText($data[$field]);
                    } else {
                        $updateData[$field] = $data[$field];
                    }
                }
            }

            if (!empty($updateData)) {
                $set = implode(', ', array_map(fn($key) => "$key = ?", array_keys($updateData)));
                $sql = "UPDATE zones SET $set WHERE id = ?";
                $this->db->query($sql, array_merge(array_values($updateData), [$zoneId]));
            }

            // If zone leader changed, update old and new leader's zone_id
            if (isset($data['zone_leader_id'])) {
                // Remove zone from old leader
                $this->db->query(
                    "UPDATE users SET zone_id = NULL WHERE zone_id = ? AND id = ?",
                    [$zoneId, $existing['zone_leader_id']]
                );
                // Assign zone to new leader
                if ($data['zone_leader_id']) {
                    $this->db->query(
                        "UPDATE users SET zone_id = ? WHERE id = ?",
                        [$zoneId, $data['zone_leader_id']]
                    );
                }
            }

            $updatedZone = $this->db->first("SELECT * FROM zones WHERE id = ?", [$zoneId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Zone updated successfully',
                'data' => $updatedZone
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update zone: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete zone (soft delete)
     */
    public function delete(Request $request, Response $response, array $args): Response
    {
        try {
            $zoneId = (int)$args['id'];
            $userId = $this->getUserId($request);
            
            // Check permissions
            $user = $this->db->first("SELECT role FROM users WHERE id = ?", [$userId]);
            if (!in_array($user['role'], ['admin', 'pastor', 'superadmin'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only admin or pastor can delete zones'
                ], 403);
            }

            // Soft delete
            $this->db->query(
                "UPDATE zones SET is_active = 0 WHERE id = ?",
                [$zoneId]
            );

            // Remove zone_id from cells and users
            $this->db->query("UPDATE cells SET zone_id = NULL WHERE zone_id = ?", [$zoneId]);
            $this->db->query("UPDATE users SET zone_id = NULL WHERE zone_id = ?", [$zoneId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Zone deleted successfully'
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to delete zone: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get zone statistics
     */
    public function getStats(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $user = $this->db->first("SELECT role, zone_id FROM users WHERE id = ?", [$userId]);
            
            // If zone leader, only show their zone
            if ($user['role'] === 'zone_leader' && $user['zone_id']) {
                $zones = [$this->db->first(
                    "SELECT z.*, 
                            u.first_name as leader_first_name,
                            u.last_name as leader_last_name,
                            (SELECT COUNT(*) FROM cells WHERE zone_id = z.id AND is_active = 1) as cell_count,
                            (SELECT COUNT(*) FROM users WHERE zone_id = z.id AND is_active = 1) as member_count
                     FROM zones z
                     LEFT JOIN users u ON z.zone_leader_id = u.id
                     WHERE z.id = ?",
                    [$user['zone_id']]
                )];
            } else {
                // Admin/pastor see all zones
                $zones = $this->db->all(
                    "SELECT z.*, 
                            u.first_name as leader_first_name,
                            u.last_name as leader_last_name,
                            (SELECT COUNT(*) FROM cells WHERE zone_id = z.id AND is_active = 1) as cell_count,
                            (SELECT COUNT(*) FROM users WHERE zone_id = z.id AND is_active = 1) as member_count
                     FROM zones z
                     LEFT JOIN users u ON z.zone_leader_id = u.id
                     WHERE z.is_active = 1
                     ORDER BY z.name ASC"
                );
            }

            // Calculate totals
            $totalZones = count($zones);
            $totalCells = 0;
            $totalMembers = 0;
            
            foreach ($zones as $zone) {
                $totalCells += $zone['cell_count'] ?? 0;
                $totalMembers += $zone['member_count'] ?? 0;
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'zones' => $zones,
                    'summary' => [
                        'total_zones' => $totalZones,
                        'total_cells' => $totalCells,
                        'total_members' => $totalMembers,
                        'avg_cells_per_zone' => $totalZones > 0 ? round($totalCells / $totalZones, 1) : 0,
                        'avg_members_per_zone' => $totalZones > 0 ? round($totalMembers / $totalZones, 1) : 0
                    ]
                ]
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get zone stats: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Assign zone leader to zone
     */
    public function assignLeader(Request $request, Response $response, array $args): Response
    {
        try {
            $zoneId = (int)$args['id'];
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

            // Check permissions
            $user = $this->db->first("SELECT role FROM users WHERE id = ?", [$userId]);
            if (!in_array($user['role'], ['admin', 'pastor', 'superadmin'])) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only admin or pastor can assign zone leaders'
                ], 403);
            }

            // Check if zone exists
            $zone = $this->db->first("SELECT * FROM zones WHERE id = ?", [$zoneId]);
            if (!$zone) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Zone not found'
                ], 404);
            }

            $leader = $this->db->first(
                "SELECT id, first_name, last_name, email, role, zone_id, cell_id FROM users WHERE id = ? AND is_active = 1",
                [$leaderId]
            );

            if (!$leader) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Invalid zone leader'
                ], 400);
            }

            $previousLeaderId = (int)($zone['zone_leader_id'] ?? 0);
            $zoneName = $zone['name'] ?? 'Zone';
            $assignedRole = in_array($leader['role'], ['admin', 'pastor', 'superadmin'], true)
                ? $leader['role']
                : 'zone_leader';

            $this->db->beginTransaction();

            $this->db->query(
                "UPDATE zones SET zone_leader_id = ? WHERE id = ?",
                [$leaderId, $zoneId]
            );

            $this->db->query(
                "UPDATE users SET role = ?, zone_id = ?, cell_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [$assignedRole, $zoneId, $leaderId]
            );

            $this->db->query(
                "UPDATE members SET zone_id = ?, cell_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                [$zoneId, $leaderId]
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
                    'assignment_type' => 'zone',
                    'zone_id' => $zoneId,
                    'zone_name' => $zoneName,
                    'source' => 'zone_assignment'
                ])
            ]);

            $this->db->commit();

            $notificationService = new \App\Service\PastorNotificationService($this->db);
            $notificationService->notifyLeadershipPromotion($leader, $assignedRole, [
                'assignment' => "Zone: {$zoneName}"
            ]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Zone leader assigned successfully'
            ]);

        } catch (Exception $e) {
            if ($this->db->getConnection()->inTransaction()) {
                $this->db->rollBack();
            }
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to assign zone leader: ' . $e->getMessage()
            ], 500);
        }
    }

    public function assignMember(Request $request, Response $response, array $args): Response
    {
        try {
            $zoneId = (int)$args['id'];
            $data = json_decode($request->getBody()->getContents(), true) ?: [];
            $userId = $this->getUserId($request);
            $user = $this->db->first("SELECT role, zone_id FROM users WHERE id = ?", [$userId]);

            if (!$this->canManageZoneMembers($user ?? [], $zoneId)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'You do not have permission to assign members to this zone'
                ], 403);
            }

            $memberId = (int)($data['member_id'] ?? 0);
            if ($memberId <= 0) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'member_id is required'
                ], 400);
            }

            $zone = $this->db->first("SELECT id FROM zones WHERE id = ? AND is_active = 1", [$zoneId]);
            if (!$zone) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Zone not found'
                ], 404);
            }

            $this->syncZoneMemberAssignment($memberId, $zoneId);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Member assigned to zone successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to assign member to zone: ' . $e->getMessage()
            ], 500);
        }
    }

    public function removeMember(Request $request, Response $response, array $args): Response
    {
        try {
            $zoneId = (int)$args['id'];
            $data = json_decode($request->getBody()->getContents(), true) ?: [];
            $userId = $this->getUserId($request);
            $user = $this->db->first("SELECT role, zone_id FROM users WHERE id = ?", [$userId]);

            if (!$this->canManageZoneMembers($user ?? [], $zoneId)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'You do not have permission to remove members from this zone'
                ], 403);
            }

            $memberId = (int)($data['member_id'] ?? 0);
            if ($memberId <= 0) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'member_id is required'
                ], 400);
            }

            $member = $this->db->first("SELECT zone_id FROM members WHERE id = ?", [$memberId]);
            if (!$member) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Member not found'
                ], 404);
            }

            if ((int)($member['zone_id'] ?? 0) !== $zoneId) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Member is not assigned to this zone'
                ], 409);
            }

            $this->syncZoneMemberAssignment($memberId, null);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Member removed from zone successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to remove member from zone: ' . $e->getMessage()
            ], 500);
        }
    }
}
