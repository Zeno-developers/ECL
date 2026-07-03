<?php

namespace App\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class FamilyController extends BaseController
{
    private function isAdminOrPastor(int $userId): bool
    {
        $user = $this->db->first("SELECT role FROM users WHERE id = ?", [$userId]);
        return $user && in_array($user['role'], ['admin', 'pastor', 'superadmin', 'elder'], true);
    }

    // GET /family/mine — authenticated user's own family
    public function getMyFamily(Request $request, Response $response): Response
    {
        try {
            $memberId = $this->getUserId($request);
            return $this->buildFamilyResponse($memberId);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // GET /family/member/{id} — full family data for a member
    public function getMemberFamily(Request $request, Response $response, array $args): Response
    {
        try {
            $memberId = (int)($args['id'] ?? 0);
            if (!$memberId) return $this->jsonResponse(['status' => 'error', 'message' => 'Invalid member ID'], 400);
            return $this->buildFamilyResponse($memberId);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    private function buildFamilyResponse(int $memberId): Response
    {
            $member = $this->db->first(
                "SELECT id, first_name, last_name, profile_picture FROM users WHERE id = ? AND is_active = 1",
                [$memberId]
            );
            if (!$member) return $this->jsonResponse(['status' => 'error', 'message' => 'Member not found'], 404);

            $spouse = $this->db->first(
                "SELECT u.id, u.first_name, u.last_name, u.profile_picture, m.status, m.married_date
                 FROM marriages m
                 JOIN users u ON u.id = IF(m.member1_id = ?, m.member2_id, m.member1_id)
                 WHERE (m.member1_id = ? OR m.member2_id = ?) AND m.status = 'active'",
                [$memberId, $memberId, $memberId]
            );

            $parents = $this->db->all(
                "SELECT u.id, u.first_name, u.last_name, u.profile_picture
                 FROM parent_child pc
                 JOIN users u ON u.id = pc.parent_id
                 WHERE pc.child_id = ? AND u.is_active = 1",
                [$memberId]
            );

            $children = $this->db->all(
                "SELECT u.id, u.first_name, u.last_name, u.profile_picture
                 FROM parent_child pc
                 JOIN users u ON u.id = pc.child_id
                 WHERE pc.parent_id = ? AND u.is_active = 1",
                [$memberId]
            );

            $siblings = [];
            if (!empty($parents)) {
                $parentIds    = array_column($parents, 'id');
                $placeholders = implode(',', array_fill(0, count($parentIds), '?'));
                $siblings = $this->db->all(
                    "SELECT DISTINCT u.id, u.first_name, u.last_name, u.profile_picture
                     FROM parent_child pc
                     JOIN users u ON u.id = pc.child_id
                     WHERE pc.parent_id IN ($placeholders) AND pc.child_id != ? AND u.is_active = 1",
                    array_merge($parentIds, [$memberId])
                );
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data'   => [
                    'member'   => $member,
                    'spouse'   => $spouse ?: null,
                    'parents'  => $parents,
                    'children' => $children,
                    'siblings' => $siblings,
                ],
            ]);
    }

    // GET /family/tree/{id} — multi-generational tree (3 levels up + 2 levels down)
    public function getFamilyTree(Request $request, Response $response, array $args): Response
    {
        try {
            $rootId = (int)($args['id'] ?? 0);
            if (!$rootId) return $this->jsonResponse(['status' => 'error', 'message' => 'Invalid member ID'], 400);

            $tree = $this->buildTree($rootId, 0, 3, 2);
            return $this->jsonResponse(['status' => 'success', 'data' => $tree]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    private function buildTree(int $id, int $depth, int $maxUp, int $maxDown, array $visited = []): ?array
    {
        if (in_array($id, $visited)) return null;
        $visited[] = $id;

        $member = $this->db->first(
            "SELECT id, first_name, last_name, profile_picture FROM users WHERE id = ? AND is_active = 1",
            [$id]
        );
        if (!$member) return null;

        $node = [
            'id'              => $member['id'],
            'name'            => trim($member['first_name'] . ' ' . $member['last_name']),
            'profile_picture' => $member['profile_picture'],
            'parents'         => [],
            'children'        => [],
            'spouse'          => null,
        ];

        $spouse = $this->db->first(
            "SELECT u.id, u.first_name, u.last_name, u.profile_picture
             FROM marriages m
             JOIN users u ON u.id = IF(m.member1_id = ?, m.member2_id, m.member1_id)
             WHERE (m.member1_id = ? OR m.member2_id = ?) AND m.status = 'active' AND u.is_active = 1",
            [$id, $id, $id]
        );
        if ($spouse) {
            $node['spouse'] = [
                'id'              => $spouse['id'],
                'name'            => trim($spouse['first_name'] . ' ' . $spouse['last_name']),
                'profile_picture' => $spouse['profile_picture'],
            ];
        }

        if ($depth < $maxUp) {
            $parents = $this->db->all(
                "SELECT pc.parent_id FROM parent_child pc WHERE pc.child_id = ?",
                [$id]
            );
            foreach ($parents as $p) {
                $parentNode = $this->buildTree((int)$p['parent_id'], $depth + 1, $maxUp, 0, $visited);
                if ($parentNode) $node['parents'][] = $parentNode;
            }
        }

        if ($depth < $maxDown) {
            $children = $this->db->all(
                "SELECT pc.child_id FROM parent_child pc WHERE pc.parent_id = ?",
                [$id]
            );
            foreach ($children as $c) {
                $childNode = $this->buildTree((int)$c['child_id'], $depth + 1, 0, $maxDown, $visited);
                if ($childNode) $node['children'][] = $childNode;
            }
        }

        return $node;
    }

    // POST /family/marriage — link two members as spouses
    public function addMarriage(Request $request, Response $response): Response
    {
        try {
            $actorId = $this->getUserId($request);
            if (!$this->isAdminOrPastor($actorId)) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $data = $this->parseJsonBody($request);
            $errors = $this->validateRequired($data, ['member1_id', 'member2_id']);
            if ($errors) return $this->jsonResponse(['status' => 'error', 'message' => $errors[0]], 400);

            $m1 = (int)$data['member1_id'];
            $m2 = (int)$data['member2_id'];
            if ($m1 === $m2) return $this->jsonResponse(['status' => 'error', 'message' => 'Cannot marry a member to themselves'], 400);

            // Ensure consistent ordering
            if ($m1 > $m2) [$m1, $m2] = [$m2, $m1];

            $existing = $this->db->first(
                "SELECT id FROM marriages WHERE member1_id = ? AND member2_id = ?",
                [$m1, $m2]
            );
            if ($existing) {
                $this->db->update('marriages', ['status' => 'active'], 'id = ?', [(int)$existing['id']]);
                return $this->jsonResponse(['status' => 'success', 'message' => 'Marriage relationship restored']);
            }

            // Check neither is already in an active marriage
            $conflict = $this->db->first(
                "SELECT id FROM marriages WHERE (member1_id IN (?,?) OR member2_id IN (?,?)) AND status = 'active'",
                [$m1, $m2, $m1, $m2]
            );
            if ($conflict) return $this->jsonResponse(['status' => 'error', 'message' => 'One or both members already have an active spouse'], 409);

            $this->db->insert('marriages', [
                'member1_id'   => $m1,
                'member2_id'   => $m2,
                'status'       => $data['status'] ?? 'active',
                'married_date' => $data['married_date'] ?? null,
                'created_by'   => $actorId,
                'created_at'   => date('Y-m-d H:i:s'),
            ]);

            return $this->jsonResponse(['status' => 'success', 'message' => 'Marriage linked successfully']);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // PATCH /family/marriage/{id} — update status (divorced/widowed)
    public function updateMarriage(Request $request, Response $response, array $args): Response
    {
        try {
            $actorId = $this->getUserId($request);
            if (!$this->isAdminOrPastor($actorId)) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $id   = (int)($args['id'] ?? 0);
            $data = $this->parseJsonBody($request);
            $allowed = ['active', 'widowed', 'divorced'];
            $status = $data['status'] ?? '';
            if (!in_array($status, $allowed, true)) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Invalid status'], 400);
            }

            $this->db->update('marriages', ['status' => $status], 'id = ?', [$id]);
            return $this->jsonResponse(['status' => 'success', 'message' => 'Marriage updated']);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // POST /family/parent-child — link parent to child
    public function addParentChild(Request $request, Response $response): Response
    {
        try {
            $actorId = $this->getUserId($request);
            if (!$this->isAdminOrPastor($actorId)) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $data   = $this->parseJsonBody($request);
            $errors = $this->validateRequired($data, ['parent_id', 'child_id']);
            if ($errors) return $this->jsonResponse(['status' => 'error', 'message' => $errors[0]], 400);

            $parentId = (int)$data['parent_id'];
            $childId  = (int)$data['child_id'];
            if ($parentId === $childId) return $this->jsonResponse(['status' => 'error', 'message' => 'Parent and child cannot be the same person'], 400);

            $existing = $this->db->first(
                "SELECT id FROM parent_child WHERE parent_id = ? AND child_id = ?",
                [$parentId, $childId]
            );
            if ($existing) return $this->jsonResponse(['status' => 'error', 'message' => 'Relationship already exists'], 409);

            $this->db->insert('parent_child', [
                'parent_id'  => $parentId,
                'child_id'   => $childId,
                'created_by' => $actorId,
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            return $this->jsonResponse(['status' => 'success', 'message' => 'Parent-child relationship linked']);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // DELETE /family/parent-child — remove a parent-child link
    public function removeParentChild(Request $request, Response $response): Response
    {
        try {
            $actorId = $this->getUserId($request);
            if (!$this->isAdminOrPastor($actorId)) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $data     = $this->parseJsonBody($request);
            $parentId = (int)($data['parent_id'] ?? 0);
            $childId  = (int)($data['child_id'] ?? 0);
            if (!$parentId || !$childId) return $this->jsonResponse(['status' => 'error', 'message' => 'parent_id and child_id required'], 400);

            $this->db->query("DELETE FROM parent_child WHERE parent_id = ? AND child_id = ?", [$parentId, $childId]);
            return $this->jsonResponse(['status' => 'success', 'message' => 'Relationship removed']);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
