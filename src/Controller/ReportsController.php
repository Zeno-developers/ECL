<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use DateTime;

use App\Database;
use App\Services\PastoralReportService;
use Exception;

class ReportsController extends BaseController
{
    private function buildPeriodExpression(string $column, string $groupBy = 'month'): string
    {
        $isMySql = $this->db->getDriver() === 'mysql';

        if ($isMySql) {
            return match ($groupBy) {
                'week' => "DATE_FORMAT($column, '%x-W%v')",
                'quarter' => "CONCAT(YEAR($column), '-Q', QUARTER($column))",
                default => "DATE_FORMAT($column, '%Y-%m')",
            };
        }

        return match ($groupBy) {
            'week' => "strftime('%Y-W%W', $column)",
            'quarter' => "printf('%s-Q%d', strftime('%Y', $column), ((cast(strftime('%m', $column) as integer) - 1) / 3) + 1)",
            default => "strftime('%Y-%m', $column)",
        };
    }

    /**
     * Get comprehensive dashboard data based on user role
     */
    public function getDashboard(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $user = $this->db->first("SELECT role, zone_id, cell_id FROM users WHERE id = ?", [$userId]);
            
            $params = $request->getQueryParams();
            $period = $params['period'] ?? 'month';
            $startDate = $params['start_date'] ?? $this->getStartDateForPeriod($period);
            $endDate = $params['end_date'] ?? date('Y-m-d');

            $dashboardData = [];

            if (in_array($user['role'], ['admin', 'pastor', 'superadmin'])) {
                // Full church dashboard
                $dashboardData = $this->getAdminDashboard($startDate, $endDate);
            } elseif ($user['role'] === 'zone_leader') {
                // Zone leader dashboard - must have zone_id assigned
                if (!$user['zone_id']) {
                    return $this->jsonResponse([
                        'status' => 'error',
                        'message' => 'You are not assigned to a zone yet. Please contact an administrator.',
                        'data' => [
                            'assignment_status' => 'not_assigned',
                            'role' => 'zone_leader'
                        ]
                    ], 403);
                }
                $dashboardData = $this->getZoneLeaderDashboard((int)$user['zone_id'], $startDate, $endDate);
            } elseif ($user['role'] === 'cell_leader') {
                // Cell leader dashboard - must have cell_id assigned
                if (!$user['cell_id']) {
                    return $this->jsonResponse([
                        'status' => 'error',
                        'message' => 'You are not assigned to a cell yet. Please contact an administrator.',
                        'data' => [
                            'assignment_status' => 'not_assigned',
                            'role' => 'cell_leader'
                        ]
                    ], 403);
                }
                $dashboardData = $this->getCellLeaderDashboard((int)$user['cell_id'], $startDate, $endDate);
            } else {
                // Member dashboard
                $dashboardData = $this->getMemberDashboard($userId, $startDate, $endDate);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $dashboardData,
                'period' => $period,
                'range' => "$startDate to $endDate"
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get dashboard data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get growth metrics (membership, attendance trends)
     */
    public function getGrowth(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $user = $this->db->first("SELECT role, zone_id, cell_id FROM users WHERE id = ?", [$userId]);
            $params = $request->getQueryParams();
            $startDate = $params['start_date'] ?? date('Y-m-01', strtotime('-12 months'));
            $endDate = $params['end_date'] ?? date('Y-m-d');
            $groupBy = $params['group_by'] ?? 'month'; // month, week, quarter
            $periodExpressionUsers = $this->buildPeriodExpression('created_at', $groupBy);
            $periodExpressionSunday = $this->buildPeriodExpression('attendance_date', $groupBy);
            $periodExpressionCell = $this->buildPeriodExpression('meeting_date', $groupBy);
            $periodExpressionEngagement = $this->buildPeriodExpression('month_year', $groupBy);
            $periodExpressionCellsCreated = $this->buildPeriodExpression('created_at', $groupBy);
            $periodExpressionActivities = $this->buildPeriodExpression('created_at', $groupBy);

            // Build scope filter for limited roles
            $scopeFilter = '';
            if ($user['role'] === 'zone_leader' && $user['zone_id']) {
                $scopeFilter = "AND zone_id = {$user['zone_id']}";
            } elseif ($user['role'] === 'cell_leader' && $user['cell_id']) {
                $scopeFilter = "AND cell_id = {$user['cell_id']}";
            }

            // Membership growth
            $membershipSql = "SELECT 
                                {$periodExpressionUsers} as period,
                                COUNT(*) as new_members
                              FROM users
                              WHERE created_at BETWEEN ? AND ? AND is_active = 1 $scopeFilter
                              GROUP BY {$periodExpressionUsers}
                              ORDER BY period ASC";
            
            $membershipGrowth = $this->db->all($membershipSql, [$startDate, $endDate]);
            $cumulativeMembers = 0;
            foreach ($membershipGrowth as &$membershipRow) {
                $cumulativeMembers += (int)($membershipRow['new_members'] ?? 0);
                $membershipRow['cumulative'] = $cumulativeMembers;
            }
            unset($membershipRow);

            // Attendance trends - filter based on role
            $attendanceUserJoin = '';
            $attendanceWhere = "WHERE attendance_date BETWEEN ? AND ?";
            $attendanceParams = [$startDate, $endDate];
            
            if ($user['role'] === 'zone_leader' && $user['zone_id']) {
                $attendanceUserJoin = "INNER JOIN users u ON attendance_sunday.user_id = u.id";
                $attendanceWhere = "WHERE attendance_sunday.attendance_date BETWEEN ? AND ? AND u.zone_id = ?";
                $attendanceParams = [$startDate, $endDate, $user['zone_id']];
            } elseif ($user['role'] === 'cell_leader' && $user['cell_id']) {
                $attendanceUserJoin = "INNER JOIN users u ON attendance_sunday.user_id = u.id";
                $attendanceWhere = "WHERE attendance_sunday.attendance_date BETWEEN ? AND ? AND u.cell_id = ?";
                $attendanceParams = [$startDate, $endDate, $user['cell_id']];
            }
            
            $attendanceSql = "SELECT 
                                {$periodExpressionSunday} as period,
                                COUNT(*) as total_attendance,
                                COUNT(DISTINCT attendance_sunday.user_id) as unique_attendees
                              FROM attendance_sunday
                              $attendanceUserJoin
                              $attendanceWhere
                              GROUP BY {$periodExpressionSunday}
                              ORDER BY period ASC";
            
            $attendanceTrends = $this->db->all($attendanceSql, $attendanceParams);

            // Cell meeting trends
            $cellUserJoin = '';
            $cellWhere = "WHERE meeting_date BETWEEN ? AND ?";
            $cellParams = [$startDate, $endDate];
            
            if ($user['role'] === 'zone_leader' && $user['zone_id']) {
                $cellUserJoin = "INNER JOIN users u ON attendance_cell.user_id = u.id";
                $cellWhere = "WHERE attendance_cell.meeting_date BETWEEN ? AND ? AND u.zone_id = ?";
                $cellParams = [$startDate, $endDate, $user['zone_id']];
            } elseif ($user['role'] === 'cell_leader' && $user['cell_id']) {
                $cellUserJoin = "INNER JOIN users u ON attendance_cell.user_id = u.id";
                $cellWhere = "WHERE attendance_cell.meeting_date BETWEEN ? AND ? AND u.cell_id = ?";
                $cellParams = [$startDate, $endDate, $user['cell_id']];
            }
            
            $cellSql = "SELECT 
                           {$periodExpressionCell} as period,
                           COUNT(*) as total_attendance,
                           COUNT(DISTINCT attendance_cell.user_id) as unique_attendees,
                           COUNT(DISTINCT attendance_cell.cell_id) as cells_active
                         FROM attendance_cell
                         $cellUserJoin
                         $cellWhere
                         GROUP BY {$periodExpressionCell}
                         ORDER BY period ASC";
            
            $cellTrends = $this->db->all($cellSql, $cellParams);

            // Engagement score trends (average)
            $engagementSql = "SELECT 
                                 {$periodExpressionEngagement} as period,
                                 AVG(total_score) as avg_score,
                                 COUNT(*) as members_with_score
                               FROM engagement_scores
                               WHERE month_year BETWEEN ? AND ?
                               GROUP BY {$periodExpressionEngagement}
                               ORDER BY period ASC";
            
            $engagementTrends = $this->db->all($engagementSql, [$startDate, $endDate]);

            $newCellsSql = "SELECT {$periodExpressionCellsCreated} as period, COUNT(*) as new_cells
                            FROM cells
                            WHERE created_at BETWEEN ? AND ? $scopeFilter
                            GROUP BY {$periodExpressionCellsCreated}
                            ORDER BY period ASC";
            $newCells = $this->db->all($newCellsSql, [$startDate, $endDate]);

            $leaderPromotionsSql = "SELECT {$periodExpressionActivities} as period, COUNT(*) as promoted_leaders
                                    FROM activity_logs
                                    WHERE action = 'leader_promoted' AND created_at BETWEEN ? AND ?
                                    GROUP BY {$periodExpressionActivities}
                                    ORDER BY period ASC";
            $leaderPromotions = $this->db->all($leaderPromotionsSql, [$startDate, $endDate]);

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'membership_growth' => $membershipGrowth,
                    'sunday_attendance' => $attendanceTrends,
                    'cell_attendance' => $cellTrends,
                    'engagement_scores' => $engagementTrends,
                    'new_cells' => $newCells,
                    'leader_promotions' => $leaderPromotions,
                    'summary' => [
                        'total_new_members' => array_sum(array_column($membershipGrowth, 'new_members')),
                        'total_new_cells' => array_sum(array_column($newCells, 'new_cells')),
                        'total_leader_promotions' => array_sum(array_column($leaderPromotions, 'promoted_leaders')),
                        'avg_sunday_attendance' => $this->calculateAverage($attendanceTrends, 'total_attendance'),
                        'avg_cell_attendance' => $this->calculateAverage($cellTrends, 'total_attendance'),
                        'avg_engagement_score' => $this->calculateAverage($engagementTrends, 'avg_score')
                    ],
                    'scope' => in_array($user['role'], ['admin', 'pastor', 'superadmin']) ? 'church' : $user['role']
                ]
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get growth metrics: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get detailed attendance report
     */
    public function getAttendanceReport(Request $request, Response $response): Response
    {
        try {
            $params = $request->getQueryParams();
            $startDate = $params['start_date'] ?? date('Y-m-01');
            $endDate = $params['end_date'] ?? date('Y-m-d');
            $zoneId = $params['zone_id'] ?? null;
            $cellId = $params['cell_id'] ?? null;

            // Build query based on filters
            $sql = "SELECT 
                        u.id,
                        u.first_name,
                        u.last_name,
                        u.email,
                        u.role,
                        c.name as cell_name,
                        z.name as zone_name,
                        COUNT(DISTINCT a_s.id) as sunday_count,
                        COUNT(DISTINCT a_c.id) as cell_count,
                        COUNT(DISTINCT a_s.id) + COUNT(DISTINCT a_c.id) as total_score
                    FROM users u
                    LEFT JOIN cells c ON u.cell_id = c.id
                    LEFT JOIN zones z ON u.zone_id = z.id
                    LEFT JOIN attendance_sunday a_s ON u.id = a_s.user_id 
                        AND a_s.attendance_date BETWEEN ? AND ?
                    LEFT JOIN attendance_cell a_c ON u.id = a_c.user_id 
                        AND a_c.meeting_date BETWEEN ? AND ?
                    WHERE u.role IN ('member', 'cell_leader') AND u.is_active = 1";
            
            $queryParams = [$startDate, $endDate, $startDate, $endDate];

            if ($zoneId) {
                $sql .= " AND u.zone_id = ?";
                $queryParams[] = $zoneId;
            }

            if ($cellId) {
                $sql .= " AND u.cell_id = ?";
                $queryParams[] = $cellId;
            }

            $sql .= " GROUP BY u.id ORDER BY total_score DESC, u.last_name ASC";

            $members = $this->db->all($sql, $queryParams);

            // Calculate statistics
            $totalMembers = count($members);
            $highAttendees = count(array_filter($members, fn($m) => $m['total_score'] >= 8));
            $lowAttendees = count(array_filter($members, fn($m) => $m['total_score'] <= 2));
            $avgAttendance = $totalMembers > 0 
                ? round(array_sum(array_column($members, 'total_score')) / $totalMembers, 1)
                : 0;

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'members' => $members,
                    'statistics' => [
                        'total_members' => $totalMembers,
                        'high_attendees' => $highAttendees,
                        'low_attendees' => $lowAttendees,
                        'avg_attendance_score' => $avgAttendance,
                        'period' => "$startDate to $endDate"
                    ]
                ]
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to generate attendance report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get cell/zone comparison report
     */
    public function getComparison(Request $request, Response $response): Response
    {
        try {
            $params = $request->getQueryParams();
            $startDate = $params['start_date'] ?? date('Y-m-01');
            $endDate = $params['end_date'] ?? date('Y-m-d');

            // Cell comparison
            $cellSql = "SELECT 
                            c.id,
                            c.name,
                            z.name as zone_name,
                            COUNT(DISTINCT u.id) as member_count,
                            COUNT(DISTINCT a_c.user_id) as attendance_count,
                            ROUND(
                                COUNT(DISTINCT a_c.user_id) * 100.0 / 
                                NULLIF(COUNT(DISTINCT u.id), 0), 1
                            ) as attendance_rate
                         FROM cells c
                         LEFT JOIN zones z ON c.zone_id = z.id
                         LEFT JOIN users u ON c.id = u.cell_id AND u.is_active = 1
                         LEFT JOIN attendance_cell a_c ON u.id = a_c.user_id 
                             AND a_c.meeting_date BETWEEN ? AND ?
                         WHERE c.is_active = 1
                         GROUP BY c.id
                         ORDER BY attendance_rate DESC, c.name ASC";
            
            $cells = $this->db->all($cellSql, [$startDate, $endDate]);

            // Zone comparison
            $zoneSql = "SELECT 
                            z.id,
                            z.name,
                            COUNT(DISTINCT u.id) as member_count,
                            COUNT(DISTINCT a_s.user_id) as sunday_attendance,
                            ROUND(
                                COUNT(DISTINCT a_s.user_id) * 100.0 / 
                                NULLIF(COUNT(DISTINCT u.id), 0), 1
                            ) as attendance_rate
                         FROM zones z
                         LEFT JOIN users u ON z.id = u.zone_id AND u.is_active = 1
                         LEFT JOIN attendance_sunday a_s ON u.id = a_s.user_id 
                             AND a_s.attendance_date BETWEEN ? AND ?
                         WHERE z.is_active = 1
                         GROUP BY z.id
                         ORDER BY attendance_rate DESC, z.name ASC";
            
            $zones = $this->db->all($zoneSql, [$startDate, $endDate]);

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'cells' => $cells,
                    'zones' => $zones,
                    'period' => "$startDate to $endDate"
                ]
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to generate comparison report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get member engagement scores
     */
    public function getEngagementScores(Request $request, Response $response): Response
    {
        try {
            $params = $request->getQueryParams();
            $month = $params['month'] ?? date('Y-m-01');
            $zoneId = $params['zone_id'] ?? null;
            $cellId = $params['cell_id'] ?? null;

            $sql = "SELECT 
                        es.*,
                        u.first_name,
                        u.last_name,
                        u.email,
                        u.role,
                        c.name as cell_name,
                        z.name as zone_name
                    FROM engagement_scores es
                    JOIN users u ON es.user_id = u.id
                    LEFT JOIN cells c ON u.cell_id = c.id
                    LEFT JOIN zones z ON u.zone_id = z.id
                    WHERE es.month_year = ? AND u.is_active = 1";
            
            $queryParams = [$month];

            if ($zoneId) {
                $sql .= " AND u.zone_id = ?";
                $queryParams[] = $zoneId;
            }

            if ($cellId) {
                $sql .= " AND u.cell_id = ?";
                $queryParams[] = $cellId;
            }

            $sql .= " ORDER BY es.total_score DESC, u.last_name ASC";

            $scores = $this->db->all($sql, $queryParams);

            // Calculate statistics
            $totalMembers = count($scores);
            $avgScore = $totalMembers > 0 
                ? round(array_sum(array_column($scores, 'total_score')) / $totalMembers, 1)
                : 0;
            
            $highEngagement = count(array_filter($scores, fn($s) => $s['total_score'] >= 15));
            $lowEngagement = count(array_filter($scores, fn($s) => $s['total_score'] <= 5));

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'scores' => $scores,
                    'statistics' => [
                        'total_members' => $totalMembers,
                        'average_score' => $avgScore,
                        'high_engagement' => $highEngagement,
                        'low_engagement' => $lowEngagement,
                        'month' => $month
                    ]
                ]
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get engagement scores: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get admin dashboard data
     */
    private function getAdminDashboard(string $startDate, string $endDate): array
    {
        // Total members
        $totalMembers = $this->db->first(
            "SELECT COUNT(*) as count FROM users WHERE is_active = 1 AND role IN ('member', 'cell_leader')"
        )['count'] ?? 0;

        // New members this period
        $newMembers = $this->db->first(
            "SELECT COUNT(*) as count FROM users 
             WHERE is_active = 1 AND role IN ('member', 'cell_leader') 
             AND DATE(created_at) BETWEEN ? AND ?",
            [$startDate, $endDate]
        )['count'] ?? 0;

        // Total cells
        $totalCells = $this->db->first(
            "SELECT COUNT(*) as count FROM cells WHERE is_active = 1"
        )['count'] ?? 0;

        // Total zones
        $totalZones = $this->db->first(
            "SELECT COUNT(*) as count FROM zones WHERE is_active = 1"
        )['count'] ?? 0;

        // Sunday attendance average
        $sundayStats = $this->db->first(
            "SELECT AVG(daily_count) as avg_attendance, SUM(daily_count) as total_checkins
             FROM (
                 SELECT COUNT(*) as daily_count 
                 FROM attendance_sunday 
                 WHERE attendance_date BETWEEN ? AND ?
                 GROUP BY attendance_date
             ) as daily",
            [$startDate, $endDate]
        );

        // Cell attendance
        $cellStats = $this->db->first(
            "SELECT COUNT(*) as total_meetings, COUNT(DISTINCT user_id) as unique_attendees
             FROM attendance_cell 
             WHERE meeting_date BETWEEN ? AND ?",
            [$startDate, $endDate]
        );

        // Absence flags
        $absenceFlags = $this->db->first(
            "SELECT COUNT(*) as count FROM absence_flags WHERE resolved_at IS NULL"
        )['count'] ?? 0;

        // Pending absence requests
        $pendingRequests = $this->db->first(
            "SELECT COUNT(*) as count FROM absence_requests WHERE status = 'pending'"
        )['count'] ?? 0;

        $pendingCellChanges = $this->db->first(
            "SELECT COUNT(*) as count FROM cell_change_requests WHERE status = 'pending'"
        )['count'] ?? 0;

        $newCells = $this->db->first(
            "SELECT COUNT(*) as count FROM cells WHERE DATE(created_at) BETWEEN ? AND ?",
            [$startDate, $endDate]
        )['count'] ?? 0;

        $leaderPromotions = $this->db->first(
            "SELECT COUNT(*) as count FROM activity_logs
             WHERE action = 'leader_promoted' AND DATE(created_at) BETWEEN ? AND ?",
            [$startDate, $endDate]
        )['count'] ?? 0;

        // Recent activity
        $recentActivity = $this->db->all(
            "SELECT al.*, u.first_name, u.last_name 
             FROM activity_logs al
             JOIN users u ON al.user_id = u.id
             ORDER BY al.created_at DESC LIMIT 10"
        );

        return [
            'membership' => [
                'total_members' => $totalMembers,
                'new_members' => $newMembers
            ],
            'structure' => [
                'total_zones' => $totalZones,
                'total_cells' => $totalCells
            ],
            'attendance' => [
                'avg_sunday_attendance' => round($sundayStats['avg_attendance'] ?? 0, 1),
                'total_sunday_checkins' => $sundayStats['total_checkins'] ?? 0,
                'total_cell_meetings' => $cellStats['total_meetings'] ?? 0,
                'unique_cell_attendees' => $cellStats['unique_attendees'] ?? 0
            ],
            'alerts' => [
                'absence_flags' => $absenceFlags,
                'pending_absence_requests' => $pendingRequests,
                'pending_cell_change_requests' => $pendingCellChanges
            ],
            'growth' => [
                'new_cells' => $newCells,
                'leader_promotions' => $leaderPromotions
            ],
            'recent_activity' => $recentActivity
        ];
    }

    /**
     * Get zone leader dashboard data
     */
    private function getZoneLeaderDashboard(int $zoneId, string $startDate, string $endDate): array
    {
        // Zone info
        $zone = $this->db->first(
            "SELECT z.*, 
                    u.first_name as leader_first_name,
                    u.last_name as leader_last_name
             FROM zones z
             LEFT JOIN users u ON z.zone_leader_id = u.id
             WHERE z.id = ?",
            [$zoneId]
        );

        // Cells in zone
        $cells = $this->db->all(
            "SELECT c.*, 
                    u.first_name as leader_first_name,
                    u.last_name as leader_last_name,
                    (SELECT COUNT(*) FROM users WHERE cell_id = c.id AND is_active = 1) as member_count
             FROM cells c
             LEFT JOIN users u ON c.cell_leader_id = u.id
             WHERE c.zone_id = ? AND c.is_active = 1",
            [$zoneId]
        );

        // Members in zone
        $totalMembers = $this->db->first(
            "SELECT COUNT(*) as count FROM users WHERE zone_id = ? AND is_active = 1",
            [$zoneId]
        )['count'] ?? 0;

        // Zone attendance
        $sundayAttendance = $this->db->first(
            "SELECT COUNT(*) as count 
             FROM attendance_sunday a_s
             JOIN users u ON a_s.user_id = u.id
             WHERE u.zone_id = ? AND a_s.attendance_date BETWEEN ? AND ?",
            [$zoneId, $startDate, $endDate]
        )['count'] ?? 0;

        // Absence flags in zone
        $absenceFlags = $this->db->first(
            "SELECT COUNT(*) as count FROM absence_flags af
             JOIN users u ON af.user_id = u.id
             WHERE u.zone_id = ? AND af.resolved_at IS NULL",
            [$zoneId]
        )['count'] ?? 0;

        $pendingCellChanges = $this->db->first(
            "SELECT COUNT(*) as count
             FROM cell_change_requests ccr
             JOIN users u ON u.id = ccr.user_id
             JOIN cells c ON c.id = ccr.requested_cell_id
             WHERE ccr.status = 'pending' AND (u.zone_id = ? OR c.zone_id = ?)",
            [$zoneId, $zoneId]
        )['count'] ?? 0;

        return [
            'zone_info' => $zone,
            'cells' => $cells,
            'cell_count' => count($cells),
            'total_members' => $totalMembers,
            'attendance' => [
                'sunday_checkins' => $sundayAttendance
            ],
            'alerts' => [
                'absence_flags' => $absenceFlags,
                'pending_cell_change_requests' => $pendingCellChanges
            ]
        ];
    }

    /**
     * Get cell leader dashboard data
     */
    private function getCellLeaderDashboard(int $cellId, string $startDate, string $endDate): array
    {
        // Cell info
        $cell = $this->db->first(
            "SELECT c.*, z.name as zone_name 
             FROM cells c
             LEFT JOIN zones z ON c.zone_id = z.id
             WHERE c.id = ?",
            [$cellId]
        );

        // Members in cell
        $members = $this->db->all(
            "SELECT u.id, u.first_name, u.last_name, u.email, u.phone, m.member_number
             FROM users u
             LEFT JOIN members m ON u.id = m.user_id
             WHERE u.cell_id = ? AND u.is_active = 1
             ORDER BY u.last_name ASC",
            [$cellId]
        );

        // Cell attendance in period
        $cellAttendance = $this->db->all(
            "SELECT a.*, u.first_name, u.last_name
             FROM attendance_cell a
             JOIN users u ON a.user_id = u.id
             WHERE a.cell_id = ? AND a.meeting_date BETWEEN ? AND ?
             ORDER BY a.meeting_date DESC",
            [$cellId, $startDate, $endDate]
        );

        // Group by meeting date
        $meetings = [];
        foreach ($cellAttendance as $record) {
            $date = $record['meeting_date'];
            if (!isset($meetings[$date])) {
                $meetings[$date] = [
                    'date' => $date,
                    'attendees' => []
                ];
            }
            $meetings[$date]['attendees'][] = [
                'id' => $record['user_id'],
                'name' => $record['first_name'] . ' ' . $record['last_name']
            ];
        }

        // Calculate member attendance stats
        foreach ($members as &$member) {
            $sundayCount = $this->db->first(
                "SELECT COUNT(*) as count FROM attendance_sunday 
                 WHERE user_id = ? AND attendance_date BETWEEN ? AND ?",
                [$member['id'], $startDate, $endDate]
            )['count'] ?? 0;
            
            $cellCount = $this->db->first(
                "SELECT COUNT(*) as count FROM attendance_cell 
                 WHERE user_id = ? AND meeting_date BETWEEN ? AND ?",
                [$member['id'], $startDate, $endDate]
            )['count'] ?? 0;
            
            $member['attendance_stats'] = [
                'sunday_count' => $sundayCount,
                'cell_count' => $cellCount,
                'total' => $sundayCount + $cellCount
            ];
        }

        return [
            'cell_info' => $cell,
            'members' => $members,
            'member_count' => count($members),
            'meetings' => array_values($meetings),
            'total_meetings' => count($meetings),
            'pending_cell_change_requests' => $this->db->first(
                "SELECT COUNT(*) as count FROM cell_change_requests
                 WHERE status = 'pending' AND (current_cell_id = ? OR requested_cell_id = ?)",
                [$cellId, $cellId]
            )['count'] ?? 0
        ];
    }

    /**
     * Get member dashboard data
     */
    private function getMemberDashboard(int $userId, string $startDate, string $endDate): array
    {
        // User info
        $user = $this->db->first(
            "SELECT u.*, c.name as cell_name, z.name as zone_name
             FROM users u
             LEFT JOIN cells c ON u.cell_id = c.id
             LEFT JOIN zones z ON u.zone_id = z.id
             WHERE u.id = ?",
            [$userId]
        );

        // Personal attendance
        $sundayAttendance = $this->db->all(
            "SELECT attendance_date, check_in_time 
             FROM attendance_sunday 
             WHERE user_id = ? AND attendance_date BETWEEN ? AND ?
             ORDER BY attendance_date DESC",
            [$userId, $startDate, $endDate]
        );

        $cellAttendance = $this->db->all(
            "SELECT a.meeting_date, c.name as cell_name
             FROM attendance_cell a
             JOIN cells c ON a.cell_id = c.id
             WHERE a.user_id = ? AND a.meeting_date BETWEEN ? AND ?
             ORDER BY a.meeting_date DESC",
            [$userId, $startDate, $endDate]
        );

        // Stats
        $sundayCount = count($sundayAttendance);
        $cellCount = count($cellAttendance);
        $totalSundays = $this->countSundaysInRange($startDate, $endDate);
        
        $cell = $this->db->first(
            "SELECT meeting_day FROM cells WHERE id = (SELECT cell_id FROM users WHERE id = ?)",
            [$userId]
        );
        $cellMeetingCount = $cell ? $this->countCellMeetingsInRange($userId, $startDate, $endDate) : 0;

        // Recent announcements
        $announcements = $this->db->all(
            "SELECT a.*, u.first_name as created_by_first_name, u.last_name as created_by_last_name
             FROM announcements a
             JOIN users u ON a.created_by = u.id
             WHERE a.is_active = 1 
               AND (a.expires_at IS NULL OR a.expires_at >= DATE('now'))
               AND (a.audience = 'all' OR a.audience = 'members')
             ORDER BY a.created_at DESC LIMIT 5"
        );

        // Pending absence requests
        $pendingRequests = $this->db->all(
            "SELECT * FROM absence_requests 
             WHERE user_id = ? AND status = 'pending'
             ORDER BY created_at DESC",
            [$userId]
        );

        $pendingCellChangeRequests = $this->db->all(
            "SELECT ccr.*, requested_cell.name as requested_cell_name
             FROM cell_change_requests ccr
             JOIN cells requested_cell ON requested_cell.id = ccr.requested_cell_id
             WHERE ccr.user_id = ? AND ccr.status = 'pending'
             ORDER BY ccr.requested_at DESC",
            [$userId]
        );

        return [
            'user_info' => $user,
            'attendance' => [
                'sunday_attendance' => $sundayAttendance,
                'cell_attendance' => $cellAttendance,
                'sunday_count' => $sundayCount,
                'cell_count' => $cellCount,
                'total_possible_sundays' => $totalSundays,
                'total_possible_cell_meetings' => $cellMeetingCount,
                'sunday_rate' => $totalSundays > 0 ? round(($sundayCount / $totalSundays) * 100, 1) : 0,
                'cell_rate' => $cellMeetingCount > 0 ? round(($cellCount / $cellMeetingCount) * 100, 1) : 0
            ],
            'announcements' => $announcements,
            'pending_absence_requests' => $pendingRequests,
            'pending_cell_change_requests' => $pendingCellChangeRequests
        ];
    }

    /**
     * Helper methods
     */
    private function getStartDateForPeriod(string $period): string
    {
        $now = new DateTime();
        switch ($period) {
            case 'week': $now->modify('-1 week'); break;
            case 'month': $now->modify('-1 month'); break;
            case 'quarter': $now->modify('-3 months'); break;
            case 'year': $now->modify('-1 year'); break;
        }
        return $now->format('Y-m-01');
    }

    private function countSundaysInRange(string $start, string $end): int
    {
        $startDate = new DateTime($start);
        $endDate = new DateTime($end);
        $sundayCount = 0;
        while ($startDate <= $endDate) {
            if ($startDate->format('w') == 0) {
                $sundayCount++;
            }
            $startDate->modify('+1 day');
        }
        return $sundayCount;
    }

    private function countCellMeetingsInRange(int $userId, string $start, string $end): int
    {
        $cell = $this->db->first(
            "SELECT meeting_day FROM cells WHERE id = (SELECT cell_id FROM users WHERE id = ?)",
            [$userId]
        );
        if (!$cell) return 0;
        
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

    private function calculateAverage(array $data, string $field): float
    {
        if (empty($data)) return 0.0;
        $values = array_column($data, $field);
        return round(array_sum($values) / count($values), 1);
    }

    /**
     * Monday morning pastoral report — cron-triggered, authenticated by X-Cron-Secret header.
     * Sends Sunday attendance + giving + sermon summary to all pastors via email + WhatsApp.
     */
    public function mondayPastoralReport(Request $request, Response $response): Response
    {
        $cronSecret = getenv('CRON_SECRET') ?: '';
        if (empty($cronSecret) || $request->getHeaderLine('X-Cron-Secret') !== $cronSecret) {
            return $this->jsonResponse(['error' => 'Unauthorized'], 401);
        }

        try {
            $params      = $request->getQueryParams();
            $serviceDate = $params['date'] ?? date('Y-m-d', strtotime('yesterday'));

            $service = new PastoralReportService($this->db);
            $result  = $service->generateAndSend($serviceDate);

            return $this->jsonResponse([
                'status' => 'success',
                'data'   => $result,
            ]);
        } catch (Exception $e) {
            error_log('[PastoralReport] ' . $e->getMessage());
            return $this->jsonResponse([
                'status'  => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
