<?php

namespace App\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class DisciplesController extends BaseController
{
    private function isAdminOrPastor(int $userId): bool
    {
        $user = $this->db->first("SELECT role FROM users WHERE id = ?", [$userId]);
        return $user && in_array($user['role'], ['admin', 'pastor', 'superadmin', 'elder'], true);
    }

    private function isGroupLeader(int $userId, int $groupId): bool
    {
        $group = $this->db->first("SELECT leader_id FROM disciples_groups WHERE id = ?", [$groupId]);
        return $group && (int)$group['leader_id'] === $userId;
    }

    private function canManageGroup(int $userId, int $groupId): bool
    {
        return $this->isGroupLeader($userId, $groupId) || $this->isAdminOrPastor($userId);
    }

    private function isGroupParticipant(int $userId, int $groupId): bool
    {
        if ($this->canManageGroup($userId, $groupId)) return true;
        $member = $this->db->first(
            "SELECT id FROM disciples_group_members WHERE group_id = ? AND user_id = ?",
            [$groupId, $userId]
        );
        return (bool)$member;
    }

    // ── Groups ──────────────────────────────────────────────────────────────────

    // GET /disciples/groups
    public function listGroups(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $params = $request->getQueryParams();
            $all    = ($params['all'] ?? '') === '1';

            $memberCountSql = "(SELECT COUNT(*) FROM disciples_group_members dgm JOIN users mu ON mu.id = dgm.user_id WHERE dgm.group_id = dg.id)";
            $lastMeetingSql = "(SELECT MAX(meeting_date) FROM disciples_group_meetings WHERE group_id = dg.id)";
            $avgAttendanceSql = "(SELECT ROUND(AVG(a.attended) * 100) FROM disciples_group_attendance a JOIN disciples_group_meetings m ON m.id = a.meeting_id WHERE m.group_id = dg.id AND m.meeting_date <= CURDATE() AND EXISTS (SELECT 1 FROM disciples_group_attendance x WHERE x.meeting_id = m.id AND x.attended = 1))";

            if ($all && $this->isAdminOrPastor($userId)) {
                $groups = $this->db->all(
                    "SELECT dg.*, CONCAT(u.first_name, ' ', u.last_name) AS leader_name,
                            $memberCountSql AS member_count,
                            $lastMeetingSql AS last_meeting_date,
                            $avgAttendanceSql AS avg_attendance_pct
                     FROM disciples_groups dg
                     JOIN users u ON u.id = dg.leader_id
                     WHERE dg.is_active = 1
                     ORDER BY dg.name ASC"
                );
            } else {
                $groups = $this->db->all(
                    "SELECT dg.*, CONCAT(u.first_name, ' ', u.last_name) AS leader_name,
                            $memberCountSql AS member_count,
                            $lastMeetingSql AS last_meeting_date,
                            $avgAttendanceSql AS avg_attendance_pct,
                            CASE WHEN dg.leader_id = ? THEN 'leader' ELSE 'member' END AS my_role
                     FROM disciples_groups dg
                     JOIN users u ON u.id = dg.leader_id
                     LEFT JOIN disciples_group_members dgm2 ON dgm2.group_id = dg.id AND dgm2.user_id = ?
                     WHERE dg.is_active = 1 AND (dg.leader_id = ? OR dgm2.user_id = ?)
                     ORDER BY dg.name ASC",
                    [$userId, $userId, $userId, $userId]
                );
            }

            return $this->jsonResponse(['status' => 'success', 'data' => $groups]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // GET /disciples/groups/{id}
    public function getGroup(Request $request, Response $response, array $args): Response
    {
        try {
            $userId  = $this->getUserId($request);
            $groupId = (int)($args['id'] ?? 0);

            $group = $this->db->first(
                "SELECT dg.*, CONCAT(u.first_name, ' ', u.last_name) AS leader_name, u.profile_picture AS leader_picture
                 FROM disciples_groups dg JOIN users u ON u.id = dg.leader_id
                 WHERE dg.id = ?",
                [$groupId]
            );
            if (!$group) return $this->jsonResponse(['status' => 'error', 'message' => 'Group not found'], 404);

            // Remove orphaned membership records whose user no longer exists
            $this->db->query(
                "DELETE dgm FROM disciples_group_members dgm
                 LEFT JOIN users u ON u.id = dgm.user_id
                 WHERE dgm.group_id = ? AND u.id IS NULL",
                [$groupId]
            );

            $members = $this->db->all(
                "SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.profile_picture, dgm.joined_at
                 FROM disciples_group_members dgm
                 JOIN users u ON u.id = dgm.user_id
                 WHERE dgm.group_id = ?
                 ORDER BY u.first_name ASC",
                [$groupId]
            );

            // Only count past meetings that have been explicitly recorded (have attended=1 rows)
            $recentMeetingRows = $this->db->all(
                "SELECT dgm.id FROM disciples_group_meetings dgm
                 WHERE dgm.group_id = ?
                   AND dgm.meeting_date <= CURDATE()
                   AND EXISTS (SELECT 1 FROM disciples_group_attendance WHERE meeting_id = dgm.id AND attended = 1)
                 ORDER BY dgm.meeting_date DESC LIMIT 10",
                [$groupId]
            );
            $meetingIds = array_column($recentMeetingRows, 'id');

            if (!empty($members) && !empty($meetingIds)) {
                $memberIds    = array_column($members, 'id');
                $mHolders     = implode(',', array_fill(0, count($meetingIds), '?'));
                $uHolders     = implode(',', array_fill(0, count($memberIds), '?'));

                $attendanceRows = $this->db->all(
                    "SELECT user_id, meeting_id, attended FROM disciples_group_attendance
                     WHERE meeting_id IN ($mHolders) AND user_id IN ($uHolders)",
                    array_merge($meetingIds, $memberIds)
                );

                $aMap = [];
                foreach ($attendanceRows as $row) {
                    $aMap[$row['user_id']][$row['meeting_id']] = (int)$row['attended'];
                }

                foreach ($members as &$m) {
                    $ua     = $aMap[$m['id']] ?? [];
                    $streak = 0;
                    foreach ($meetingIds as $mid) {
                        if (($ua[$mid] ?? 0) == 0) $streak++;
                        else break;
                    }
                    $attended              = count(array_filter($ua, fn($a) => $a == 1));
                    $m['absence_streak']   = $streak;
                    $m['attendance_rate']  = count($meetingIds) > 0
                        ? round(($attended / count($meetingIds)) * 100)
                        : null;
                    $m['meetings_tracked'] = count($meetingIds);
                }
                unset($m);
            } else {
                foreach ($members as &$m) {
                    $m['absence_streak']   = 0;
                    $m['attendance_rate']  = null;
                    $m['meetings_tracked'] = 0;
                }
                unset($m);
            }

            $recentMeetings = $this->db->all(
                "SELECT * FROM disciples_group_meetings WHERE group_id = ? ORDER BY meeting_date DESC LIMIT 5",
                [$groupId]
            );

            // My own attendance summary (for member self-view)
            $myStats = null;
            $isMemberRow = $this->db->first(
                "SELECT id FROM disciples_group_members WHERE group_id = ? AND user_id = ?",
                [$groupId, $userId]
            );
            if ($isMemberRow && !empty($meetingIds)) {
                $ua = $aMap[$userId] ?? [];
                $attended = count(array_filter($ua, fn($a) => $a == 1));
                $myStats = [
                    'attended'       => $attended,
                    'total'          => count($meetingIds),
                    'rate'           => count($meetingIds) > 0 ? round(($attended / count($meetingIds)) * 100) : null,
                    'absence_streak' => $members[array_search($userId, array_column($members, 'id'))]['absence_streak'] ?? 0,
                ];
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data'   => array_merge($group, [
                    'members'         => $members,
                    'recent_meetings' => $recentMeetings,
                    'my_role'         => $this->isGroupLeader($userId, $groupId) ? 'leader' : 'member',
                    'my_stats'        => $myStats,
                ]),
            ]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // POST /disciples/groups
    public function createGroup(Request $request, Response $response): Response
    {
        try {
            $actorId = $this->getUserId($request);
            $data    = $this->parseJsonBody($request);
            $errors  = $this->validateRequired($data, ['name', 'leader_id']);
            if ($errors) return $this->jsonResponse(['status' => 'error', 'message' => $errors[0]], 400);

            $leaderId = (int)$data['leader_id'];
            if ($leaderId !== $actorId && !$this->isAdminOrPastor($actorId)) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $groupId = $this->db->insert('disciples_groups', [
                'name'        => $this->sanitizeString($data['name']),
                'description' => isset($data['description']) ? $this->sanitizeString($data['description']) : null,
                'leader_id'   => $leaderId,
                'is_active'   => 1,
                'created_by'  => $actorId,
                'created_at'  => date('Y-m-d H:i:s'),
            ]);

            return $this->jsonResponse(['status' => 'success', 'message' => 'Group created', 'data' => ['id' => $groupId]]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // PATCH /disciples/groups/{id}
    public function updateGroup(Request $request, Response $response, array $args): Response
    {
        try {
            $actorId = $this->getUserId($request);
            $groupId = (int)($args['id'] ?? 0);
            if (!$this->canManageGroup($actorId, $groupId)) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $data    = $this->parseJsonBody($request);
            $payload = [];
            if (isset($data['name']))        $payload['name']        = $this->sanitizeString($data['name']);
            if (isset($data['description'])) $payload['description'] = $this->sanitizeString($data['description']);
            if (isset($data['is_active']))   $payload['is_active']   = (int)$data['is_active'];

            if ($payload) $this->db->update('disciples_groups', $payload, 'id = ?', [$groupId]);
            return $this->jsonResponse(['status' => 'success', 'message' => 'Group updated']);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // GET /disciples/stats  (admin overview)
    public function getStats(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            if (!$this->isAdminOrPastor($userId)) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $groups = $this->db->all(
                "SELECT dg.id, dg.name, dg.is_active,
                        CONCAT(u.first_name, ' ', u.last_name) AS leader_name,
                        (SELECT COUNT(*) FROM disciples_group_members dgm JOIN users mu ON mu.id = dgm.user_id WHERE dgm.group_id = dg.id) AS member_count,
                        (SELECT MAX(meeting_date) FROM disciples_group_meetings WHERE group_id = dg.id) AS last_meeting_date,
                        (SELECT COUNT(*) FROM disciples_group_meetings WHERE group_id = dg.id) AS total_meetings,
                        (SELECT ROUND(AVG(a.attended) * 100) FROM disciples_group_attendance a JOIN disciples_group_meetings m ON m.id = a.meeting_id WHERE m.group_id = dg.id) AS avg_attendance_pct
                 FROM disciples_groups dg
                 JOIN users u ON u.id = dg.leader_id
                 ORDER BY dg.name ASC"
            );

            return $this->jsonResponse(['status' => 'success', 'data' => $groups]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // ── Members ─────────────────────────────────────────────────────────────────

    // POST /disciples/groups/{id}/members
    public function addMember(Request $request, Response $response, array $args): Response
    {
        try {
            $actorId = $this->getUserId($request);
            $groupId = (int)($args['id'] ?? 0);
            if (!$this->canManageGroup($actorId, $groupId)) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $data   = $this->parseJsonBody($request);
            $userId = (int)($data['user_id'] ?? 0);
            if (!$userId) return $this->jsonResponse(['status' => 'error', 'message' => 'user_id required'], 400);

            $currentGroup = $this->db->first(
                "SELECT dg.name FROM disciples_group_members dgm
                 JOIN disciples_groups dg ON dg.id = dgm.group_id
                 WHERE dgm.user_id = ? AND dg.is_active = 1",
                [$userId]
            );
            if ($currentGroup) {
                return $this->jsonResponse([
                    'status'  => 'error',
                    'message' => "This member is already in the \"{$currentGroup['name']}\" group. Each member can only belong to one discipleship group.",
                ], 409);
            }

            $this->db->insert('disciples_group_members', [
                'group_id'  => $groupId,
                'user_id'   => $userId,
                'joined_at' => date('Y-m-d H:i:s'),
            ]);

            return $this->jsonResponse(['status' => 'success', 'message' => 'Member added to group']);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // DELETE /disciples/groups/{id}/members/{userId}
    public function removeMember(Request $request, Response $response, array $args): Response
    {
        try {
            $actorId  = $this->getUserId($request);
            $groupId  = (int)($args['id'] ?? 0);
            $targetId = (int)($args['userId'] ?? 0);
            if (!$this->canManageGroup($actorId, $groupId)) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $this->db->query(
                "DELETE FROM disciples_group_members WHERE group_id = ? AND user_id = ?",
                [$groupId, $targetId]
            );
            return $this->jsonResponse(['status' => 'success', 'message' => 'Member removed']);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // ── Meetings & Attendance ───────────────────────────────────────────────────

    // GET /disciples/groups/{id}/meetings
    public function listMeetings(Request $request, Response $response, array $args): Response
    {
        try {
            $userId  = $this->getUserId($request);
            $groupId = (int)($args['id'] ?? 0);

            $meetings = $this->db->all(
                "SELECT m.*,
                        (SELECT COUNT(*) FROM disciples_group_attendance a WHERE a.meeting_id = m.id AND a.attended = 1) AS attended_count,
                        (SELECT COUNT(*) FROM disciples_group_members dgm WHERE dgm.group_id = m.group_id) AS total_members,
                        (SELECT COUNT(*) FROM disciples_meeting_rsvp r WHERE r.meeting_id = m.id AND r.status = 'yes') AS rsvp_yes,
                        (SELECT COUNT(*) FROM disciples_meeting_rsvp r WHERE r.meeting_id = m.id AND r.status = 'no') AS rsvp_no,
                        (SELECT COUNT(*) FROM disciples_meeting_rsvp r WHERE r.meeting_id = m.id AND r.status = 'maybe') AS rsvp_maybe,
                        (SELECT r.status FROM disciples_meeting_rsvp r WHERE r.meeting_id = m.id AND r.user_id = ?) AS my_rsvp
                 FROM disciples_group_meetings m
                 WHERE m.group_id = ?
                 ORDER BY m.meeting_date DESC",
                [$userId, $groupId]
            );

            return $this->jsonResponse(['status' => 'success', 'data' => $meetings]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // POST /disciples/groups/{id}/meetings
    public function createMeeting(Request $request, Response $response, array $args): Response
    {
        try {
            $actorId = $this->getUserId($request);
            $groupId = (int)($args['id'] ?? 0);
            if (!$this->canManageGroup($actorId, $groupId)) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $data   = $this->parseJsonBody($request);
            $errors = $this->validateRequired($data, ['title', 'meeting_date']);
            if ($errors) return $this->jsonResponse(['status' => 'error', 'message' => $errors[0]], 400);

            $meetingId = $this->db->insert('disciples_group_meetings', [
                'group_id'     => $groupId,
                'title'        => $this->sanitizeString($data['title']),
                'meeting_date' => $data['meeting_date'],
                'meeting_time' => $data['meeting_time'] ?? null,
                'location'     => isset($data['location']) ? $this->sanitizeString($data['location']) : null,
                'notes'        => isset($data['notes']) ? $this->sanitizeString($data['notes']) : null,
                'created_at'   => date('Y-m-d H:i:s'),
            ]);

            return $this->jsonResponse(['status' => 'success', 'message' => 'Meeting created', 'data' => ['id' => $meetingId]]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // POST /disciples/meetings/{id}/rsvp
    public function submitRsvp(Request $request, Response $response, array $args): Response
    {
        try {
            $userId    = $this->getUserId($request);
            $meetingId = (int)($args['id'] ?? 0);
            $data      = $this->parseJsonBody($request);
            $status    = in_array($data['status'] ?? '', ['yes', 'no', 'maybe'], true) ? $data['status'] : 'yes';

            $meeting = $this->db->first(
                "SELECT id, group_id FROM disciples_group_meetings WHERE id = ?",
                [$meetingId]
            );
            if (!$meeting) return $this->jsonResponse(['status' => 'error', 'message' => 'Meeting not found'], 404);

            if (!$this->isGroupParticipant($userId, (int)$meeting['group_id'])) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Not a member of this group'], 403);
            }

            $existing = $this->db->first(
                "SELECT id FROM disciples_meeting_rsvp WHERE meeting_id = ? AND user_id = ?",
                [$meetingId, $userId]
            );

            if ($existing) {
                $this->db->update(
                    'disciples_meeting_rsvp',
                    ['status' => $status, 'updated_at' => date('Y-m-d H:i:s')],
                    'id = ?',
                    [$existing['id']]
                );
            } else {
                $this->db->insert('disciples_meeting_rsvp', [
                    'meeting_id' => $meetingId,
                    'user_id'    => $userId,
                    'status'     => $status,
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ]);
            }

            return $this->jsonResponse(['status' => 'success', 'data' => ['status' => $status]]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // GET /disciples/meetings/{id}/rsvp
    public function getMeetingRsvps(Request $request, Response $response, array $args): Response
    {
        try {
            $userId    = $this->getUserId($request);
            $meetingId = (int)($args['id'] ?? 0);

            $meeting = $this->db->first(
                "SELECT group_id FROM disciples_group_meetings WHERE id = ?",
                [$meetingId]
            );
            if (!$meeting) return $this->jsonResponse(['status' => 'error', 'message' => 'Meeting not found'], 404);

            if (!$this->canManageGroup($userId, (int)$meeting['group_id'])) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $rsvps = $this->db->all(
                "SELECT r.status, r.updated_at,
                        u.id AS user_id, u.first_name, u.last_name, u.profile_picture
                 FROM disciples_meeting_rsvp r
                 JOIN users u ON u.id = r.user_id
                 WHERE r.meeting_id = ?
                 ORDER BY FIELD(r.status,'yes','maybe','no'), u.first_name",
                [$meetingId]
            );

            $summary = ['yes' => 0, 'no' => 0, 'maybe' => 0];
            foreach ($rsvps as $r) $summary[$r['status']]++;

            return $this->jsonResponse(['status' => 'success', 'data' => ['rsvps' => $rsvps, 'summary' => $summary]]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // GET /disciples/meetings/{id}/attendance
    public function getMeetingAttendance(Request $request, Response $response, array $args): Response
    {
        try {
            $meetingId = (int)($args['id'] ?? 0);
            $meeting   = $this->db->first(
                "SELECT m.group_id, g.leader_id FROM disciples_group_meetings m
                 JOIN disciples_groups g ON g.id = m.group_id WHERE m.id = ?",
                [$meetingId]
            );
            if (!$meeting) return $this->jsonResponse(['status' => 'error', 'message' => 'Meeting not found'], 404);

            // Union of all current group members + the leader, then left-join attendance
            $rows = $this->db->all(
                "SELECT u.id AS user_id, u.first_name, u.last_name, u.profile_picture,
                        COALESCE(a.attended, 0) AS attended
                 FROM (
                     SELECT user_id FROM disciples_group_members WHERE group_id = ?
                     UNION
                     SELECT ? AS user_id
                 ) all_members
                 JOIN users u ON u.id = all_members.user_id
                 LEFT JOIN disciples_group_attendance a ON a.meeting_id = ? AND a.user_id = u.id
                 ORDER BY u.first_name ASC",
                [(int)$meeting['group_id'], (int)$meeting['leader_id'], $meetingId]
            );
            return $this->jsonResponse(['status' => 'success', 'data' => $rows]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // POST /disciples/meetings/{id}/attendance
    public function saveAttendance(Request $request, Response $response, array $args): Response
    {
        try {
            $actorId   = $this->getUserId($request);
            $meetingId = (int)($args['id'] ?? 0);

            $meeting = $this->db->first(
                "SELECT m.group_id, g.leader_id FROM disciples_group_meetings m
                 JOIN disciples_groups g ON g.id = m.group_id WHERE m.id = ?",
                [$meetingId]
            );
            if (!$meeting) return $this->jsonResponse(['status' => 'error', 'message' => 'Meeting not found'], 404);
            if (!$this->canManageGroup($actorId, (int)$meeting['group_id'])) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $data        = $this->parseJsonBody($request);
            $attended    = array_flip(array_map('intval', (array)($data['attended'] ?? [])));

            // Resolve full roster: all current members + leader
            $allUsers = $this->db->all(
                "SELECT user_id FROM disciples_group_members WHERE group_id = ?
                 UNION SELECT ? AS user_id",
                [(int)$meeting['group_id'], (int)$meeting['leader_id']]
            );

            // Delete and re-insert so late-added members and leader are always recorded
            $this->db->query("DELETE FROM disciples_group_attendance WHERE meeting_id = ?", [$meetingId]);
            foreach ($allUsers as $u) {
                $uid = (int)$u['user_id'];
                $this->db->insert('disciples_group_attendance', [
                    'meeting_id' => $meetingId,
                    'user_id'    => $uid,
                    'attended'   => isset($attended[$uid]) ? 1 : 0,
                ]);
            }

            return $this->jsonResponse(['status' => 'success', 'message' => 'Attendance saved']);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // ── Lessons ─────────────────────────────────────────────────────────────────

    // GET /disciples/groups/{id}/lessons
    public function listLessons(Request $request, Response $response, array $args): Response
    {
        try {
            $userId  = $this->getUserId($request);
            $groupId = (int)($args['id'] ?? 0);
            $isLeader = $this->canManageGroup($userId, $groupId);

            $where   = $isLeader ? 'l.group_id = ?' : 'l.group_id = ? AND l.published = 1';
            $lessons = $this->db->all(
                "SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) AS author,
                        (SELECT r.read_at FROM disciples_lesson_reads r WHERE r.lesson_id = l.id AND r.user_id = ?) AS my_read_at,
                        (SELECT COUNT(*) FROM disciples_lesson_reads r WHERE r.lesson_id = l.id) AS read_count
                 FROM disciples_group_lessons l
                 JOIN users u ON u.id = l.created_by
                 WHERE $where
                 ORDER BY l.created_at DESC",
                [$userId, $groupId]
            );

            return $this->jsonResponse(['status' => 'success', 'data' => $lessons]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // POST /disciples/groups/{id}/lessons
    public function createLesson(Request $request, Response $response, array $args): Response
    {
        try {
            $actorId = $this->getUserId($request);
            $groupId = (int)($args['id'] ?? 0);
            if (!$this->canManageGroup($actorId, $groupId)) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $data   = $this->parseJsonBody($request);
            $errors = $this->validateRequired($data, ['title', 'content']);
            if ($errors) return $this->jsonResponse(['status' => 'error', 'message' => $errors[0]], 400);

            $id = $this->db->insert('disciples_group_lessons', [
                'group_id'   => $groupId,
                'title'      => $this->sanitizeString($data['title']),
                'content'    => $data['content'],
                'published'  => isset($data['published']) ? (int)$data['published'] : 1,
                'created_by' => $actorId,
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            return $this->jsonResponse(['status' => 'success', 'message' => 'Lesson created', 'data' => ['id' => $id]]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // PATCH /disciples/lessons/{id}
    public function updateLesson(Request $request, Response $response, array $args): Response
    {
        try {
            $actorId  = $this->getUserId($request);
            $lessonId = (int)($args['id'] ?? 0);

            $lesson = $this->db->first("SELECT group_id FROM disciples_group_lessons WHERE id = ?", [$lessonId]);
            if (!$lesson) return $this->jsonResponse(['status' => 'error', 'message' => 'Lesson not found'], 404);
            if (!$this->canManageGroup($actorId, (int)$lesson['group_id'])) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $data    = $this->parseJsonBody($request);
            $payload = [];
            if (isset($data['title']))     $payload['title']     = $this->sanitizeString($data['title']);
            if (isset($data['content']))   $payload['content']   = $data['content'];
            if (isset($data['published'])) $payload['published'] = (int)$data['published'];

            if ($payload) $this->db->update('disciples_group_lessons', $payload, 'id = ?', [$lessonId]);
            return $this->jsonResponse(['status' => 'success', 'message' => 'Lesson updated']);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // DELETE /disciples/lessons/{id}
    public function deleteLesson(Request $request, Response $response, array $args): Response
    {
        try {
            $actorId  = $this->getUserId($request);
            $lessonId = (int)($args['id'] ?? 0);

            $lesson = $this->db->first("SELECT group_id FROM disciples_group_lessons WHERE id = ?", [$lessonId]);
            if (!$lesson) return $this->jsonResponse(['status' => 'error', 'message' => 'Lesson not found'], 404);
            if (!$this->canManageGroup($actorId, (int)$lesson['group_id'])) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $this->db->query("DELETE FROM disciples_group_lessons WHERE id = ?", [$lessonId]);
            return $this->jsonResponse(['status' => 'success', 'message' => 'Lesson deleted']);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // POST /disciples/lessons/{id}/read
    public function markLessonRead(Request $request, Response $response, array $args): Response
    {
        try {
            $userId   = $this->getUserId($request);
            $lessonId = (int)($args['id'] ?? 0);

            $lesson = $this->db->first("SELECT id FROM disciples_group_lessons WHERE id = ?", [$lessonId]);
            if (!$lesson) return $this->jsonResponse(['status' => 'error', 'message' => 'Lesson not found'], 404);

            $existing = $this->db->first(
                "SELECT id FROM disciples_lesson_reads WHERE lesson_id = ? AND user_id = ?",
                [$lessonId, $userId]
            );
            if (!$existing) {
                $this->db->insert('disciples_lesson_reads', [
                    'lesson_id' => $lessonId,
                    'user_id'   => $userId,
                    'read_at'   => date('Y-m-d H:i:s'),
                ]);
            }

            return $this->jsonResponse(['status' => 'success']);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // ── Notices ─────────────────────────────────────────────────────────────────

    // GET /disciples/groups/{id}/notices
    public function listNotices(Request $request, Response $response, array $args): Response
    {
        try {
            $groupId = (int)($args['id'] ?? 0);
            $notices = $this->db->all(
                "SELECT n.*, CONCAT(u.first_name, ' ', u.last_name) AS author
                 FROM disciples_group_notices n
                 JOIN users u ON u.id = n.created_by
                 WHERE n.group_id = ?
                 ORDER BY n.created_at DESC",
                [$groupId]
            );
            return $this->jsonResponse(['status' => 'success', 'data' => $notices]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // POST /disciples/groups/{id}/notices
    public function createNotice(Request $request, Response $response, array $args): Response
    {
        try {
            $actorId = $this->getUserId($request);
            $groupId = (int)($args['id'] ?? 0);
            if (!$this->canManageGroup($actorId, $groupId)) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $data   = $this->parseJsonBody($request);
            $errors = $this->validateRequired($data, ['title', 'message']);
            if ($errors) return $this->jsonResponse(['status' => 'error', 'message' => $errors[0]], 400);

            $noticeId = $this->db->insert('disciples_group_notices', [
                'group_id'   => $groupId,
                'title'      => $this->sanitizeString($data['title']),
                'message'    => $this->sanitizeString($data['message']),
                'created_by' => $actorId,
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            $members = $this->db->all(
                "SELECT user_id FROM disciples_group_members WHERE group_id = ?",
                [$groupId]
            );
            $group = $this->db->first("SELECT name FROM disciples_groups WHERE id = ?", [$groupId]);
            foreach ($members as $m) {
                if ((int)$m['user_id'] === $actorId) continue;
                $this->db->insert('notifications', [
                    'user_id'    => (int)$m['user_id'],
                    'title'      => $data['title'],
                    'message'    => "New notice from {$group['name']}: " . $this->sanitizeString($data['message']),
                    'type'       => 'disciples_notice',
                    'created_at' => date('Y-m-d H:i:s'),
                ]);
            }

            return $this->jsonResponse(['status' => 'success', 'message' => 'Notice posted', 'data' => ['id' => $noticeId]]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // GET /disciples/enrolled-users  — returns all user_ids already in an active group
    public function getEnrolledUsers(Request $request, Response $response): Response
    {
        try {
            $rows = $this->db->all(
                "SELECT dgm.user_id, dg.id AS group_id, dg.name AS group_name
                 FROM disciples_group_members dgm
                 JOIN disciples_groups dg ON dg.id = dgm.group_id
                 WHERE dg.is_active = 1"
            );
            return $this->jsonResponse(['status' => 'success', 'data' => $rows]);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // DELETE /disciples/notices/{id}
    public function deleteNotice(Request $request, Response $response, array $args): Response
    {
        try {
            $actorId  = $this->getUserId($request);
            $noticeId = (int)($args['id'] ?? 0);

            $notice = $this->db->first("SELECT group_id FROM disciples_group_notices WHERE id = ?", [$noticeId]);
            if (!$notice) return $this->jsonResponse(['status' => 'error', 'message' => 'Notice not found'], 404);
            if (!$this->canManageGroup($actorId, (int)$notice['group_id'])) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $this->db->query("DELETE FROM disciples_group_notices WHERE id = ?", [$noticeId]);
            return $this->jsonResponse(['status' => 'success', 'message' => 'Notice deleted']);
        } catch (\Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
