<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use App\Database;
use Exception;

class DashboardController extends BaseController
{
    public function getStats(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            
            // Get data from multiple sources in parallel
            $membersRes = $this->db->all("SELECT * FROM members WHERE is_active = 1");
            $prayersRes = $this->db->all("SELECT * FROM prayers");
            $eventsRes = $this->db->all("SELECT * FROM events WHERE date >= CURRENT_DATE");
            $givingRes = $this->db->first("SELECT SUM(amount) as total, COUNT(*) as count FROM giving WHERE user_id = ?", [$userId]);
            
            $totalMembers = count($membersRes);
            $userPrayersCount = count(array_filter($prayersRes, function($p) use ($userId) {
                return isset($p['user_id']) && (int)$p['user_id'] === (int)$userId;
            }));
            $upcomingEvents = count($eventsRes);
            $totalGiven = $givingRes['total'] ?? 0;
            $donationCount = $givingRes['count'] ?? 0;
            
            $stats = [
                [
                    'value' => (string)$totalMembers,
                    'label' => 'Church Members',
                    'icon' => 'Users',
                    'color' => 'bg-blue-500'
                ],
                [
                    'value' => 'R ' . number_format($totalGiven, 2),
                    'label' => 'Your Total Giving',
                    'icon' => 'DollarSign',
                    'color' => 'bg-green-500'
                ],
                [
                    'value' => (string)$upcomingEvents,
                    'label' => 'Upcoming Events',
                    'icon' => 'Calendar',
                    'color' => 'bg-purple-500'
                ],
                [
                    'value' => (string)$userPrayersCount,
                    'label' => 'Your Prayers',
                    'icon' => 'Heart',
                    'color' => 'bg-red-500'
                ]
            ];

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $stats
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get dashboard stats: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getRecentActivity(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $activities = [];
            
            // Recent donations
            $donations = $this->db->all(
                "SELECT * FROM giving WHERE user_id = ? ORDER BY created_at DESC LIMIT 2",
                [$userId]
            );
            foreach ($donations as $donation) {
                $activities[] = [
                    'text' => 'You gave R ' . number_format($donation['amount'], 2) . ' to ' . ($donation['fund'] ?? 'General'),
                    'time' => date('M j, Y', strtotime($donation['created_at'])),
                    'color' => 'bg-green-400'
                ];
            }
            
            // Recent prayers
            $prayers = $this->db->all(
                "SELECT * FROM prayers WHERE user_id = ? ORDER BY created_at DESC LIMIT 2",
                [$userId]
            );
            foreach ($prayers as $prayer) {
                $activities[] = [
                    'text' => 'You submitted a prayer request: "' . substr($prayer['title'], 0, 30) . '..."',
                    'time' => date('M j, Y', strtotime($prayer['created_at'])),
                    'color' => 'bg-red-400'
                ];
            }
            
            // Upcoming events
            $events = $this->db->all(
                "SELECT * FROM events WHERE date >= CURRENT_DATE ORDER BY date ASC LIMIT 2"
            );
            foreach ($events as $event) {
                $activities[] = [
                    'text' => 'New event: ' . $event['title'],
                    'time' => date('M j, Y', strtotime($event['date'])),
                    'color' => 'bg-blue-400'
                ];
            }
            
            // Sort by time (recent first) and limit to 5
            usort($activities, function($a, $b) {
                return strtotime($b['time']) - strtotime($a['time']);
            });
            
            return $this->jsonResponse([
                'status' => 'success',
                'data' => array_slice($activities, 0, 5)
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get recent activity: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getComprehensiveStats(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            
            $members = $this->db->all("SELECT * FROM members WHERE is_active = 1");
            $prayers = $this->db->all("SELECT * FROM prayers");
            $events = $this->db->all("SELECT * FROM events WHERE date >= CURRENT_DATE");
            $giving = $this->db->first("SELECT SUM(amount) as total, COUNT(*) as count FROM giving WHERE user_id = ?", [$userId]);
            $visitors = $this->db->first("SELECT COUNT(*) as count FROM visitors WHERE strftime('%m', visit_date) = strftime('%m', 'now') AND strftime('%Y', visit_date) = strftime('%Y', 'now')");
            $engagement = [
                'activeMembers' => count($members),
                'averageAttendance' => 0 // Could be calculated from event registrations
            ];
            
            $totalMembers = count($members);
            $activeMembers = $engagement['activeMembers'];
            $userPrayersCount = count(array_filter($prayers, function($p) use ($userId) {
                return isset($p['user_id']) && (int)$p['user_id'] === (int)$userId;
            }));
            $upcomingEvents = count($events);
            $totalGiven = $giving['total'] ?? 0;
            $donationCount = $giving['count'] ?? 0;
            $newVisitors = $visitors['count'] ?? 0;
            
            $stats = [
                ['value' => (string)$totalMembers, 'label' => 'Total Members', 'icon' => 'Users', 'color' => 'bg-blue-500'],
                ['value' => (string)$activeMembers, 'label' => 'Active Members', 'icon' => 'UserCheck', 'color' => 'bg-green-500'],
                ['value' => (string)$upcomingEvents, 'label' => 'Upcoming Events', 'icon' => 'Calendar', 'color' => 'bg-purple-500'],
                ['value' => (string)$userPrayersCount, 'label' => 'Your Prayer Requests', 'icon' => 'Heart', 'color' => 'bg-red-500'],
                ['value' => 'R ' . number_format($totalGiven, 2), 'label' => 'Your Giving', 'icon' => 'DollarSign', 'color' => 'bg-yellow-500'],
                ['value' => (string)$donationCount, 'label' => 'Donation Count', 'icon' => 'TrendingUp', 'color' => 'bg-indigo-500'],
                ['value' => (string)$newVisitors, 'label' => 'New Visitors (This Month)', 'icon' => 'UserPlus', 'color' => 'bg-orange-500']
            ];

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $stats
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get comprehensive stats: ' . $e->getMessage()
            ], 500);
        }
    }
}

