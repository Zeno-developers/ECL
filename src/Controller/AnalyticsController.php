<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use App\Database;
use Exception;

class AnalyticsController extends BaseController
{
    public function trackPageView(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true) ?? [];

            error_log('[pageview] ' . json_encode([
                'path' => $data['path'] ?? null,
                'referrer' => $data['referrer'] ?? null,
                'timestamp' => $data['timestamp'] ?? date('c')
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Pageview tracked'
            ], 201);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to track pageview: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getWebsite(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $user = $this->db->first("SELECT role, zone_id, cell_id FROM users WHERE id = ?", [$userId]);
            
            // Build member filter based on role
            $memberFilter = "is_active = 1";
            if ($user['role'] === 'zone_leader' && $user['zone_id']) {
                $memberFilter = "is_active = 1 AND zone_id = {$user['zone_id']}";
            } elseif ($user['role'] === 'cell_leader' && $user['cell_id']) {
                $memberFilter = "is_active = 1 AND cell_id = {$user['cell_id']}";
            }
            
            $stats = [
                'total_members' => $this->db->first("SELECT COUNT(*) as count FROM users WHERE $memberFilter")['count'],
                'total_events' => $this->db->first("SELECT COUNT(*) as count FROM events WHERE is_published = 1")['count'],
                'total_sermons' => $this->db->first("SELECT COUNT(*) as count FROM sermons WHERE published = 1")['count'],
                'total_blog_posts' => $this->db->first("SELECT COUNT(*) as count FROM blog_posts WHERE status = 'published'")['count'],
                'total_views' => $this->db->first(
                    "SELECT (COALESCE(SUM(views), 0) + COALESCE(SUM(views), 0)) as total 
                     FROM (SELECT views FROM sermons UNION SELECT views FROM blog_posts) as combined"
                )['total'] ?? 0,
                'total_donations' => $this->db->first("SELECT COUNT(*) as count FROM giving")['count'],
                'total_donation_amount' => $this->db->first("SELECT SUM(amount) as total FROM giving")['total'] ?? 0,
                'total_prayers' => $this->db->first("SELECT COUNT(*) as count FROM prayers WHERE is_public = 1")['count'],
                'total_visitors' => $this->db->first("SELECT COUNT(*) as count FROM visitors")['count'],
                'scope' => in_array($user['role'], ['admin', 'pastor', 'superadmin']) ? 'church' : $user['role']
            ];

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $stats
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get website analytics: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getEngagement(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $user = $this->db->first("SELECT role, zone_id, cell_id FROM users WHERE id = ?", [$userId]);
            $thirtyDaysAgo = date('Y-m-d', strtotime('-30 days'));
            
            // Build member filter for engagement queries
            $memberJoin = '';
            $memberWhere = '';
            if ($user['role'] === 'zone_leader' && $user['zone_id']) {
                $memberJoin = "INNER JOIN users u ON giving.user_id = u.id";
                $memberWhere = "AND u.zone_id = {$user['zone_id']}";
            } elseif ($user['role'] === 'cell_leader' && $user['cell_id']) {
                $memberJoin = "INNER JOIN users u ON giving.user_id = u.id";
                $memberWhere = "AND u.cell_id = {$user['cell_id']}";
            }
            
            $engagement = [
                'active_members' => $this->db->first(
                    "SELECT COUNT(DISTINCT giving.user_id) as count FROM giving $memberJoin WHERE giving.created_at >= ? $memberWhere",
                    [$thirtyDaysAgo]
                )['count'] ?? 0,
                'event_registrations' => $this->db->first(
                    "SELECT COUNT(*) as count FROM event_registrations WHERE registered_at >= ?",
                    [$thirtyDaysAgo]
                )['count'] ?? 0,
                'prayer_requests' => $this->db->first(
                    "SELECT COUNT(*) as count FROM prayers WHERE created_at >= ?",
                    [$thirtyDaysAgo]
                )['count'] ?? 0,
                'blog_comments' => $this->db->first(
                    "SELECT COUNT(*) as count FROM blog_comments WHERE created_at >= ?",
                    [$thirtyDaysAgo]
                )['count'] ?? 0,
                'donations' => $this->db->first(
                    "SELECT COUNT(*) as count FROM giving $memberJoin WHERE giving.created_at >= ? $memberWhere",
                    [$thirtyDaysAgo]
                )['count'] ?? 0,
                'avg_donation_amount' => $this->db->first(
                    "SELECT AVG(giving.amount) as avg FROM giving $memberJoin WHERE giving.created_at >= ? $memberWhere",
                    [$thirtyDaysAgo]
                )['avg'] ?? 0,
                'sermon_views' => $this->db->first(
                    "SELECT SUM(views) as total FROM sermons WHERE updated_at >= ?",
                    [$thirtyDaysAgo]
                )['total'] ?? 0,
                'scope' => in_array($user['role'], ['admin', 'pastor', 'superadmin']) ? 'church' : $user['role']
            ];

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $engagement
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get engagement metrics: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getGrowth(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $user = $this->db->first("SELECT role, zone_id, cell_id FROM users WHERE id = ?", [$userId]);
            $period = $request->getQueryParams()['period'] ?? 'monthly';
            $groupBy = $period === 'yearly' ? "strftime('%Y', created_at)" : "strftime('%Y-%m', created_at)";
            $dateCondition = $period === 'yearly' ? '' : "AND created_at >= date('now', '-24 months')";
            
            // Build scope filter for limited roles
            $scopeFilter = '';
            if ($user['role'] === 'zone_leader' && $user['zone_id']) {
                $scopeFilter = "AND zone_id = {$user['zone_id']}";
            } elseif ($user['role'] === 'cell_leader' && $user['cell_id']) {
                $scopeFilter = "AND cell_id = {$user['cell_id']}";
            }
            
            $memberGrowth = $this->db->all(
                "SELECT $groupBy as period, COUNT(*) as new_members 
                 FROM users 
                 WHERE is_active = 1 $dateCondition $scopeFilter 
                 GROUP BY $groupBy 
                 ORDER BY period DESC"
            );
            
            // For giving, need to join with users to filter by zone/cell
            $givingSql = "SELECT $groupBy as period, SUM(g.amount) as total_giving 
                          FROM giving g";
            if ($user['role'] === 'zone_leader' && $user['zone_id']) {
                $givingSql .= " INNER JOIN users u ON g.user_id = u.id WHERE u.zone_id = {$user['zone_id']} $dateCondition";
            } elseif ($user['role'] === 'cell_leader' && $user['cell_id']) {
                $givingSql .= " INNER JOIN users u ON g.user_id = u.id WHERE u.cell_id = {$user['cell_id']} $dateCondition";
            } else {
                $givingSql .= " WHERE 1=1 $dateCondition";
            }
            $givingSql .= " GROUP BY $groupBy ORDER BY period DESC";
            
            $givingGrowth = $this->db->all($givingSql);
            
            $eventGrowth = $this->db->all(
                "SELECT $groupBy as period, COUNT(*) as new_events 
                 FROM events 
                 WHERE is_published = 1 $dateCondition 
                 GROUP BY $groupBy 
                 ORDER BY period DESC"
            );
            
            $blogGrowth = $this->db->all(
                "SELECT $groupBy as period, COUNT(*) as new_posts 
                 FROM blog_posts 
                 WHERE status = 'published' $dateCondition 
                 GROUP BY $groupBy 
                 ORDER BY period DESC"
            );

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'member_growth' => $memberGrowth,
                    'giving_growth' => $givingGrowth,
                    'event_growth' => $eventGrowth,
                    'blog_growth' => $blogGrowth,
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
}

