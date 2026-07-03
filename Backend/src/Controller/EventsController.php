<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use App\Database;
use Exception;

class EventsController extends BaseController
{
    public function getPublic(Request $request, Response $response): Response
    {
        try {
            $params = $request->getQueryParams();
            $sql = "SELECT * FROM events WHERE is_published = 1";
            
            if (isset($params['upcoming']) && $params['upcoming'] == 'true') {
                $sql .= " AND date >= CURRENT_DATE";
            }
            
            $sql .= " ORDER BY date ASC, time ASC";
            
            $events = $this->db->all($sql);
            
            // Enrich events with registered users
            $enrichedEvents = [];
            foreach ($events as $event) {
                $registrations = $this->db->all(
                    "SELECT DISTINCT member_id FROM event_registrations WHERE event_id = ?",
                    [$event['id']]
                );
                $registeredUserIds = array_filter(array_map(function($reg) {
                    return $reg['member_id']; // Get member_id if available
                }, $registrations));
                
                $event['registeredUsers'] = $registeredUserIds;
                $enrichedEvents[] = $event;
            }
            
            return $this->jsonResponse([
                'status' => 'success',
                'data' => $enrichedEvents
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch events: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getAll(Request $request, Response $response): Response
    {
        try {
            $page = (int)($request->getQueryParams()['page'] ?? 1);
            $limit = (int)($request->getQueryParams()['limit'] ?? 20);
            $result = $this->paginate('events', $page, $limit);
            
            // Enrich events with registered users
            $enrichedData = [];
            foreach ($result['data'] as $event) {
                $registrations = $this->db->all(
                    "SELECT DISTINCT member_id FROM event_registrations WHERE event_id = ?",
                    [$event['id']]
                );
                $registeredUserIds = array_filter(array_map(function($reg) {
                    return $reg['member_id'];
                }, $registrations));
                
                $event['registeredUsers'] = $registeredUserIds;
                $enrichedData[] = $event;
            }
            
            return $this->jsonResponse([
                'status' => 'success',
                'data' => $enrichedData,
                'pagination' => $result['pagination']
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch events: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getOne(Request $request, Response $response, array $args): Response
    {
        try {
            $event = $this->db->first("SELECT * FROM events WHERE id = ?", [$args['id']]);
            
            if (!$event) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Event not found'
                ], 404);
            }

            // Get registeredUsers
            $registrations = $this->db->all(
                "SELECT DISTINCT member_id FROM event_registrations WHERE event_id = ?",
                [$event['id']]
            );
            $registeredUserIds = array_filter(array_map(function($reg) {
                return $reg['member_id'];
            }, $registrations));
            
            $event['registeredUsers'] = $registeredUserIds;

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $event
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch event: ' . $e->getMessage()
            ], 500);
        }
    }

    public function create(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            $required = ['title', 'date'];
            $errors = $this->validateRequired($data, $required);
            
            if (!empty($errors)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $errors
                ], 400);
            }

            $eventData = [
                'title' => $this->sanitizeString($data['title']),
                'description' => isset($data['description']) ? $this->sanitizeString($data['description']) : null,
                'date' => $data['date'],
                'time' => isset($data['time']) ? $data['time'] : null,
                'location' => isset($data['location']) ? $this->sanitizeString($data['location']) : 'A3313 Rd 3935, Mtubatuba, South Africa',
                'type' => isset($data['type']) ? $this->sanitizeString($data['type']) : null,
                'category' => isset($data['category']) ? $this->sanitizeString($data['category']) : null,
                'speaker' => isset($data['speaker']) ? $this->sanitizeString($data['speaker']) : null,
                'max_attendees' => isset($data['max_attendees']) ? (int)$data['max_attendees'] : null,
                'registration_required' => isset($data['registrationRequired']) ? (bool)$data['registrationRequired'] : 0,
                'image_url' => isset($data['image_url']) ? $this->sanitizeString($data['image_url']) : null,
                'is_published' => isset($data['is_published']) ? (bool)$data['is_published'] : 1
            ];

            $eventId = $this->db->insert('events', $eventData);
            $event = $this->db->first("SELECT * FROM events WHERE id = ?", [$eventId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Event created successfully',
                'data' => $event
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to create event: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            $eventId = $args['id'];
            
            $allowedFields = [
                'title', 'description', 'date', 'time', 'location', 'type',
                'category', 'speaker', 'max_attendees', 'registrationRequired',
                'image_url', 'is_published'
            ];
            
            $updateData = [];
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $key = $field;
                    if ($field === 'registrationRequired') {
                        $key = 'registration_required';
                        $updateData[$key] = (bool)$data[$field];
                    } else {
                        $updateData[$field] = is_string($data[$field]) ? $this->sanitizeString($data[$field]) : $data[$field];
                    }
                }
            }

            if (empty($updateData)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'No data to update'
                ], 400);
            }

            $setClause = implode(', ', array_map(fn($key) => "$key = ?", array_keys($updateData)));
            $this->db->query(
                "UPDATE events SET $setClause, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                array_merge(array_values($updateData), [$eventId])
            );

            $event = $this->db->first("SELECT * FROM events WHERE id = ?", [$eventId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Event updated successfully',
                'data' => $event
            ]);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update event: ' . $e->getMessage()
            ], 500);
        }
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        try {
            $eventId = $args['id'];
            $deleted = $this->db->delete('events', 'id = ?', [$eventId]);
            
            if (!$deleted) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Event not found'
                ], 404);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Event deleted successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to delete event: ' . $e->getMessage()
            ], 500);
        }
    }

    public function register(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = $this->getUserId($request);
            $eventId = $args['id'];
            $data = json_decode($request->getBody()->getContents(), true);
            
            $memberId = null;
            if ($userId) {
                $member = $this->db->first("SELECT id FROM members WHERE user_id = ?", [$userId]);
                if ($member) {
                    $memberId = $member['id'];
                }
            }

            // Check if already registered
            if ($memberId) {
                $existing = $this->db->first(
                    "SELECT id FROM event_registrations WHERE event_id = ? AND member_id = ?",
                    [$eventId, $memberId]
                );
                if ($existing) {
                    return $this->jsonResponse([
                        'status' => 'success',
                        'message' => 'Already registered for this event',
                        'data' => ['registration_id' => $existing['id']]
                    ], 200);
                }
            }

            $registrationData = [
                'event_id' => $eventId,
                'member_id' => $memberId,
                'guest_name' => isset($data['guest_name']) ? $this->sanitizeString($data['guest_name']) : null,
                'guest_email' => isset($data['guest_email']) ? filter_var($data['guest_email'], FILTER_SANITIZE_EMAIL) : null,
                'guest_phone' => isset($data['guest_phone']) ? $this->sanitizeString($data['guest_phone']) : null,
                'notes' => isset($data['notes']) ? $this->sanitizeString($data['notes']) : null
            ];

            $regId = $this->db->insert('event_registrations', $registrationData);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Registration successful',
                'data' => ['registration_id' => $regId]
            ], 201);

        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Registration failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getRegistrations(Request $request, Response $response, array $args): Response
    {
        try {
            $eventId = $args['id'];
            $sql = "SELECT er.*, m.first_name, m.last_name, m.email 
                    FROM event_registrations er 
                    LEFT JOIN members m ON er.member_id = m.id 
                    WHERE er.event_id = ? 
                    ORDER BY er.registered_at DESC";
            $registrations = $this->db->all($sql, [$eventId]);

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $registrations
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch registrations: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getStats(Request $request, Response $response): Response
    {
        try {
            $stats = [
                'total_events' => $this->db->first("SELECT COUNT(*) as count FROM events")['count'],
                'upcoming_events' => $this->db->first("SELECT COUNT(*) as count FROM events WHERE date >= CURRENT_DATE")['count'],
                'past_events' => $this->db->first("SELECT COUNT(*) as count FROM events WHERE date < CURRENT_DATE")['count'],
                'total_registrations' => $this->db->first("SELECT COUNT(*) as count FROM event_registrations")['count'],
                'events_by_type' => $this->db->all("SELECT type, COUNT(*) as count FROM events WHERE type IS NOT NULL GROUP BY type")
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
}


