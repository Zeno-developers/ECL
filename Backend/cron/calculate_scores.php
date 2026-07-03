<?php
/**
 * Cron Job: Calculate Monthly Engagement Scores
 * 
 * This script calculates engagement scores for all members based on:
 * - Sunday attendance: 10 points each
 * - Cell meeting attendance: 5 points each
 * 
 * It should run on the 1st of every month at 12:00 AM
 * 
 * Usage: php backend/cron/calculate_scores.php
 */

require_once __DIR__ . '/../src/bootstrap.php';

use App\Database;

class EngagementScoreCalculator
{
    private $db;
    
    public function __construct()
    {
        $this->db = Database::getInstance();
    }
    
    public function calculate()
    {
        echo "[" . date('Y-m-d H:i:s') . "] Starting engagement score calculation...\n";
        
        try {
            $currentMonth = date('Y-m-01'); // First day of current month
            $previousMonth = date('Y-m-01', strtotime('last month'));
            
            echo "Calculating scores for: $previousMonth\n";
            
            // Get all active members
            $members = $this->db->all(
                "SELECT u.id, u.first_name, u.last_name
                 FROM users u
                 WHERE u.is_active = 1 AND u.role IN ('member', 'cell_leader')"
            );
            
            echo "Found " . count($members) . " members to score\n";
            
            $processed = 0;
            $updated = 0;
            $inserted = 0;
            
            foreach ($members as $member) {
                $processed++;
                
                // Calculate Sunday attendance for the month
                $sundayCount = $this->db->first(
                    "SELECT COUNT(*) as count 
                     FROM attendance_sunday 
                     WHERE user_id = ? 
                     AND attendance_date >= ? 
                     AND attendance_date < ?",
                    [$member['id'], $previousMonth, $currentMonth]
                )['count'] ?? 0;
                
                // Calculate cell meeting attendance for the month
                $cellCount = $this->db->first(
                    "SELECT COUNT(*) as count 
                     FROM attendance_cell 
                     WHERE user_id = ? 
                     AND meeting_date >= ? 
                     AND meeting_date < ?",
                    [$member['id'], $previousMonth, $currentMonth]
                )['count'] ?? 0;
                
                // Calculate total score
                $totalScore = ($sundayCount * 10) + ($cellCount * 5);
                
                // Check if score already exists for this month
                $existing = $this->db->first(
                    "SELECT id FROM engagement_scores WHERE user_id = ? AND month_year = ?",
                    [$member['id'], $previousMonth]
                );
                
                if ($existing) {
                    // Update existing score
                    $this->db->query(
                        "UPDATE engagement_scores 
                         SET sunday_attendance_count = ?, 
                             cell_attendance_count = ?, 
                             total_score = ?,
                             last_updated = NOW()
                         WHERE id = ?",
                        [$sundayCount, $cellCount, $totalScore, $existing['id']]
                    );
                    $updated++;
                } else {
                    // Insert new score
                    $this->db->insert('engagement_scores', [
                        'user_id' => $member['id'],
                        'month_year' => $previousMonth,
                        'sunday_attendance_count' => $sundayCount,
                        'cell_attendance_count' => $cellCount,
                        'total_score' => $totalScore
                    ]);
                    $inserted++;
                }
                
                // Log activity for high performers (score >= 30)
                if ($totalScore >= 30) {
                    $this->logActivity(
                        null,
                        'engagement_high',
                        'user',
                        $member['id'],
                        [
                            'month' => $previousMonth,
                            'score' => $totalScore,
                            'sunday_count' => $sundayCount,
                            'cell_count' => $cellCount
                        ]
                    );
                }
                
                // Log activity for low performers (score <= 5)
                if ($totalScore <= 5 && $totalScore > 0) {
                    $this->logActivity(
                        null,
                        'engagement_low',
                        'user',
                        $member['id'],
                        [
                            'month' => $previousMonth,
                            'score' => $totalScore,
                            'sunday_count' => $sundayCount,
                            'cell_count' => $cellCount
                        ]
                    );
                }
                
                // Progress indicator
                if ($processed % 100 == 0) {
                    echo "Processed $processed members...\n";
                }
            }
            
            echo "Scores calculated: $inserted new, $updated updated\n";
            
            // Clean up old scores (keep only last 24 months)
            $this->cleanupOldScores();
            
            echo "[" . date('Y-m-d H:i:s') . "] Engagement score calculation completed.\n";
            
        } catch (Exception $e) {
            echo "ERROR: " . $e->getMessage() . "\n";
            error_log('Engagement score calculation failed: ' . $e->getMessage());
        }
    }
    
    private function cleanupOldScores(): void
    {
        $cutoffDate = date('Y-m-01', strtotime('-24 months'));
        
        $result = $this->db->query(
            "DELETE FROM engagement_scores WHERE month_year < ?",
            [$cutoffDate]
        );
        
        $deleted = $result->rowCount();
        echo "Cleaned up $deleted old score records\n";
    }
    
    private function logActivity($userId, string $action, string $entityType, $entityId, array $details = []): void
    {
        try {
            $this->db->insert('activity_logs', [
                'user_id' => $userId,
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'details' => json_encode($details)
            ]);
        } catch (Exception $e) {
            error_log('Failed to log activity: ' . $e->getMessage());
        }
    }
}

// Run the calculator
$calculator = new EngagementScoreCalculator();
$calculator->calculate();
