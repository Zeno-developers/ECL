<?php

namespace App\Services;

use App\Database;
use Exception;

class PollService
{
    private $db;
    private $mailService;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->mailService = new MailService();
    }

    /**
     * Generate polls for all meetings scheduled for tomorrow
     */
    public function generateTomorrowPolls(): array
    {
        try {
            $tomorrow = date('Y-m-d', strtotime('+1 day'));
            $results = ['created' => 0, 'emailed' => 0, 'errors' => []];

            // Get all cells with meetings scheduled for tomorrow
            $cells = $this->db->all(
                "SELECT c.id, c.name, cl.id as leader_id, cl.first_name as leader_first_name, 
                        cl.last_name as leader_last_name, cl.email as leader_email,
                        c.meeting_time, c.meeting_location
                 FROM cells c
                 LEFT JOIN users cl ON cl.id = c.cell_leader_id
                 WHERE c.is_active = 1 AND c.created_date <= ?
                 AND (SELECT COUNT(*) FROM meeting_polls WHERE cell_id = c.id AND meeting_date = ? AND status != 'cancelled') = 0",
                [$tomorrow, $tomorrow]
            );

            foreach ($cells as $cell) {
                try {
                    // Create the poll
                    $pollId = $this->createCellPoll(
                        $cell['id'],
                        $cell['name'],
                        $cell['meeting_time'],
                        $cell['meeting_location'],
                        $tomorrow
                    );

                    if ($pollId) {
                        $results['created']++;

                        // Send emails to cell members
                        $emailsSent = $this->sendCellPollEmails(
                            $pollId,
                            $cell['id'],
                            $cell['name'],
                            $cell['meeting_time'],
                            $cell['meeting_location'],
                            $tomorrow,
                            $cell['leader_first_name'] . ' ' . $cell['leader_last_name']
                        );

                        $results['emailed'] += $emailsSent;
                    }
                } catch (Exception $e) {
                    $results['errors'][] = "Cell {$cell['name']}: " . $e->getMessage();
                }
            }

            // Also generate zone meeting polls similarly
            $zones = $this->db->all(
                "SELECT z.id, z.name, zl.id as leader_id, zl.first_name as leader_first_name, 
                        zl.last_name as leader_last_name, zl.email as leader_email
                 FROM zones z
                 LEFT JOIN users zl ON zl.id = z.zone_leader_id
                 WHERE z.is_active = 1
                 AND (SELECT COUNT(*) FROM meeting_polls WHERE zone_id = z.id AND meeting_date = ? AND status != 'cancelled') = 0",
                [$tomorrow]
            );

            foreach ($zones as $zone) {
                try {
                    $pollId = $this->createZonePoll($zone['id'], $zone['name'], $tomorrow);
                    if ($pollId) {
                        $results['created']++;
                    }
                } catch (Exception $e) {
                    $results['errors'][] = "Zone {$zone['name']}: " . $e->getMessage();
                }
            }

            return $results;
        } catch (Exception $e) {
            error_log("Poll generation failed: " . $e->getMessage());
            return ['created' => 0, 'emailed' => 0, 'errors' => [$e->getMessage()]];
        }
    }

    private function createCellPoll(
        int $cellId,
        string $cellName,
        string $meetingTime,
        string $meetingLocation,
        string $meetingDate
    ): ?int {
        $pollId = $this->db->insert('meeting_polls', [
            'audience_type' => 'cell',
            'audience_id' => $cellId,
            'title' => "$cellName Cell Meeting",
            'description' => "Please confirm your attendance for the $cellName cell meeting",
            'meeting_date' => $meetingDate,
            'meeting_time' => $meetingTime,
            'meeting_location' => $meetingLocation,
            'status' => 'open',
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $pollId > 0 ? $pollId : null;
    }

    private function createZonePoll(int $zoneId, string $zoneName, string $meetingDate): ?int
    {
        $pollId = $this->db->insert('meeting_polls', [
            'audience_type' => 'zone',
            'audience_id' => $zoneId,
            'title' => "$zoneName Zone Meeting",
            'description' => "Please confirm your attendance for the $zoneName zone meeting",
            'meeting_date' => $meetingDate,
            'meeting_time' => '19:00:00',
            'meeting_location' => 'TBD',
            'status' => 'open',
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $pollId > 0 ? $pollId : null;
    }

    private function sendCellPollEmails(
        int $pollId,
        int $cellId,
        string $cellName,
        string $meetingTime,
        string $meetingLocation,
        string $meetingDate,
        string $leaderName
    ): int {
        try {
            // Get all active members in the cell
            $members = $this->db->all(
                "SELECT u.id, u.first_name, u.last_name, u.email FROM users u
                 WHERE u.is_active = 1 AND u.cell_id = ?",
                [$cellId]
            );

            if (empty($members)) {
                return 0;
            }

            // Prepare recipient list
            $recipients = array_map(function ($member) {
                return [
                    'email' => $member['email'],
                    'name' => $member['first_name'] . ' ' . $member['last_name']
                ];
            }, $members);

            // Send poll emails (appearing from the cell leader)
            $pollUrl = getenv('FRONTEND_URL') ?: getenv('APP_URL') ?: 'https://elchurch.site';
            $pollLink = "$pollUrl/polls/$pollId";

            return $this->mailService->sendPollEmail(
                $recipients,
                "$cellName Cell Meeting",
                "Please confirm your attendance for tomorrow's cell meeting",
                $meetingDate,
                $meetingTime,
                $meetingLocation,
                $pollLink,
                $leaderName
            );
        } catch (Exception $e) {
            error_log("Failed to send cell poll emails: " . $e->getMessage());
            return 0;
        }
    }
}
