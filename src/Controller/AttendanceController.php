<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use App\Database;
use Exception;
use DateTime;
use PHPMailer\PHPMailer\Exception as MailerException;
use PHPMailer\PHPMailer\PHPMailer;

class AttendanceController extends BaseController
{
    /**
     * Record Sunday check-in (for ushers)
     */
    public function recordSundayCheckin(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            if (!is_array($data)) {
                $data = [];
            }
            $userId = $this->getUserId($request);

            $actor = $this->db->first("SELECT role FROM users WHERE id = ?", [$userId]);
            if (!$actor || !in_array($actor['role'], ['usher', 'admin', 'pastor', 'superadmin'], true)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only ushers, pastors, and admins can record Sunday check-ins'
                ], 403);
            }
            
            $required = ['user_id', 'attendance_date'];
            $errors = $this->validateRequired($data, $required);
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $memberId = (int)$data['user_id'];
            $date = $data['attendance_date'];
            $isVisitor = $data['is_visitor'] ?? false;
            $notes = $data['notes'] ?? null;

            // Verify user exists
            $user = $this->db->first("SELECT * FROM users WHERE id = ?", [$memberId]);
            if (!$user) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'User not found'
                ], 404);
            }

            // Check if already checked in
            $existing = $this->db->first(
                "SELECT * FROM attendance_sunday WHERE user_id = ? AND attendance_date = ?",
                [$memberId, $date]
            );

            if ($existing) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'User already checked in for this date'
                ], 409);
            }

            // Record check-in
            $this->db->insert('attendance_sunday', [
                'user_id' => $memberId,
                'attendance_date' => $date,
                'checked_in_by' => $userId,
                'is_visitor' => $isVisitor ? 1 : 0,
                'check_in_time' => date('H:i:s'),
                'notes' => $notes
            ]);

            if ($this->isOfflineFallbackMode()) {
                $this->queueOfflineSyncOperation('attendance_sunday_checkin', [
                    'user_id' => $memberId,
                    'attendance_date' => $date,
                    'checked_in_by' => $userId,
                    'is_visitor' => $isVisitor ? 1 : 0,
                    'check_in_time' => date('H:i:s'),
                    'notes' => $notes,
                    'created_at' => date('Y-m-d H:i:s'),
                ]);
            }

            // If it's a member (not visitor), update absence flags
            if (!$isVisitor) {
                $this->updateAbsenceFlagOnAttendance($memberId, $date);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Check-in recorded successfully'
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to record check-in: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Sunday attendance records
     */
    public function getSundayAttendance(Request $request, Response $response): Response
    {
        try {
            $params = $request->getQueryParams();
            $date = $params['date'] ?? $params['attendance_date'] ?? date('Y-m-d');
            $userId = $params['user_id'] ?? null;

            $sql = "SELECT a.*, u.first_name, u.last_name, u.email, u.phone, u.role 
                    FROM attendance_sunday a 
                    JOIN users u ON a.user_id = u.id 
                    WHERE a.attendance_date = ?";
            $queryParams = [$date];

            if ($userId) {
                $sql .= " AND a.user_id = ?";
                $queryParams[] = $userId;
            }

            $sql .= " ORDER BY a.check_in_time ASC";
            
            $records = $this->db->all($sql, $queryParams);

            $visitorSql = "SELECT va.id, NULL as user_id, va.attendance_date, va.checked_in_by, 1 as is_visitor,
                                  va.check_in_time, va.notes, v.first_name, v.last_name, v.email, v.phone, 'visitor' as role
                           FROM visitor_attendance va
                           JOIN visitors v ON va.visitor_id = v.id
                           WHERE va.attendance_date = ?";
            $visitorParams = [$date];
            $visitorRecords = $this->db->all($visitorSql, $visitorParams);

            $records = array_merge($records, $visitorRecords);
            usort($records, function ($a, $b) {
                return strcmp((string)($a['check_in_time'] ?? ''), (string)($b['check_in_time'] ?? ''));
            });

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $records,
                'date' => $date,
                'total' => count($records)
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get attendance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update an existing Sunday check-in
     */
    public function updateSundayCheckin(Request $request, Response $response, array $args): Response
    {
        try {
            $id = (int)($args['id'] ?? 0);
            if (!$id) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Missing check-in id'], 400);
            }

            $actorId = $this->getUserId($request);
            $actor = $this->db->first("SELECT role FROM users WHERE id = ?", [$actorId]);
            if (!$actor || !in_array($actor['role'], ['usher', 'admin', 'pastor', 'superadmin'], true)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only ushers, pastors, and admins can edit check-ins'
                ], 403);
            }

            $existing = $this->db->first("SELECT * FROM attendance_sunday WHERE id = ?", [$id]);
            if (!$existing) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Check-in not found'], 404);
            }

            $data = json_decode($request->getBody()->getContents(), true) ?: [];
            $updates = [];

            if (!empty($data['attendance_date']) && $data['attendance_date'] !== $existing['attendance_date']) {
                // Prevent duplicates after date change
                $duplicate = $this->db->first(
                    "SELECT id FROM attendance_sunday WHERE user_id = ? AND attendance_date = ? AND id <> ?",
                    [$existing['user_id'], $data['attendance_date'], $id]
                );
                if ($duplicate) {
                    return $this->jsonResponse([
                        'status' => 'error',
                        'message' => 'User already checked in on the selected date'
                    ], 409);
                }
                $updates['attendance_date'] = $data['attendance_date'];
            }

            if (isset($data['check_in_time'])) {
                $updates['check_in_time'] = $data['check_in_time'] ?: date('H:i:s');
            }

            if (array_key_exists('notes', $data)) {
                $updates['notes'] = $data['notes'];
            }

            if (empty($updates)) {
                return $this->jsonResponse(['status' => 'success', 'message' => 'No changes to apply']);
            }

            $this->db->update('attendance_sunday', $updates, "id = ?", [$id]);

            return $this->jsonResponse(['status' => 'success', 'message' => 'Check-in updated']);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update check-in: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a Sunday check-in
     */
    public function deleteSundayCheckin(Request $request, Response $response, array $args): Response
    {
        try {
            $id = (int)($args['id'] ?? 0);
            if (!$id) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Missing check-in id'], 400);
            }

            $actorId = $this->getUserId($request);
            $actor = $this->db->first("SELECT role FROM users WHERE id = ?", [$actorId]);
            if (!$actor || !in_array($actor['role'], ['usher', 'admin', 'pastor', 'superadmin'], true)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only ushers, pastors, and admins can delete check-ins'
                ], 403);
            }

            $existing = $this->db->first("SELECT * FROM attendance_sunday WHERE id = ?", [$id]);
            if (!$existing) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Check-in not found'], 404);
            }

            $this->db->delete('attendance_sunday', "id = ?", [$id]);

            return $this->jsonResponse(['status' => 'success', 'message' => 'Check-in deleted']);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to delete check-in: ' . $e->getMessage()
            ], 500);
        }
    }


    /**
     * Record cell meeting attendance (for cell leaders)
     */
    public function recordCellAttendance(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            if (!is_array($data)) {
                $data = [];
            }
            $userId = $this->getUserId($request);
            
            $required = ['cell_id', 'meeting_date'];
            $errors = $this->validateRequired($data, $required);

            if (!array_key_exists('attendees', $data) || !is_array($data['attendees'])) {
                $errors[] = 'The attendees field must be an array';
            }
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $cellId = (int)$data['cell_id'];
            $meetingDate = $data['meeting_date'];
            $attendees = array_map('intval', $data['attendees']); // array of user_ids
            $notes = $data['notes'] ?? null;

            // Verify cell exists and user is cell leader or admin
            $cell = $this->db->first(
                "SELECT * FROM cells WHERE id = ?",
                [$cellId]
            );

            if (!$cell) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Cell not found'
                ], 404);
            }

            // Check permissions (cell leader or admin/pastor)
            $user = $this->db->first("SELECT role FROM users WHERE id = ?", [$userId]);
            $isCellLeader = $cell['cell_leader_id'] == $userId;
            $isAdmin = in_array($user['role'], ['admin', 'pastor', 'superadmin']);
            
            if (!$isCellLeader && !$isAdmin) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Only cell leader or admin can record attendance'
                ], 403);
            }

            // Record attendance for each member
            $recorded = 0;
            $recordedRows = [];
            foreach ($attendees as $memberId) {
                $memberId = (int)$memberId;
                
                // Check if member belongs to this cell (or if admin, allow any member)
                if (!$isAdmin) {
                    $member = $this->db->first(
                        "SELECT * FROM users WHERE id = ? AND cell_id = ?",
                        [$memberId, $cellId]
                    );
                    
                    if (!$member) {
                        continue; // Skip if member not in cell
                    }
                } else {
                    // Admin can record attendance for any user
                    $member = $this->db->first(
                        "SELECT * FROM users WHERE id = ?",
                        [$memberId]
                    );
                    
                    if (!$member) {
                        continue; // Skip if user doesn't exist
                    }
                }

                // Check if already recorded
                $existing = $this->db->first(
                    "SELECT * FROM attendance_cell WHERE user_id = ? AND meeting_date = ?",
                    [$memberId, $meetingDate]
                );

                if (!$existing) {
                    $row = [
                        'user_id' => $memberId,
                        'cell_id' => $cellId,
                        'meeting_date' => $meetingDate,
                        'recorded_by' => $userId,
                        'notes' => $notes
                    ];
                    $this->db->insert('attendance_cell', $row);
                    $recordedRows[] = array_merge($row, [
                        'created_at' => date('Y-m-d H:i:s'),
                    ]);
                    $recorded++;
                }
            }

            if ($this->isOfflineFallbackMode() && !empty($recordedRows)) {
                $this->queueOfflineSyncOperation('attendance_cell_batch', [
                    'rows' => $recordedRows,
                ]);
            }

            $this->syncMeetingPollAttendance($cellId, $meetingDate, $attendees, $userId);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => "Recorded attendance for $recorded members",
                'data' => [
                    'cell_id' => $cellId,
                    'meeting_date' => $meetingDate,
                    'total_recorded' => $recorded
                ]
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to record cell attendance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get cell attendance history
     */
    public function getCellAttendance(Request $request, Response $response): Response
    {
        try {
            $params = $request->getQueryParams();
            $cellId = $params['cell_id'] ?? null;
            $startDate = $params['start_date'] ?? date('Y-m-01'); // First day of current month
            $endDate = $params['end_date'] ?? date('Y-m-d');

            if (!$cellId) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'cell_id is required'
                ], 400);
            }

            $sql = "SELECT a.*, u.first_name, u.last_name 
                    FROM attendance_cell a 
                    JOIN users u ON a.user_id = u.id 
                    WHERE a.cell_id = ? AND a.meeting_date BETWEEN ? AND ?
                    ORDER BY a.meeting_date DESC, u.last_name ASC";
            
            $records = $this->db->all($sql, [$cellId, $startDate, $endDate]);

            // Group by date
            $grouped = [];
            foreach ($records as $record) {
                $date = $record['meeting_date'];
                if (!isset($grouped[$date])) {
                    $grouped[$date] = [
                        'date' => $date,
                        'attendees' => []
                    ];
                }
                $grouped[$date]['attendees'][] = [
                    'id' => $record['user_id'],
                    'name' => $record['first_name'] . ' ' . $record['last_name']
                ];
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => array_values($grouped),
                'cell_id' => (int)$cellId,
                'period' => "$startDate to $endDate"
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get cell attendance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get my attendance history (for members)
     */
    public function getMyAttendance(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $params = $request->getQueryParams();
            $startDate = $params['start_date'] ?? date('Y-m-01');
            $endDate = $params['end_date'] ?? date('Y-m-d');

            // Sunday attendance
            $sundaySql = "SELECT attendance_date, check_in_time 
                          FROM attendance_sunday 
                          WHERE user_id = ? AND attendance_date BETWEEN ? AND ?
                          ORDER BY attendance_date DESC";
            $sundayAttendance = $this->db->all($sundaySql, [$userId, $startDate, $endDate]);

            // Cell attendance
            $cellSql = "SELECT a.meeting_date, c.name as cell_name 
                        FROM attendance_cell a 
                        JOIN cells c ON a.cell_id = c.id 
                        WHERE a.user_id = ? AND a.meeting_date BETWEEN ? AND ?
                        ORDER BY a.meeting_date DESC";
            $cellAttendance = $this->db->all($cellSql, [$userId, $startDate, $endDate]);

            // Calculate stats
            $sundayCount = count($sundayAttendance);
            $cellCount = count($cellAttendance);
            $totalPossibleSundays = $this->countSundaysInRange($startDate, $endDate);
            $cellMeetingCount = $this->countCellMeetingsInRange($userId, $startDate, $endDate);

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'sunday_attendance' => $sundayAttendance,
                    'cell_attendance' => $cellAttendance,
                    'stats' => [
                        'sunday_attended' => $sundayCount,
                        'sunday_possible' => $totalPossibleSundays,
                        'cell_attended' => $cellCount,
                        'cell_possible' => $cellMeetingCount,
                        'sunday_rate' => $totalPossibleSundays > 0 ? round(($sundayCount / $totalPossibleSundays) * 100, 1) : 0,
                        'cell_rate' => $cellMeetingCount > 0 ? round(($cellCount / $cellMeetingCount) * 100, 1) : 0
                    ]
                ]
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get attendance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get attendance stats for dashboard
     */
    public function getAttendanceStats(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $user = $this->db->first("SELECT role, cell_id FROM users WHERE id = ?", [$userId]);
            
            $params = $request->getQueryParams();
            $period = $params['period'] ?? 'month'; // week, month, quarter, year
            $startDate = $params['start_date'] ?? $this->getStartDateForPeriod($period);
            $endDate = $params['end_date'] ?? date('Y-m-d');

            $stats = [];

            if (in_array($user['role'], ['admin', 'pastor', 'superadmin', 'zone_leader'])) {
                // Admin/Pastor/Zone Leader - get church-wide stats
                $stats = $this->getChurchWideStats($startDate, $endDate, $user);
            } else {
                // Member/Cell Leader - get personal stats
                $stats = $this->getPersonalStats($userId, $startDate, $endDate);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $stats,
                'period' => $period,
                'range' => "$startDate to $endDate"
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get attendance stats: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get attendance analytics for reports
     */
    public function getAnalytics(Request $request, Response $response): Response
    {
        try {
            $params = $request->getQueryParams();
            $startDate = $params['start_date'] ?? date('Y-m-01', strtotime('-6 months'));
            $endDate = $params['end_date'] ?? date('Y-m-d');

            // Weekly Sunday attendance trends
            $weeklySql = "SELECT 
                            DATE(attendance_date) as date,
                            COUNT(*) as count
                          FROM attendance_sunday 
                          WHERE attendance_date BETWEEN ? AND ?
                          GROUP BY attendance_date
                          ORDER BY attendance_date ASC";
            $weeklyData = $this->db->all($weeklySql, [$startDate, $endDate]);

            // Cell attendance by cell
            $cellSql = "SELECT 
                            c.name as cell_name,
                            COUNT(*) as total_attendance
                         FROM attendance_cell a
                         JOIN cells c ON a.cell_id = c.id
                         WHERE a.meeting_date BETWEEN ? AND ?
                         GROUP BY a.cell_id
                         ORDER BY total_attendance DESC";
            $cellData = $this->db->all($cellSql, [$startDate, $endDate]);

            // Top attending members
            $topMembersSql = "SELECT 
                                u.id,
                                u.first_name,
                                u.last_name,
                                COUNT(DISTINCT a_s.id) as sunday_count,
                                COUNT(DISTINCT a_c.id) as cell_count,
                                COUNT(DISTINCT a_s.id) + COUNT(DISTINCT a_c.id) as total_score
                              FROM users u
                              LEFT JOIN attendance_sunday a_s ON u.id = a_s.user_id AND a_s.attendance_date BETWEEN ? AND ?
                              LEFT JOIN attendance_cell a_c ON u.id = a_c.user_id AND a_c.meeting_date BETWEEN ? AND ?
                              WHERE u.role IN ('member', 'cell_leader')
                              GROUP BY u.id
                              ORDER BY total_score DESC
                              LIMIT 10";
            $topMembers = $this->db->all($topMembersSql, [$startDate, $endDate, $startDate, $endDate]);

            // Members with poor attendance (missed 2+ Sundays in last month)
            $monthStart = date('Y-m-01');
            $poorAttendanceSql = "SELECT 
                                    u.id,
                                    u.first_name,
                                    u.last_name,
                                    u.email,
                                    c.name as cell_name,
                                    COUNT(a_s.id) as attended_sundays,
                                    (SELECT COUNT(*) FROM (
                                        SELECT DATE(attendance_date) as d 
                                        FROM attendance_sunday 
                                        WHERE attendance_date BETWEEN ? AND ?
                                        GROUP BY attendance_date
                                    ) as all_sundays) as total_sundays
                                  FROM users u
                                  LEFT JOIN attendance_sunday a_s ON u.id = a_s.user_id AND a_s.attendance_date BETWEEN ? AND ?
                                  LEFT JOIN cells c ON u.cell_id = c.id
                                  WHERE u.role IN ('member', 'cell_leader')
                                  GROUP BY u.id
                                  HAVING attended_sundays < 2
                                  ORDER BY attended_sundays ASC";
            $poorAttendance = $this->db->all($poorAttendanceSql, [$monthStart, $endDate, $monthStart, $endDate]);

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'weekly_trends' => $weeklyData,
                    'by_cell' => $cellData,
                    'top_attendees' => $topMembers,
                    'poor_attendance' => $poorAttendance,
                    'summary' => [
                        'total_sunday_checkins' => array_sum(array_column($weeklyData, 'count')),
                        'avg_weekly_attendance' => count($weeklyData) > 0 ? round(array_sum(array_column($weeklyData, 'count')) / count($weeklyData), 1) : 0,
                        'cells_with_data' => count($cellData)
                    ]
                ]
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get analytics: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getMyMeetingPolls(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $user = $this->db->first("SELECT id, role, cell_id, zone_id, first_name, last_name, email FROM users WHERE id = ?", [$userId]);

            if (!$user) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'User not found'], 404);
            }

            $records = [];

            if (!empty($user['cell_id'])) {
                $records = array_merge($records, $this->db->all(
                    "SELECT p.*,
                            r.response_status,
                            r.excuse_text,
                            r.responded_at,
                            r.attendance_status,
                            c.name as cell_name
                     FROM meeting_polls p
                     LEFT JOIN meeting_poll_responses r ON r.poll_id = p.id AND r.user_id = ?
                     LEFT JOIN cells c ON p.audience_type = 'cell' AND p.audience_id = c.id
                     WHERE p.audience_type = 'cell' AND p.audience_id = ?
                     ORDER BY p.meeting_date DESC, p.meeting_time ASC",
                    [$userId, (int)$user['cell_id']]
                ));
            }

            if (!empty($user['zone_id'])) {
                $records = array_merge($records, $this->db->all(
                    "SELECT p.*,
                            r.response_status,
                            r.excuse_text,
                            r.responded_at,
                            r.attendance_status,
                            z.name as zone_name
                     FROM meeting_polls p
                     LEFT JOIN meeting_poll_responses r ON r.poll_id = p.id AND r.user_id = ?
                     LEFT JOIN zones z ON p.audience_type = 'zone' AND p.audience_id = z.id
                     WHERE p.audience_type = 'zone' AND p.audience_id = ?
                     ORDER BY p.meeting_date DESC, p.meeting_time ASC",
                    [$userId, (int)$user['zone_id']]
                ));
            }

            usort($records, function (array $left, array $right): int {
                $leftKey = ($left['meeting_date'] ?? '') . ' ' . ($left['meeting_time'] ?? '');
                $rightKey = ($right['meeting_date'] ?? '') . ' ' . ($right['meeting_time'] ?? '');
                return strcmp($rightKey, $leftKey);
            });

            foreach ($records as &$record) {
                if (($record['audience_type'] ?? '') === 'zone' && empty($record['cell_name'])) {
                    $record['cell_name'] = $record['zone_name'] ?? 'Zone meeting';
                }
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $records
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => 'Failed to load meeting polls: ' . $e->getMessage()], 500);
        }
    }

    public function respondToMeetingPoll(Request $request, Response $response, array $args): Response
    {
        try {
            $pollId = (int)($args['id'] ?? 0);
            $userId = $this->getUserId($request);
            $data = json_decode($request->getBody()->getContents(), true) ?: [];
            $responseStatus = $data['response_status'] ?? 'no_response';
            $allowedStatuses = ['going', 'not_going', 'no_response'];

            if (!in_array($responseStatus, $allowedStatuses, true)) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Invalid response status'], 422);
            }

            $poll = $this->db->first("SELECT * FROM meeting_polls WHERE id = ?", [$pollId]);
            if (!$poll) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Meeting poll not found'], 404);
            }

            $membership = $poll['audience_type'] === 'cell'
                ? $this->db->first("SELECT id FROM users WHERE id = ? AND cell_id = ?", [$userId, (int)$poll['audience_id']])
                : $this->db->first("SELECT id FROM users WHERE id = ? AND zone_id = ?", [$userId, (int)$poll['audience_id']]);

            if (!$membership) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'You are not part of this meeting audience'], 403);
            }

            $existing = $this->db->first("SELECT id FROM meeting_poll_responses WHERE poll_id = ? AND user_id = ?", [$pollId, $userId]);
            $payload = [
                'response_status' => $responseStatus,
                'excuse_text' => $responseStatus === 'not_going' ? ($data['excuse_text'] ?? null) : null,
                'responded_at' => date('Y-m-d H:i:s'),
            ];

            if ($existing) {
                $this->db->update('meeting_poll_responses', $payload, 'id = ?', [(int)$existing['id']]);
            } else {
                $this->db->insert('meeting_poll_responses', array_merge($payload, [
                    'poll_id' => $pollId,
                    'user_id' => $userId,
                ]));
            }

            return $this->jsonResponse(['status' => 'success', 'message' => 'Meeting response saved']);
        } catch (Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => 'Failed to save meeting response: ' . $e->getMessage()], 500);
        }
    }

    public function getMeetingPoll(Request $request, Response $response, array $args): Response
    {
        try {
            $pollId = (int)($args['id'] ?? 0);
            $userId = $this->getUserId($request);
            $viewer = $this->db->first("SELECT id, role, cell_id, zone_id FROM users WHERE id = ?", [$userId]);

            $poll = $this->db->first("SELECT * FROM meeting_polls WHERE id = ?", [$pollId]);
            if (!$poll) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Meeting poll not found'], 404);
            }

            $allowed = in_array($viewer['role'] ?? '', ['admin', 'pastor', 'superadmin'], true)
                || ($poll['audience_type'] === 'cell' && (int)($viewer['cell_id'] ?? 0) === (int)$poll['audience_id'])
                || ($poll['audience_type'] === 'zone' && (int)($viewer['zone_id'] ?? 0) === (int)$poll['audience_id']);

            if (!$allowed) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $audienceUsers = $poll['audience_type'] === 'cell'
                ? $this->db->all(
                    "SELECT u.id, u.first_name, u.last_name, u.email, r.response_status, r.excuse_text, r.responded_at, r.attendance_status
                     FROM users u
                     LEFT JOIN meeting_poll_responses r ON r.user_id = u.id AND r.poll_id = ?
                     WHERE u.cell_id = ? AND u.is_active = 1
                     ORDER BY u.last_name ASC, u.first_name ASC",
                    [$pollId, (int)$poll['audience_id']]
                )
                : $this->db->all(
                    "SELECT u.id, u.first_name, u.last_name, u.email, r.response_status, r.excuse_text, r.responded_at, r.attendance_status
                     FROM users u
                     LEFT JOIN meeting_poll_responses r ON r.user_id = u.id AND r.poll_id = ?
                     WHERE u.zone_id = ? AND u.is_active = 1
                     ORDER BY u.last_name ASC, u.first_name ASC",
                    [$pollId, (int)$poll['audience_id']]
                );

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'poll' => $poll,
                    'responses' => $audienceUsers
                ]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => 'Failed to load meeting poll: ' . $e->getMessage()], 500);
        }
    }

    public function confirmMeetingPollAttendance(Request $request, Response $response, array $args): Response
    {
        try {
            $pollId = (int)($args['id'] ?? 0);
            $userId = $this->getUserId($request);
            $viewer = $this->db->first("SELECT id, role, cell_id, zone_id FROM users WHERE id = ?", [$userId]);
            $poll = $this->db->first("SELECT * FROM meeting_polls WHERE id = ?", [$pollId]);
            $data = json_decode($request->getBody()->getContents(), true) ?: [];

            if (!$poll) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Meeting poll not found'], 404);
            }

            $allowed = in_array($viewer['role'] ?? '', ['admin', 'pastor', 'superadmin'], true)
                || ($poll['audience_type'] === 'cell' && (int)($viewer['cell_id'] ?? 0) === (int)$poll['audience_id'])
                || ($poll['audience_type'] === 'zone' && (int)($viewer['zone_id'] ?? 0) === (int)$poll['audience_id']);

            if (!$allowed) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }

            $attendees = is_array($data['attendees'] ?? null) ? array_map('intval', $data['attendees']) : [];
            $excused = is_array($data['excused'] ?? null) ? array_map('intval', $data['excused']) : [];
            $audienceUsers = $poll['audience_type'] === 'cell'
                ? $this->db->all("SELECT id FROM users WHERE cell_id = ? AND is_active = 1", [(int)$poll['audience_id']])
                : $this->db->all("SELECT id FROM users WHERE zone_id = ? AND is_active = 1", [(int)$poll['audience_id']]);

            foreach ($audienceUsers as $member) {
                $memberId = (int)$member['id'];
                $attendanceStatus = in_array($memberId, $attendees, true)
                    ? 'confirmed'
                    : (in_array($memberId, $excused, true) ? 'excused' : 'absent');

                $existing = $this->db->first("SELECT id FROM meeting_poll_responses WHERE poll_id = ? AND user_id = ?", [$pollId, $memberId]);
                $payload = [
                    'attendance_status' => $attendanceStatus,
                    'confirmed_by' => $userId,
                    'confirmed_at' => date('Y-m-d H:i:s'),
                ];

                if ($existing) {
                    $this->db->update('meeting_poll_responses', $payload, 'id = ?', [(int)$existing['id']]);
                } else {
                    $this->db->insert('meeting_poll_responses', array_merge($payload, [
                        'poll_id' => $pollId,
                        'user_id' => $memberId,
                    ]));
                }

                if ($attendanceStatus === 'confirmed' && $poll['audience_type'] === 'cell') {
                    $existingAttendance = $this->db->first(
                        "SELECT id FROM attendance_cell WHERE user_id = ? AND meeting_date = ?",
                        [$memberId, $poll['meeting_date']]
                    );

                    if (!$existingAttendance) {
                        $this->db->insert('attendance_cell', [
                            'user_id' => $memberId,
                            'cell_id' => (int)$poll['audience_id'],
                            'meeting_date' => $poll['meeting_date'],
                            'recorded_by' => $userId,
                            'notes' => $data['notes'] ?? null,
                        ]);
                    }
                }
            }

            $this->db->update('meeting_polls', [
                'status' => 'completed',
                'completed_at' => date('Y-m-d H:i:s'),
            ], 'id = ?', [$pollId]);

            return $this->jsonResponse(['status' => 'success', 'message' => 'Meeting attendance confirmed']);
        } catch (Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => 'Failed to confirm attendance: ' . $e->getMessage()], 500);
        }
    }

    public function generateMeetingPolls(Request $request, Response $response): Response
    {
        try {
            // Allow either a valid admin JWT or the shared cron secret header
            $cronSecret = getenv('CRON_SECRET');
            $requestSecret = $request->getHeaderLine('X-Cron-Secret');
            $isCronCall = !empty($cronSecret) && !empty($requestSecret) && hash_equals($cronSecret, $requestSecret);

            if ($isCronCall) {
                $adminRow = $this->db->first(
                    "SELECT id FROM users WHERE role IN ('superadmin','admin') AND is_active = 1 ORDER BY id ASC LIMIT 1"
                );
                $userId = $adminRow ? (int)$adminRow['id'] : 1;
            } else {
                $userId = $this->getUserId($request);
                $actor = $this->db->first("SELECT role FROM users WHERE id = ?", [$userId]);
                if (!$actor || !in_array($actor['role'], ['admin', 'pastor', 'superadmin'], true)) {
                    return $this->jsonResponse(['status' => 'error', 'message' => 'Unauthorized'], 403);
                }
            }

            $targetDate = date('Y-m-d', strtotime('+1 day'));
            $targetDay = strtolower(date('l', strtotime($targetDate)));
            $cells = $this->db->all(
                "SELECT c.id, c.name, c.meeting_day, c.meeting_time, c.meeting_location, c.cell_leader_id
                 FROM cells c 
                 WHERE c.is_active = 1 AND c.meeting_day = ?",
                [$targetDay]
            );

            $created = 0;
            $emailed = 0;
            $errors = [];
            
            foreach ($cells as $cell) {
                $existingPoll = $this->db->first(
                    "SELECT id FROM meeting_polls WHERE audience_type = 'cell' AND audience_id = ? AND meeting_date = ?",
                    [(int)$cell['id'], $targetDate]
                );

                if ($existingPoll) {
                    continue;
                }

                $pollId = $this->db->insert('meeting_polls', [
                    'audience_type' => 'cell',
                    'audience_id' => (int)$cell['id'],
                    'title' => $cell['name'] . ' Weekly Cell Meeting',
                    'description' => 'Please confirm whether you will attend this cell meeting.',
                    'meeting_date' => $targetDate,
                    'meeting_time' => $cell['meeting_time'] ?? null,
                    'meeting_location' => $cell['meeting_location'] ?? null,
                    'status' => 'open',
                    'created_by' => $userId,
                ]);

                // Get members in this cell
                $members = $this->db->all(
                    "SELECT id, first_name, last_name, email FROM users WHERE cell_id = ? AND is_active = 1",
                    [(int)$cell['id']]
                );
                
                // Get cell leader name for email attribution
                $leaderName = 'Your Cell Leader';
                if ($cell['cell_leader_id']) {
                    $leader = $this->db->first(
                        "SELECT first_name, last_name FROM users WHERE id = ?",
                        [(int)$cell['cell_leader_id']]
                    );
                    if ($leader) {
                        $leaderName = trim(($leader['first_name'] ?? '') . ' ' . ($leader['last_name'] ?? ''));
                    }
                }
                
                foreach ($members as $member) {
                    // Skip if this is the sender
                    if ((int)$member['id'] === (int)$cell['cell_leader_id']) {
                        continue;
                    }
                    
                    $this->db->insert('meeting_poll_responses', [
                        'poll_id' => $pollId,
                        'user_id' => (int)$member['id'],
                    ]);

                    $this->db->insert('notifications', [
                        'user_id' => (int)$member['id'],
                        'title' => 'Cell meeting RSVP',
                        'message' => sprintf('%s is requesting you to confirm your attendance for the %s meeting on %s.', $leaderName, $cell['name'], $targetDate),
                        'type' => 'meeting_poll',
                        'poll_id' => $pollId,
                        'created_at' => date('Y-m-d H:i:s'),
                    ]);

                    // Send email with leader attribution
                    try {
                        $this->sendMeetingPollEmailWithService(
                            $member,
                            $cell,
                            $targetDate,
                            $leaderName
                        );
                        $emailed++;
                    } catch (Exception $e) {
                        $errors[] = "Failed to email " . $member['email'] . ": " . $e->getMessage();
                    }
                }

                $created++;
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Meeting poll generation completed',
                'data' => [
                    'created' => $created,
                    'emailed' => $emailed,
                    'errors' => count($errors) > 0 ? $errors : null,
                    'target_date' => $targetDate
                ]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => 'Failed to generate meeting polls: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Helper: Update absence flag when member attends
     */
    private function updateAbsenceFlagOnAttendance(int $userId, string $date): void
    {
        // Check if there's an active absence flag
        $flag = $this->db->first(
            "SELECT * FROM absence_flags WHERE user_id = ? AND resolved_at IS NULL",
            [$userId]
        );

        if ($flag) {
            // Resolve the flag
            $this->db->query(
                "UPDATE absence_flags SET resolved_at = datetime('now') WHERE id = ?",
                [$flag['id']]
            );
        }
    }

    private function syncMeetingPollAttendance(int $cellId, string $meetingDate, array $attendees, int $confirmedBy): void
    {
        $poll = $this->db->first(
            "SELECT * FROM meeting_polls WHERE audience_type = 'cell' AND audience_id = ? AND meeting_date = ? ORDER BY id DESC LIMIT 1",
            [$cellId, $meetingDate]
        );

        if (!$poll) {
            return;
        }

        $members = $this->db->all("SELECT id FROM users WHERE cell_id = ? AND is_active = 1", [$cellId]);
        foreach ($members as $member) {
            $memberId = (int)$member['id'];
            $status = in_array($memberId, $attendees, true) ? 'confirmed' : 'absent';
            $existing = $this->db->first("SELECT id FROM meeting_poll_responses WHERE poll_id = ? AND user_id = ?", [(int)$poll['id'], $memberId]);

            $payload = [
                'attendance_status' => $status,
                'confirmed_by' => $confirmedBy,
                'confirmed_at' => date('Y-m-d H:i:s'),
            ];

            if ($existing) {
                $this->db->update('meeting_poll_responses', $payload, 'id = ?', [(int)$existing['id']]);
            } else {
                $this->db->insert('meeting_poll_responses', array_merge($payload, [
                    'poll_id' => (int)$poll['id'],
                    'user_id' => $memberId,
                ]));
            }
        }

        $this->db->update('meeting_polls', [
            'status' => 'completed',
            'completed_at' => date('Y-m-d H:i:s'),
        ], 'id = ?', [(int)$poll['id']]);
    }

    private function sendMeetingPollEmail(array $member, array $cell, string $meetingDate): void
    {
        if (empty($member['email'])) {
            return;
        }

        $firstName   = trim($member['first_name'] ?? '');
        $fullName    = trim($firstName . ' ' . ($member['last_name'] ?? ''));
        $cellName    = $cell['name'] ?? 'cell';
        $meetingTime = $cell['meeting_time'] ?? 'the scheduled time';

        try {
            $mail = new PHPMailer(true);
            $mail->isMail();
            $mail->setFrom(getenv('MAIL_FROM_ADDRESS') ?: 'noreply@elchurch.site', getenv('MAIL_FROM_NAME') ?: 'Eternal Love Church');
            $mail->addAddress($member['email'], $fullName);
            $mail->isHTML(true);
            $mail->Subject = 'Cell meeting reminder and RSVP';
            $mail->Body = sprintf(
                '<p>Hello %s,</p><p>Your %s meeting is scheduled for <strong>%s</strong> at <strong>%s</strong>.</p><p>Please log in and confirm whether you are going so your leader can prepare well.</p>',
                htmlspecialchars($fullName, ENT_QUOTES, 'UTF-8'),
                htmlspecialchars($cellName, ENT_QUOTES, 'UTF-8'),
                htmlspecialchars($meetingDate, ENT_QUOTES, 'UTF-8'),
                htmlspecialchars($meetingTime, ENT_QUOTES, 'UTF-8')
            );
            $mail->AltBody = sprintf(
                'Hello %s, your %s meeting is scheduled for %s at %s. Please log in and confirm whether you are going.',
                $fullName, $cellName, $meetingDate, $meetingTime
            );
            $mail->send();
        } catch (MailerException $e) {
            error_log('Meeting poll email failed: ' . $e->getMessage());
        }

        // SMS reminder
        if (!empty($member['phone'])) {
            try {
                $smsBody = "Hi $firstName, reminder: your $cellName meeting is on $meetingDate at $meetingTime. Log in to confirm: elchurch.site";
                (new \App\Services\WhatsAppService())->send([['phone' => $member['phone']]], $smsBody);
            } catch (Exception $smsErr) {
                error_log('Meeting reminder WhatsApp failed: ' . $smsErr->getMessage());
            }
        }
    }

    /**
     * Send meeting poll email using MailService with leader attribution
     */
    private function sendMeetingPollEmailWithService(
        array $member,
        array $cell,
        string $meetingDate,
        string $leaderName = 'Your Cell Leader'
    ): void {
        if (empty($member['email'])) {
            return;
        }

        try {
            $mailService = new \App\Services\MailService();
            
            $recipients = [[
                'email' => $member['email'],
                'name' => trim(($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? ''))
            ]];
            
            $meetingTime = $cell['meeting_time'] ?? 'the scheduled time';
            $meetingLocation = $cell['meeting_location'] ?? 'TBD';
            $pollLink = getenv('FRONTEND_URL') ?: (defined('APP_URL') ? APP_URL : 'https://elchurch.site');
            $pollLink .= '/member/polls';
            
            $mailService->sendPollEmail(
                $recipients,
                $cell['name'] . ' Weekly Meeting',
                'Your ' . $leaderName . ' is requesting you to confirm your attendance',
                $meetingDate,
                $meetingTime,
                $meetingLocation,
                $pollLink,
                $leaderName
            );
        } catch (Exception $e) {
            error_log('Failed to send poll email via MailService: ' . $e->getMessage());
            throw $e;
        }

        // SMS reminder
        if (!empty($member['phone'])) {
            try {
                $firstName   = trim($member['first_name'] ?? '');
                $cellName    = $cell['name'] ?? 'cell';
                $meetingTime = $cell['meeting_time'] ?? 'the scheduled time';
                $smsBody = "Hi $firstName, reminder: your $cellName meeting is on $meetingDate at $meetingTime. Log in to confirm: elchurch.site";
                (new \App\Services\WhatsAppService())->send([['phone' => $member['phone']]], $smsBody);
            } catch (Exception $smsErr) {
                error_log('Meeting reminder WhatsApp (service) failed: ' . $smsErr->getMessage());
            }
        }
    }

    /**
     * Helper: Count Sundays in date range
     */
    private function countSundaysInRange(string $start, string $end): int
    {
        $startDate = new DateTime($start);
        $endDate = new DateTime($end);
        $sundayCount = 0;
        
        while ($startDate <= $endDate) {
            if ($startDate->format('w') == 0) { // 0 = Sunday
                $sundayCount++;
            }
            $startDate->modify('+1 day');
        }
        
        return $sundayCount;
    }

    /**
     * Helper: Count cell meetings in range (based on cell's meeting day)
     */
    private function countCellMeetingsInRange(int $userId, string $start, string $end): int
    {
        $cell = $this->db->first(
            "SELECT meeting_day FROM cells WHERE id = (SELECT cell_id FROM users WHERE id = ?)",
            [$userId]
        );
        
        if (!$cell) {
            return 0;
        }
        
        $startDate = new DateTime($start);
        $endDate = new DateTime($end);
        $meetingCount = 0;
        $dayMap = [
            'monday' => 1, 'tuesday' => 2, 'wednesday' => 3,
            'thursday' => 4, 'friday' => 5, 'saturday' => 6
        ];
        $targetDay = $dayMap[$cell['meeting_day']] ?? 1;
        
        while ($startDate <= $endDate) {
            if ($startDate->format('w') == $targetDay) {
                $meetingCount++;
            }
            $startDate->modify('+1 day');
        }
        
        return $meetingCount;
    }

    /**
     * Helper: Get start date for period
     */
    private function getStartDateForPeriod(string $period): string
    {
        $now = new DateTime();
        
        switch ($period) {
            case 'week':
                $now->modify('-1 week');
                break;
            case 'month':
                $now->modify('-1 month');
                break;
            case 'quarter':
                $now->modify('-3 months');
                break;
            case 'year':
                $now->modify('-1 year');
                break;
        }
        
        return $now->format('Y-m-01');
    }

    /**
     * Helper: Get church-wide stats for admin/pastor
     */
    private function getChurchWideStats(string $start, string $end, array $user): array
    {
        // Total active members
        $totalMembers = $this->db->first(
            "SELECT COUNT(*) as count FROM users WHERE is_active = 1 AND role IN ('member', 'cell_leader')"
        )['count'] ?? 0;

        // Total cells
        $totalCells = $this->db->first(
            "SELECT COUNT(*) as count FROM cells WHERE is_active = 1"
        )['count'] ?? 0;

        // Sunday attendance average
        $sundayAvg = $this->db->first(
            "SELECT AVG(daily_count) as avg_attendance FROM (
                SELECT COUNT(*) as daily_count 
                FROM attendance_sunday 
                WHERE attendance_date BETWEEN ? AND ?
                GROUP BY attendance_date
            ) as daily",
            [$start, $end]
        )['avg_attendance'] ?? 0;

        // Total check-ins in period
        $totalCheckins = $this->db->first(
            "SELECT COUNT(*) as count FROM attendance_sunday WHERE attendance_date BETWEEN ? AND ?",
            [$start, $end]
        )['count'] ?? 0;

        // Absence flags
        $absenceFlags = $this->db->first(
            "SELECT COUNT(*) as count FROM absence_flags WHERE resolved_at IS NULL"
        )['count'] ?? 0;

        // Zone stats if zone leader
        $zoneStats = null;
        if ($user['role'] === 'zone_leader' && $user['zone_id']) {
            $zoneMembers = $this->db->first(
                "SELECT COUNT(*) as count FROM users WHERE zone_id = ? AND is_active = 1",
                [$user['zone_id']]
            )['count'] ?? 0;
            $zoneStats = [
                'zone_id' => $user['zone_id'],
                'total_members' => $zoneMembers
            ];
        }

        return [
            'total_members' => $totalMembers,
            'total_cells' => $totalCells,
            'avg_sunday_attendance' => round($sundayAvg, 1),
            'total_checkins' => $totalCheckins,
            'absence_flags' => $absenceFlags,
            'zone_info' => $zoneStats
        ];
    }

    /**
     * Helper: Get personal stats for member
     */
    private function getPersonalStats(int $userId, string $start, string $end): array
    {
        // Sunday attendance count
        $sundayCount = $this->db->first(
            "SELECT COUNT(*) as count FROM attendance_sunday WHERE user_id = ? AND attendance_date BETWEEN ? AND ?",
            [$userId, $start, $end]
        )['count'] ?? 0;

        // Cell attendance count
        $cellCount = $this->db->first(
            "SELECT COUNT(*) as count FROM attendance_cell WHERE user_id = ? AND meeting_date BETWEEN ? AND ?",
            [$userId, $start, $end]
        )['count'] ?? 0;

        // Total possible Sundays
        $totalSundays = $this->countSundaysInRange($start, $end);

        // Get cell info
        $cell = $this->db->first(
            "SELECT c.name, c.meeting_day, c.meeting_time 
             FROM cells c JOIN users u ON u.cell_id = c.id 
             WHERE u.id = ?",
            [$userId]
        );

        return [
            'sunday_attendance_count' => $sundayCount,
            'cell_attendance_count' => $cellCount,
            'total_possible_sundays' => $totalSundays,
            'cell_info' => $cell,
            'sunday_rate' => $totalSundays > 0 ? round(($sundayCount / $totalSundays) * 100, 1) : 0
        ];
    }
}
