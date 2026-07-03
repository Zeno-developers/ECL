<?php

namespace App\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class SpiritualLineageController extends BaseController
{
    private function isAdminOrPastor(int $userId): bool
    {
        $user = $this->db->first("SELECT role FROM users WHERE id = ?", [$userId]);
        return $user && in_array($user['role'], ['admin', 'pastor', 'superadmin', 'elder'], true);
    }

    // Preload all users once; build child map for cycle-safe O(n) tree traversal
    private function preloadUserMaps(): array
    {
        $allUsers = $this->db->all(
            "SELECT id, first_name, last_name, profile_picture, spiritual_parent_id
             FROM users WHERE is_active = 1 AND role != 'developer'"
        );
        $userMap  = [];
        $childMap = [];
        $roots    = [];
        foreach ($allUsers as $u) {
            $uid = (int)$u['id'];
            $userMap[$uid] = $u;
            $pid = $u['spiritual_parent_id'] ? (int)$u['spiritual_parent_id'] : null;
            if ($pid) {
                $childMap[$pid][] = $uid;
            } else {
                $roots[] = $uid;
            }
        }
        sort($roots);
        return [$userMap, $childMap, $roots];
    }

    private function buildNode(int $id, array &$childMap, array &$userMap, array $visited = []): array
    {
        $visited[] = $id;
        $u = $userMap[$id] ?? ['id' => $id, 'first_name' => '?', 'last_name' => '', 'profile_picture' => null];

        $children = [];
        foreach ($childMap[$id] ?? [] as $childId) {
            if (!in_array($childId, $visited)) {
                $children[] = $this->buildNode($childId, $childMap, $userMap, $visited);
            }
        }

        return [
            'id'              => (int)$u['id'],
            'name'            => trim($u['first_name'] . ' ' . $u['last_name']),
            'profile_picture' => $u['profile_picture'],
            'disciples'       => $children,
            'disciple_count'  => count($children),
        ];
    }

    private function countAllDescendants(int $id, array &$childMap, array $visited = []): int
    {
        $visited[] = $id;
        $count = 0;
        foreach ($childMap[$id] ?? [] as $childId) {
            if (!in_array($childId, $visited)) {
                $count += 1 + $this->countAllDescendants($childId, $childMap, $visited);
            }
        }
        return $count;
    }

    private function buildAncestorPath(int $memberId, array &$userMap): array
    {
        $path    = [];
        $current = $memberId;
        $visited = [];
        while ($current && !in_array($current, $visited)) {
            $visited[] = $current;
            $u = $userMap[$current] ?? null;
            if (!$u) break;
            array_unshift($path, [
                'id'              => (int)$u['id'],
                'name'            => trim($u['first_name'] . ' ' . $u['last_name']),
                'profile_picture' => $u['profile_picture'],
            ]);
            $current = $u['spiritual_parent_id'] ? (int)$u['spiritual_parent_id'] : null;
        }
        return $path;
    }

    private function computeGeneration(int $id, array &$userMap, array $visited = []): int
    {
        if (in_array($id, $visited)) return 1;
        $visited[] = $id;
        $u = $userMap[$id] ?? null;
        if (!$u || !$u['spiritual_parent_id']) return 1;
        return 1 + $this->computeGeneration((int)$u['spiritual_parent_id'], $userMap, $visited);
    }

    // GET /spiritual-lineage/tree
    public function getFullTree(Request $request, Response $response): Response
    {
        try {
            [$userMap, $childMap, $roots] = $this->preloadUserMaps();
            $tree = [];
            foreach ($roots as $rootId) {
                $tree[] = $this->buildNode($rootId, $childMap, $userMap, []);
            }
            return $this->jsonResponse(['status' => 'success', 'data' => $tree]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // GET /spiritual-lineage/member/{id}
    public function getMemberLineage(Request $request, Response $response, array $args): Response
    {
        try {
            $memberId = (int)($args['id'] ?? 0);
            return $this->buildMemberLineageResponse($memberId);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // GET /spiritual-lineage/mine
    public function getMyLineage(Request $request, Response $response): Response
    {
        try {
            $memberId = $this->getUserId($request);
            return $this->buildMemberLineageResponse($memberId);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    private function buildMemberLineageResponse(int $memberId): Response
    {
        $member = $this->db->first(
            "SELECT u.id, u.first_name, u.last_name, u.profile_picture, u.spiritual_parent_id,
                    sp.first_name AS sp_first, sp.last_name AS sp_last, sp.profile_picture AS sp_pic
             FROM users u
             LEFT JOIN users sp ON sp.id = u.spiritual_parent_id
             WHERE u.id = ? AND u.is_active = 1",
            [$memberId]
        );
        if (!$member) return $this->jsonResponse(['status' => 'error', 'message' => 'Member not found'], 404);

        $disciples = $this->db->all(
            "SELECT id, first_name, last_name, profile_picture FROM users WHERE spiritual_parent_id = ? AND is_active = 1",
            [$memberId]
        );

        [$userMap, $childMap] = $this->preloadUserMaps();

        $totalDescendants = $this->countAllDescendants($memberId, $childMap, []);
        $generation       = $this->computeGeneration($memberId, $userMap, []);

        return $this->jsonResponse([
            'status' => 'success',
            'data'   => [
                'id'               => (int)$member['id'],
                'name'             => trim($member['first_name'] . ' ' . $member['last_name']),
                'profile_picture'  => $member['profile_picture'],
                'spiritual_parent' => $member['spiritual_parent_id'] ? [
                    'id'              => (int)$member['spiritual_parent_id'],
                    'name'            => trim($member['sp_first'] . ' ' . $member['sp_last']),
                    'profile_picture' => $member['sp_pic'],
                ] : null,
                'direct_disciples'  => $disciples,
                'total_descendants' => $totalDescendants,
                'generation'        => $generation,
            ],
        ]);
    }

    // GET /spiritual-lineage/member/{id}/path — ancestor chain from root to member
    public function getAncestorPath(Request $request, Response $response, array $args): Response
    {
        try {
            $memberId = (int)($args['id'] ?? 0);
            if (!$memberId) return $this->jsonResponse(['status' => 'error', 'message' => 'Invalid member ID'], 400);

            [$userMap] = $this->preloadUserMaps();
            $path = $this->buildAncestorPath($memberId, $userMap);
            return $this->jsonResponse(['status' => 'success', 'data' => $path]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // PATCH /spiritual-lineage/member/{id} — admin/pastor direct assignment
    public function setSpiritualParent(Request $request, Response $response, array $args): Response
    {
        try {
            $actorId = $this->getUserId($request);
            if (!$this->isAdminOrPastor($actorId)) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $memberId = (int)($args['id'] ?? 0);
            $data     = (array)($request->getParsedBody() ?? []);
            $parentId = isset($data['spiritual_parent_id']) ? (int)$data['spiritual_parent_id'] : null;

            if ($parentId && $parentId === $memberId) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'A member cannot be their own spiritual parent'], 400);
            }
            if ($parentId && $this->wouldCreateCycle($memberId, $parentId, [])) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'This would create a circular lineage'], 409);
            }

            $this->db->update('users', ['spiritual_parent_id' => $parentId ?: null], 'id = ?', [$memberId]);
            return $this->jsonResponse(['status' => 'success', 'message' => 'Spiritual lineage updated']);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // POST /spiritual-lineage/claim — member self-claim
    public function claimSpiritualParent(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $data   = $this->parseJsonBody($request);
            $claimedParentId = (int)($data['claimed_parent_id'] ?? 0);
            $note   = trim($data['note'] ?? '');

            if (!$claimedParentId) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'claimed_parent_id required'], 400);
            }
            if ($claimedParentId === $userId) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Cannot claim yourself as spiritual parent'], 400);
            }

            $me = $this->db->first("SELECT spiritual_parent_id FROM users WHERE id = ?", [$userId]);
            if ($me && $me['spiritual_parent_id']) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'You already have a spiritual parent recorded'], 409);
            }

            $existing = $this->db->first(
                "SELECT id FROM spiritual_parent_requests WHERE requester_id = ? AND status = 'pending'",
                [$userId]
            );
            if ($existing) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'You already have a pending request — wait for it to be reviewed'], 409);
            }

            if ($this->wouldCreateCycle($userId, $claimedParentId, [])) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'This would create a circular lineage'], 409);
            }

            $this->db->insert('spiritual_parent_requests', [
                'requester_id'     => $userId,
                'claimed_parent_id'=> $claimedParentId,
                'note'             => $note ?: null,
                'status'           => 'pending',
                'created_at'       => date('Y-m-d H:i:s'),
            ]);

            return $this->jsonResponse(['status' => 'success', 'message' => 'Your claim has been submitted and is awaiting review']);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // GET /spiritual-lineage/requests — admin list pending claims
    public function listClaims(Request $request, Response $response): Response
    {
        try {
            $actorId = $this->getUserId($request);
            if (!$this->isAdminOrPastor($actorId)) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $status = $request->getQueryParams()['status'] ?? 'pending';
            if (!in_array($status, ['pending', 'approved', 'rejected'])) $status = 'pending';

            $rows = $this->db->all(
                "SELECT r.id, r.status, r.note, r.created_at,
                        req.id AS requester_id, req.first_name AS req_first, req.last_name AS req_last, req.profile_picture AS req_pic,
                        par.id AS parent_id, par.first_name AS par_first, par.last_name AS par_last, par.profile_picture AS par_pic
                 FROM spiritual_parent_requests r
                 JOIN users req ON req.id = r.requester_id
                 JOIN users par ON par.id = r.claimed_parent_id
                 WHERE r.status = ?
                 ORDER BY r.created_at DESC",
                [$status]
            );

            $data = array_map(fn($r) => [
                'id'         => (int)$r['id'],
                'status'     => $r['status'],
                'note'       => $r['note'],
                'created_at' => $r['created_at'],
                'requester'  => [
                    'id'              => (int)$r['requester_id'],
                    'name'            => trim($r['req_first'] . ' ' . $r['req_last']),
                    'profile_picture' => $r['req_pic'],
                ],
                'claimed_parent' => [
                    'id'              => (int)$r['parent_id'],
                    'name'            => trim($r['par_first'] . ' ' . $r['par_last']),
                    'profile_picture' => $r['par_pic'],
                ],
            ], $rows);

            return $this->jsonResponse(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // PATCH /spiritual-lineage/requests/{id} — approve or reject
    public function reviewClaim(Request $request, Response $response, array $args): Response
    {
        try {
            $actorId = $this->getUserId($request);
            if (!$this->isAdminOrPastor($actorId)) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $requestId = (int)($args['id'] ?? 0);
            $data      = $this->parseJsonBody($request);
            $action    = $data['action'] ?? '';

            if (!in_array($action, ['approve', 'reject'])) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'action must be approve or reject'], 400);
            }

            $req = $this->db->first(
                "SELECT * FROM spiritual_parent_requests WHERE id = ? AND status = 'pending'",
                [$requestId]
            );
            if (!$req) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Request not found or already reviewed'], 404);
            }

            $newStatus = $action === 'approve' ? 'approved' : 'rejected';
            $this->db->update('spiritual_parent_requests', [
                'status'      => $newStatus,
                'reviewed_by' => $actorId,
                'reviewed_at' => date('Y-m-d H:i:s'),
            ], 'id = ?', [$requestId]);

            if ($action === 'approve') {
                $this->db->update('users',
                    ['spiritual_parent_id' => (int)$req['claimed_parent_id']],
                    'id = ?',
                    [(int)$req['requester_id']]
                );
            }

            $msg = $action === 'approve' ? 'Claim approved and lineage updated' : 'Claim rejected';
            return $this->jsonResponse(['status' => 'success', 'message' => $msg]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // GET /spiritual-lineage/my-claim — check current user's pending claim
    public function getMyClaim(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $row = $this->db->first(
                "SELECT r.id, r.status, r.note, r.created_at,
                        par.id AS parent_id, par.first_name AS par_first, par.last_name AS par_last, par.profile_picture AS par_pic
                 FROM spiritual_parent_requests r
                 JOIN users par ON par.id = r.claimed_parent_id
                 WHERE r.requester_id = ?
                 ORDER BY r.created_at DESC
                 LIMIT 1",
                [$userId]
            );
            if (!$row) return $this->jsonResponse(['status' => 'success', 'data' => null]);

            return $this->jsonResponse(['status' => 'success', 'data' => [
                'id'         => (int)$row['id'],
                'status'     => $row['status'],
                'note'       => $row['note'],
                'created_at' => $row['created_at'],
                'claimed_parent' => [
                    'id'              => (int)$row['parent_id'],
                    'name'            => trim($row['par_first'] . ' ' . $row['par_last']),
                    'profile_picture' => $row['par_pic'],
                ],
            ]]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    private function wouldCreateCycle(int $targetId, int $newParentId, array $visited): bool
    {
        if ($newParentId === $targetId) return true;
        if (in_array($newParentId, $visited)) return false;
        $visited[] = $newParentId;
        $row = $this->db->first("SELECT spiritual_parent_id FROM users WHERE id = ?", [$newParentId]);
        if (!$row || !$row['spiritual_parent_id']) return false;
        return $this->wouldCreateCycle($targetId, (int)$row['spiritual_parent_id'], $visited);
    }
}
