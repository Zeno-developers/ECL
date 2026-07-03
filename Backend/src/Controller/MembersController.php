<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use App\Database;
use Exception;

class MembersController extends BaseController
{
    private array $allowedRoles = [
        'member',
        'admin',
        'pastor',
        'superadmin',
        'zone_leader',
        'cell_leader',
        'elder',
        'deacon',
        'volunteer',
        'developer',
        'usher'
    ];

    private function normalizeMemberInput(array $data): array
    {
        $fullName = trim((string)($data['name'] ?? ''));
        $nameParts = preg_split('/\s+/', $fullName) ?: [];
        $firstName = $data['first_name'] ?? ($nameParts[0] ?? '');
        $lastName = $data['last_name'] ?? (count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '');

        $status = $data['status'] ?? null;
        $isActive = array_key_exists('is_active', $data)
            ? (int)(bool)$data['is_active']
            : ($status === 'active' ? 1 : 0);

        $role = isset($data['role']) && in_array($data['role'], $this->allowedRoles, true)
            ? $data['role']
            : 'member';

        return [
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'date_of_birth' => $data['date_of_birth'] ?? $data['dateOfBirth'] ?? null,
            'gender' => $data['gender'] ?? null,
            'marital_status' => $data['marital_status'] ?? $data['maritalStatus'] ?? null,
            'membership_date' => $data['membership_date'] ?? $data['joinDate'] ?? date('Y-m-d'),
            'baptism_date' => $data['baptism_date'] ?? null,
            'emergency_contact' => $data['emergency_contact'] ?? $data['emergencyContact'] ?? null,
            'emergency_phone' => $data['emergency_phone'] ?? null,
            'notes' => $data['notes'] ?? null,
            'is_active' => $isActive,
            'role' => $role,
            'status' => $status ?: ($isActive ? 'active' : 'inactive'),
        ];
    }

    private function syncZoneAndCellAssignments(array &$memberData, array &$userData, ?int $memberUserId, array $existingMember): void
    {
        $targetCellId = array_key_exists('cell_id', $memberData)
            ? $memberData['cell_id']
            : (array_key_exists('cell_id', $userData) ? $userData['cell_id'] : ($existingMember['cell_id'] ?? null));
        $targetZoneId = array_key_exists('zone_id', $memberData)
            ? $memberData['zone_id']
            : (array_key_exists('zone_id', $userData) ? $userData['zone_id'] : ($existingMember['zone_id'] ?? null));

        if ($targetCellId) {
            $cell = $this->db->first("SELECT id, zone_id FROM cells WHERE id = ?", [(int)$targetCellId]);
            if ($cell) {
                $targetCellId = (int)$cell['id'];
                $targetZoneId = $cell['zone_id'] !== null ? (int)$cell['zone_id'] : null;
            } else {
                $targetCellId = null;
            }
        }

        if ($targetZoneId === null) {
            $targetCellId = null;
        } elseif ($targetCellId) {
            $cellZone = $this->db->first("SELECT zone_id FROM cells WHERE id = ?", [(int)$targetCellId]);
            if (!$cellZone || (int)($cellZone['zone_id'] ?? 0) !== (int)$targetZoneId) {
                $targetCellId = null;
            }
        }

        if (array_key_exists('zone_id', $memberData) || array_key_exists('cell_id', $memberData) || array_key_exists('zone_id', $userData) || array_key_exists('cell_id', $userData)) {
            $memberData['zone_id'] = $targetZoneId;
            $memberData['cell_id'] = $targetCellId;
            $userData['zone_id'] = $targetZoneId;
            $userData['cell_id'] = $targetCellId;
        }

        if ($memberUserId && $targetZoneId === null) {
            $this->db->query("UPDATE zones SET zone_leader_id = NULL WHERE zone_leader_id = ?", [$memberUserId]);
        }
    }

    public function getAll(Request $request, Response $response): Response
    {
        try {
            $params = $request->getQueryParams();
            $page = (int)($params['page'] ?? 1);
            $limit = (int)($params['limit'] ?? 20);
            $offset = ($page - 1) * $limit;
            $where = ["1 = 1"];
            $queryParams = [];

            if (isset($params['zone_id']) && $params['zone_id'] !== '') {
                $where[] = "m.zone_id = ?";
                $queryParams[] = (int)$params['zone_id'];
            }

            if (isset($params['cell_id']) && $params['cell_id'] !== '') {
                $where[] = "m.cell_id = ?";
                $queryParams[] = (int)$params['cell_id'];
            }

            if (isset($params['is_active']) && $params['is_active'] !== '') {
                $where[] = "m.is_active = ?";
                $queryParams[] = (int)(bool)$params['is_active'];
            }

            if (!empty($params['search'])) {
                $where[] = "(m.first_name LIKE ? OR m.last_name LIKE ? OR m.email LIKE ? OR m.phone LIKE ?)";
                $searchTerm = '%' . trim((string)$params['search']) . '%';
                array_push($queryParams, $searchTerm, $searchTerm, $searchTerm, $searchTerm);
            }

            $whereSql = implode(' AND ', $where);

            $total = $this->db->first(
                "SELECT COUNT(*) as total
                 FROM members m
                 LEFT JOIN users u ON u.id = m.user_id
                 WHERE {$whereSql}",
                $queryParams
            )['total'] ?? 0;

            $membersQueryParams = array_merge($queryParams, [$limit, $offset]);
            $members = $this->db->all(
                "SELECT
                    m.*,
                    COALESCE(u.role, 'member') as role,
                    CASE WHEN m.is_active = 1 THEN 'active' ELSE 'inactive' END as status
                 FROM members m
                 LEFT JOIN users u ON u.id = m.user_id
                 WHERE {$whereSql}
                 ORDER BY m.created_at DESC
                 LIMIT ? OFFSET ?",
                $membersQueryParams
            );
            
            return $this->jsonResponse([
                'status' => 'success',
                'data' => $members,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => (int)$total,
                    'pages' => (int)ceil(((int)$total) / max(1, $limit))
                ]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch members: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getOne(Request $request, Response $response, array $args): Response
    {
        try {
            $member = $this->db->first(
                "SELECT
                    m.*,
                    COALESCE(u.role, 'member') as role,
                    CASE WHEN m.is_active = 1 THEN 'active' ELSE 'inactive' END as status
                 FROM members m
                 LEFT JOIN users u ON u.id = m.user_id
                 WHERE m.id = ?",
                [$args['id']]
            );
            
            if (!$member) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Member not found'
                ], 404);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $member
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch member: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getOverview(Request $request, Response $response, array $args): Response
    {
        try {
            $actorId = $this->getUserId($request);
            $memberId = (int)($args['id'] ?? 0);

            // Base member + user row
            $member = $this->db->first(
                "SELECT m.*, u.role, u.last_login, u.created_at AS user_created_at,
                        u.email_verified, u.phone_verified, u.is_active AS user_active,
                        CASE WHEN m.is_active = 1 THEN 'active' ELSE 'inactive' END AS status
                 FROM members m
                 LEFT JOIN users u ON u.id = m.user_id
                 WHERE m.id = ?",
                [$memberId]
            );
            if (!$member) return $this->jsonResponse(['status' => 'error', 'message' => 'Member not found'], 404);
            $userId = (int)($member['user_id'] ?? 0);

            // Zone + Cell
            $zone = $member['zone_id']
                ? $this->db->first("SELECT id, name FROM zones WHERE id = ?", [(int)$member['zone_id']])
                : null;
            $cell = $member['cell_id']
                ? $this->db->first(
                    "SELECT c.id, c.name, c.meeting_day, c.meeting_time, c.meeting_location,
                            CONCAT(u.first_name,' ',u.last_name) AS leader_name
                     FROM cells c LEFT JOIN users u ON u.id = c.cell_leader_id WHERE c.id = ?",
                    [(int)$member['cell_id']]
                  )
                : null;

            // Spiritual lineage summary
            $lineage = null;
            if ($userId) {
                $lRow = $this->db->first(
                    "SELECT u.spiritual_parent_id,
                            CONCAT(p.first_name,' ',p.last_name) AS parent_name,
                            (SELECT COUNT(*) FROM users WHERE spiritual_parent_id = u.id AND is_active=1) AS direct_disciples
                     FROM users u
                     LEFT JOIN users p ON p.id = u.spiritual_parent_id
                     WHERE u.id = ?",
                    [$userId]
                );
                $lineage = $lRow ?: null;
            }

            // Family summary
            $family = ['spouse' => null, 'parents' => [], 'children' => []];
            if ($userId) {
                $family['spouse'] = $this->db->first(
                    "SELECT u.id, u.first_name, u.last_name FROM marriages m
                     JOIN users u ON u.id = IF(m.member1_id=?, m.member2_id, m.member1_id)
                     WHERE (m.member1_id=? OR m.member2_id=?) AND m.status='active'",
                    [$userId, $userId, $userId]
                );
                $family['parents'] = $this->db->all(
                    "SELECT u.id, u.first_name, u.last_name FROM parent_child pc JOIN users u ON u.id=pc.parent_id WHERE pc.child_id=?", [$userId]
                );
                $family['children'] = $this->db->all(
                    "SELECT u.id, u.first_name, u.last_name FROM parent_child pc JOIN users u ON u.id=pc.child_id WHERE pc.parent_id=?", [$userId]
                );
            }

            // Disciples groups
            $disciplesGroups = $userId ? $this->db->all(
                "SELECT dg.id, dg.name, dgm.joined_at,
                        CONCAT(lu.first_name,' ',lu.last_name) AS leader_name
                 FROM disciples_group_members dgm
                 JOIN disciples_groups dg ON dg.id = dgm.group_id
                 JOIN users lu ON lu.id = dg.leader_id
                 WHERE dgm.user_id = ? AND dg.is_active = 1",
                [$userId]
            ) : [];
            // Also check if they're a leader of any group
            $ledGroups = $userId ? $this->db->all(
                "SELECT id, name FROM disciples_groups WHERE leader_id = ? AND is_active = 1", [$userId]
            ) : [];

            // Sunday attendance last 12 months
            $sundayAttendance = $userId ? $this->db->all(
                "SELECT attendance_date, check_in_time FROM attendance_sunday
                 WHERE user_id = ? AND attendance_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                 ORDER BY attendance_date DESC LIMIT 52",
                [$userId]
            ) : [];
            $sundayTotal = count($sundayAttendance);

            // Cell attendance last 12 months
            $cellAttendance = $userId ? $this->db->first(
                "SELECT COUNT(*) AS cnt FROM attendance_cell
                 WHERE user_id = ? AND meeting_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)",
                [$userId]
            ) : null;

            // Giving summary
            $givingSummary = $userId ? $this->db->first(
                "SELECT COUNT(*) AS count, COALESCE(SUM(amount),0) AS total,
                        MAX(service_date) AS last_gift_date
                 FROM giving WHERE user_id = ?",
                [$userId]
            ) : null;
            $recentGiving = $userId ? $this->db->all(
                "SELECT amount, fund, service_date, payment_method FROM giving
                 WHERE user_id = ? ORDER BY service_date DESC LIMIT 5",
                [$userId]
            ) : [];

            // Prayer requests
            $prayers = $userId ? $this->db->all(
                "SELECT id, title, status, priority, created_at FROM prayers
                 WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
                [$userId]
            ) : [];
            $prayerCount = $userId ? (int)($this->db->first(
                "SELECT COUNT(*) AS cnt FROM prayers WHERE user_id = ?", [$userId]
            )['cnt'] ?? 0) : 0;

            // Engagement score (most recent 6 months)
            $engagement = $userId ? $this->db->all(
                "SELECT month_year, sunday_attendance_count, cell_attendance_count, total_score
                 FROM engagement_scores WHERE user_id = ?
                 ORDER BY month_year DESC LIMIT 6",
                [$userId]
            ) : [];

            // Recent activity log
            $activityLog = $userId ? $this->db->all(
                "SELECT action, entity_type, details, ip_address, created_at
                 FROM activity_logs WHERE user_id = ?
                 ORDER BY created_at DESC LIMIT 15",
                [$userId]
            ) : [];

            // Login count from activity logs
            $loginCount = $userId ? (int)($this->db->first(
                "SELECT COUNT(*) AS cnt FROM activity_logs WHERE user_id = ? AND action = 'login'", [$userId]
            )['cnt'] ?? 0) : 0;

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'member'          => $member,
                    'zone'            => $zone,
                    'cell'            => $cell,
                    'lineage'         => $lineage,
                    'family'          => $family,
                    'disciples_groups'=> $disciplesGroups,
                    'led_groups'      => $ledGroups,
                    'sunday_attendance'=> [
                        'total_12m' => $sundayTotal,
                        'records'   => $sundayAttendance,
                    ],
                    'cell_attendance_12m' => (int)($cellAttendance['cnt'] ?? 0),
                    'giving'          => [
                        'summary' => $givingSummary,
                        'recent'  => $recentGiving,
                    ],
                    'prayers'         => ['count' => $prayerCount, 'recent' => $prayers],
                    'engagement'      => $engagement,
                    'activity_log'    => $activityLog,
                    'login_count'     => $loginCount,
                ],
            ]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function create(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            if (!is_array($data)) {
                $data = [];
            }
            $normalized = $this->normalizeMemberInput($data);
            
            $required = ['first_name', 'last_name'];
            $errors = $this->validateRequired($normalized, $required);
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $maxRow = $this->db->first("SELECT MAX(CAST(SUBSTRING(member_number, 2) AS UNSIGNED)) AS maxnum FROM members");
            $memberNumber = 'M' . str_pad(((int)($maxRow['maxnum'] ?? 0)) + 1, 6, '0', STR_PAD_LEFT);

            $memberData = [
                'member_number' => $memberNumber,
                'first_name' => $this->sanitizeString($normalized['first_name']),
                'last_name' => $this->sanitizeString($normalized['last_name']),
                'email' => $normalized['email'] ? filter_var($normalized['email'], FILTER_SANITIZE_EMAIL) : null,
                'phone' => $normalized['phone'] ? $this->sanitizeString($normalized['phone']) : null,
                'address' => $normalized['address'] ? $this->sanitizeString($normalized['address']) : null,
                'date_of_birth' => $normalized['date_of_birth'],
                'gender' => in_array($normalized['gender'], ['male', 'female', 'other'], true) ? $normalized['gender'] : 'male',
                'marital_status' => in_array($normalized['marital_status'], ['single', 'married', 'widowed', 'divorced'], true) ? $normalized['marital_status'] : 'single',
                'membership_date' => $normalized['membership_date'] ?: date('Y-m-d'),
                'baptism_date' => $normalized['baptism_date'],
                'emergency_contact' => $normalized['emergency_contact'] ? $this->sanitizeString($normalized['emergency_contact']) : null,
                'emergency_phone' => $normalized['emergency_phone'] ? $this->sanitizeString($normalized['emergency_phone']) : null,
                'notes' => $normalized['notes'] ? $this->sanitizeString($normalized['notes']) : null,
                'is_active' => (int)$normalized['is_active']
            ];

            // If email is provided, attach/create a users row so role can be assigned and persisted.
            if (!empty($memberData['email'])) {
                $existingUser = $this->db->first("SELECT id FROM users WHERE email = ?", [$memberData['email']]);
                if ($existingUser) {
                    $memberData['user_id'] = (int)$existingUser['id'];
                    $this->db->query(
                        "UPDATE users SET role = ?, first_name = ?, last_name = ?, phone = ?, is_active = ? WHERE id = ?",
                        [
                            $normalized['role'],
                            $memberData['first_name'],
                            $memberData['last_name'],
                            $memberData['phone'],
                            $memberData['is_active'],
                            $memberData['user_id']
                        ]
                    );
                } else {
                    $plainPassword = bin2hex(random_bytes(8));
                    $userId = $this->db->insert('users', [
                        'uuid' => $this->generateUuid(),
                        'email' => $memberData['email'],
                        'password' => password_hash($plainPassword, PASSWORD_DEFAULT),
                        'first_name' => $memberData['first_name'],
                        'last_name' => $memberData['last_name'],
                        'phone' => $memberData['phone'],
                        'role' => $normalized['role'],
                        'is_active' => $memberData['is_active'],
                        'email_verified' => 1,
                        'must_change_password' => 1,
                    ]);
                    $memberData['user_id'] = $userId;
                }
            }

            $memberId = $this->db->insert('members', $memberData);
            $member = $this->db->first(
                "SELECT
                    m.*,
                    COALESCE(u.role, 'member') as role,
                    CASE WHEN m.is_active = 1 THEN 'active' ELSE 'inactive' END as status
                 FROM members m
                 LEFT JOIN users u ON u.id = m.user_id
                 WHERE m.id = ?",
                [$memberId]
            );

            // Send welcome credentials to newly-created user accounts
            if (!empty($memberData['email']) && isset($plainPassword)) {
                $frontendUrl = getenv('FRONTEND_URL') ?: 'https://elchurch.site';
                try {
                    $mailService = new \App\Services\MailService();
                    $mailService->sendVisitorAccountCreatedEmail(
                        $memberData['email'],
                        $memberData['first_name'],
                        $memberData['last_name'],
                        $plainPassword,
                        $frontendUrl . '/login',
                        $member['member_number'] ?? $memberNumber
                    );
                } catch (\Exception $mailError) {
                    error_log('Admin-created member welcome email failed: ' . $mailError->getMessage());
                }
                if (!empty($memberData['phone'])) {
                    try {
                        $name = $memberData['first_name'];
                        $smsBody = "Hi $name, your Eternal Love Church account is ready. Email: {$memberData['email']} | Temp password: $plainPassword - login at elchurch.site";
                        (new \App\Services\WhatsAppService())->send([['phone' => $memberData['phone']]], $smsBody);
                    } catch (\Exception $smsError) {
                        error_log('Admin-created member welcome SMS failed: ' . $smsError->getMessage());
                    }
                }
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Member created successfully',
                'data' => $member
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to create member: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            $memberId = (int)$args['id'];
            $existingMember = $this->db->first("SELECT * FROM members WHERE id = ?", [$memberId]);

            if (!$existingMember) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Member not found'
                ], 404);
            }
            
            $memberAllowedFields = [
                'first_name', 'last_name', 'email', 'phone', 'address', 
                'date_of_birth', 'gender', 'marital_status', 'membership_date',
                'baptism_date', 'emergency_contact', 'emergency_phone', 'notes', 'is_active',
                'zone_id', 'cell_id'
            ];
            $userAllowedFields = ['first_name', 'last_name', 'email', 'phone', 'is_active', 'zone_id', 'cell_id', 'role'];
            
            $memberUpdateData = [];
            $userUpdateData = [];

            foreach ($memberAllowedFields as $field) {
                if (isset($data[$field])) {
                    if (in_array($field, ['email'])) {
                        $memberUpdateData[$field] = filter_var($data[$field], FILTER_SANITIZE_EMAIL);
                    } elseif (in_array($field, ['zone_id', 'cell_id'])) {
                        $memberUpdateData[$field] = $data[$field] !== null ? (int)$data[$field] : null;
                    } elseif (in_array($field, ['is_active'])) {
                        $memberUpdateData[$field] = (bool)$data[$field] ? 1 : 0;
                    } else {
                        $memberUpdateData[$field] = is_string($data[$field]) ? $this->sanitizeString($data[$field]) : $data[$field];
                    }
                }
            }

            foreach ($userAllowedFields as $field) {
                if (!array_key_exists($field, $data)) {
                    continue;
                }

                if ($field === 'role') {
                    if (!in_array($data['role'], $this->allowedRoles, true)) {
                        return $this->jsonResponse([
                            'status' => 'error',
                            'message' => 'Invalid role provided'
                        ], 400);
                    }
                    $userUpdateData['role'] = $data['role'];
                    continue;
                }

                if ($field === 'email') {
                    $userUpdateData[$field] = filter_var($data[$field], FILTER_SANITIZE_EMAIL);
                } elseif (in_array($field, ['zone_id', 'cell_id'], true)) {
                    $userUpdateData[$field] = $data[$field] !== null ? (int)$data[$field] : null;
                } elseif ($field === 'is_active') {
                    $userUpdateData[$field] = (bool)$data[$field] ? 1 : 0;
                } else {
                    $userUpdateData[$field] = is_string($data[$field]) ? $this->sanitizeString($data[$field]) : $data[$field];
                }
            }

            if (empty($memberUpdateData) && empty($userUpdateData)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'No data to update'
                ], 400);
            }

            $memberUserId = !empty($existingMember['user_id']) ? (int)$existingMember['user_id'] : null;
            $this->syncZoneAndCellAssignments($memberUpdateData, $userUpdateData, $memberUserId, $existingMember);

            $this->db->beginTransaction();

            if (!empty($memberUpdateData)) {
                $setClause = implode(', ', array_map(fn($key) => "$key = ?", array_keys($memberUpdateData)));
                $params = array_merge(array_values($memberUpdateData), [$memberId]);
                $this->db->query(
                    "UPDATE members SET $setClause, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    $params
                );
            }

            if (!$memberUserId && (!empty($userUpdateData) || !empty($memberUpdateData['email'] ?? null))) {
                $email = $userUpdateData['email'] ?? $memberUpdateData['email'] ?? $existingMember['email'] ?? null;
                if ($email) {
                    $existingUser = $this->db->first("SELECT id FROM users WHERE email = ?", [$email]);
                    if ($existingUser) {
                        $memberUserId = (int)$existingUser['id'];
                    } else {
                        $memberUserId = $this->db->insert('users', [
                            'uuid' => $this->generateUuid(),
                            'email' => $email,
                            'password' => password_hash(bin2hex(random_bytes(8)), PASSWORD_DEFAULT),
                            'first_name' => $userUpdateData['first_name'] ?? $memberUpdateData['first_name'] ?? $existingMember['first_name'],
                            'last_name' => $userUpdateData['last_name'] ?? $memberUpdateData['last_name'] ?? $existingMember['last_name'],
                            'phone' => $userUpdateData['phone'] ?? $memberUpdateData['phone'] ?? $existingMember['phone'],
                            'role' => $userUpdateData['role'] ?? 'member',
                            'cell_id' => $userUpdateData['cell_id'] ?? $memberUpdateData['cell_id'] ?? null,
                            'zone_id' => $userUpdateData['zone_id'] ?? $memberUpdateData['zone_id'] ?? null,
                            'is_active' => $userUpdateData['is_active'] ?? $memberUpdateData['is_active'] ?? (int)$existingMember['is_active'],
                            'email_verified' => 1
                        ]);
                    }

                    $this->db->query("UPDATE members SET user_id = ? WHERE id = ?", [$memberUserId, $memberId]);
                }
            }

            if ($memberUserId && !empty($userUpdateData)) {
                $setClause = implode(', ', array_map(fn($key) => "$key = ?", array_keys($userUpdateData)));
                $params = array_merge(array_values($userUpdateData), [$memberUserId]);
                $this->db->query(
                    "UPDATE users SET $setClause, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    $params
                );

                if (isset($userUpdateData['role']) && in_array($userUpdateData['role'], ['cell_leader', 'zone_leader', 'pastor', 'admin', 'superadmin', 'usher'], true)) {
                    $this->db->insert('activity_logs', [
                        'user_id' => $this->getUserId($request),
                        'action' => 'leader_promoted',
                        'entity_type' => 'user',
                        'entity_id' => $memberUserId,
                        'details' => json_encode([
                            'new_role' => $userUpdateData['role'],
                            'source' => 'member_update'
                        ])
                    ]);
                }

                if (isset($userUpdateData['role']) && in_array($userUpdateData['role'], ['cell_leader', 'zone_leader', 'pastor', 'admin', 'superadmin', 'usher'], true)) {
                    $promotedUser = $this->db->first(
                        "SELECT id, first_name, last_name, email, role FROM users WHERE id = ?",
                        [$memberUserId]
                    );
                    if ($promotedUser) {
                        $notificationService = new \App\Service\PastorNotificationService($this->db);
                        $notificationService->notifyLeadershipPromotion($promotedUser, $userUpdateData['role'], [
                            'assignment' => 'Member update'
                        ]);
                    }
                }
            }

            $this->db->commit();

            $member = $this->db->first(
                "SELECT
                    m.*,
                    COALESCE(u.role, 'member') as role,
                    CASE WHEN m.is_active = 1 THEN 'active' ELSE 'inactive' END as status
                 FROM members m
                 LEFT JOIN users u ON u.id = m.user_id
                 WHERE m.id = ?",
                [$memberId]
            );

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Member updated successfully',
                'data' => $member
            ]);

        } catch (Exception $e) {
            if ($this->db->getConnection()->inTransaction()) {
                $this->db->rollBack();
            }

            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update member: ' . $e->getMessage()
            ], 500);
        }
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        try {
            $memberId = $args['id'];
            $deleted = $this->db->delete('members', 'id = ?', [$memberId]);
            
            if (!$deleted) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Member not found'
                ], 404);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Member deleted successfully'
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to delete member: ' . $e->getMessage()
            ], 500);
        }
    }

    public function search(Request $request, Response $response): Response
    {
        try {
            $query = $request->getQueryParams()['q'] ?? '';
            
            if (empty($query)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Search query is required'
                ], 400);
            }

            $sql = "SELECT
                        m.*,
                        COALESCE(u.role, 'member') as role,
                        CASE WHEN m.is_active = 1 THEN 'active' ELSE 'inactive' END as status
                    FROM members m
                    LEFT JOIN users u ON u.id = m.user_id
                    WHERE m.first_name LIKE ? OR m.last_name LIKE ? OR m.email LIKE ? OR m.phone LIKE ?
                    ORDER BY m.first_name, m.last_name LIMIT 50";
            $searchTerm = "%$query%";
            $members = $this->db->all($sql, [$searchTerm, $searchTerm, $searchTerm, $searchTerm]);

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $members
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Search failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getStats(Request $request, Response $response): Response
    {
        try {
            $stats = [
                'total_members' => $this->db->first("SELECT COUNT(*) as count FROM members")['count'],
                'active_members' => $this->db->first("SELECT COUNT(*) as count FROM members WHERE is_active = 1")['count'],
                'new_members_this_month' => $this->db->first(
                    "SELECT COUNT(*) as count FROM members WHERE strftime('%m', created_at) = strftime('%m', 'now') AND strftime('%Y', created_at) = strftime('%Y', 'now')"
                )['count'],
                'members_by_gender' => [
                    'male' => $this->db->first("SELECT COUNT(*) as count FROM members WHERE gender = 'male'")['count'],
                    'female' => $this->db->first("SELECT COUNT(*) as count FROM members WHERE gender = 'female'")['count'],
                    'other' => $this->db->first("SELECT COUNT(*) as count FROM members WHERE gender = 'other'")['count']
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

    public function getProfile(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $member = $this->db->first("SELECT * FROM members WHERE user_id = ?", [$userId]);
            
            if (!$member) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Member profile not found'
                ], 404);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => ['member' => $member]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get profile: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateProfile(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $data = json_decode($request->getBody()->getContents(), true) ?: [];

            $member = $this->db->first("SELECT * FROM members WHERE user_id = ?", [$userId]);
            if (!$member) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Member profile not found'
                ], 404);
            }

            $memberAllowedFields = [
                'first_name', 'last_name', 'email', 'phone', 'address',
                'date_of_birth', 'gender', 'marital_status', 'membership_date',
                'baptism_date', 'emergency_contact', 'emergency_phone', 'notes',
                'spiritual_gifts', 'ministry_interests'
            ];

            $memberUpdateData = [];
            foreach ($memberAllowedFields as $field) {
                if (!array_key_exists($field, $data)) {
                    continue;
                }

                if ($data[$field] === null) {
                    $memberUpdateData[$field] = null;
                    continue;
                }

                if (in_array($field, ['spiritual_gifts', 'ministry_interests'], true)) {
                    // Store as JSON array (string) for flexibility, but accept either array or string input.
                    if (is_array($data[$field])) {
                        $memberUpdateData[$field] = json_encode(array_values(array_filter(array_map(
                            fn($v) => $this->sanitizeString((string)$v),
                            $data[$field]
                        ), fn($v) => $v !== '')));
                    } else {
                        $memberUpdateData[$field] = $this->sanitizeString((string)$data[$field]);
                    }
                } elseif ($field === 'email') {
                    $memberUpdateData[$field] = filter_var($data[$field], FILTER_SANITIZE_EMAIL);
                } elseif (in_array($field, ['date_of_birth', 'membership_date', 'baptism_date'], true)) {
                    $memberUpdateData[$field] = $data[$field];
                } else {
                    $memberUpdateData[$field] = $this->sanitizeString((string)$data[$field]);
                }
            }

            if (!empty($memberUpdateData)) {
                $setClause = implode(', ', array_map(fn($key) => "$key = ?", array_keys($memberUpdateData)));
                $this->db->query(
                    "UPDATE members SET $setClause, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                    array_merge(array_values($memberUpdateData), [$userId])
                );
            }

            $userAllowedFields = ['first_name', 'last_name', 'email', 'phone'];
            $userUpdateData = [];
            foreach ($userAllowedFields as $field) {
                if (!array_key_exists($field, $data)) {
                    continue;
                }

                if ($data[$field] === null) {
                    $userUpdateData[$field] = null;
                    continue;
                }

                if ($field === 'email') {
                    $userUpdateData[$field] = filter_var($data[$field], FILTER_SANITIZE_EMAIL);
                } else {
                    $userUpdateData[$field] = $this->sanitizeString((string)$data[$field]);
                }
            }

            if (!empty($userUpdateData)) {
                $setClause = implode(', ', array_map(fn($key) => "$key = ?", array_keys($userUpdateData)));
                $this->db->query(
                    "UPDATE users SET $setClause, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    array_merge(array_values($userUpdateData), [$userId])
                );
            }

            $updatedMember = $this->db->first("SELECT * FROM members WHERE user_id = ?", [$userId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Profile updated successfully',
                'data' => ['member' => $updatedMember]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update profile: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateRole(Request $request, Response $response, array $args): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            $allowedRoles = [
                'member',
                'admin',
                'pastor',
                'superadmin',
                'zone_leader',
                'cell_leader',
                'elder',
                'deacon',
                'volunteer',
                'developer',
                'usher'
            ];

            if (!isset($data['role']) || !in_array($data['role'], $allowedRoles, true)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Invalid role provided'
                ], 400);
            }

            $targetId = (int)$args['id'];
            $targetUser = $this->db->first("SELECT id FROM users WHERE id = ?", [$targetId]);
            if (!$targetUser) {
                $member = $this->db->first("SELECT user_id FROM members WHERE id = ?", [$targetId]);
                if (!$member || empty($member['user_id'])) {
                    return $this->jsonResponse([
                        'status' => 'error',
                        'message' => 'Target member/user not found'
                    ], 404);
                }
                $targetId = (int)$member['user_id'];
            }

            $this->db->query(
                "UPDATE users SET role = ? WHERE id = ?",
                [$data['role'], $targetId]
            );

            if (in_array($data['role'], ['cell_leader', 'zone_leader', 'pastor', 'admin', 'superadmin', 'usher'], true)) {
                $this->db->insert('activity_logs', [
                    'user_id' => $this->getUserId($request),
                    'action' => 'leader_promoted',
                    'entity_type' => 'user',
                    'entity_id' => $targetId,
                    'details' => json_encode([
                        'new_role' => $data['role']
                    ])
                ]);
            }

            if (in_array($data['role'], ['cell_leader', 'zone_leader', 'pastor', 'admin', 'superadmin', 'usher'], true)) {
                $promotedUser = $this->db->first(
                    "SELECT id, first_name, last_name, email, role FROM users WHERE id = ?",
                    [$targetId]
                );
                if ($promotedUser) {
                    $notificationService = new \App\Service\PastorNotificationService($this->db);
                    $notificationService->notifyLeadershipPromotion($promotedUser, $data['role'], [
                        'assignment' => 'Manual role update'
                    ]);
                }
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Member role updated successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update role: ' . $e->getMessage()
            ], 500);
        }
    }
}
