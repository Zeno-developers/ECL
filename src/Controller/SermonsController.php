<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use Exception;

class SermonsController extends BaseController
{
    private function normalizeFileId($value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (int)$value;
    }

    private function buildSermonPayload(array $data, ?int $actorId = null, bool $isUpdate = false): array
    {
        $status = isset($data['status']) ? strtolower((string)$data['status']) : null;
        $published = array_key_exists('published', $data) ? (bool)$data['published'] : null;

        if ($status === null && $published !== null) {
            $status = $published ? 'published' : 'draft';
        }

        if ($status !== null && !in_array($status, ['draft', 'published'], true)) {
            $status = 'draft';
        }

        $resolvedDate = $data['date'] ?? $data['planned_date'] ?? date('Y-m-d');
        $resolvedPublished = $published;
        if ($resolvedPublished === null && $status !== null) {
            $resolvedPublished = $status === 'published';
        }

        if ($resolvedPublished === null) {
            $resolvedPublished = false;
        }

        $payload = [];
        $stringFields = [
            'title',
            'speaker',
            'description',
            'series',
            'scripture',
            'outline',
            'notes',
            'video_url',
            'audio_url',
            'thumbnail_url',
        ];

        foreach ($stringFields as $field) {
            if (array_key_exists($field, $data)) {
                $value = $data[$field];
                $payload[$field] = ($value === null || trim((string)$value) === '')
                    ? null
                    : $this->sanitizeString((string)$value);
            }
        }

        if (!$isUpdate || array_key_exists('date', $data) || array_key_exists('planned_date', $data)) {
            $payload['date'] = $resolvedDate;
        }

        if (array_key_exists('planned_date', $data)) {
            $payload['planned_date'] = $data['planned_date'] ?: null;
        } elseif (!$isUpdate && isset($data['planned_date'])) {
            $payload['planned_date'] = $data['planned_date'];
        }

        if (array_key_exists('duration', $data)) {
            $payload['duration'] = $data['duration'] !== null && $data['duration'] !== ''
                ? (int)$data['duration']
                : null;
        }

        $availableColumns = $this->getTableColumns('sermons');
        foreach (['video_file_id', 'audio_file_id', 'thumbnail_file_id'] as $field) {
            if (!in_array($field, $availableColumns, true) || !array_key_exists($field, $data)) {
                continue;
            }

            $payload[$field] = $this->normalizeFileId($data[$field]);
        }

        if ($status !== null || !$isUpdate) {
            $payload['status'] = $status ?? 'draft';
        }

        if ($resolvedPublished !== null || !$isUpdate) {
            $payload['published'] = $resolvedPublished ? 1 : 0;
        }

        if (!$isUpdate && $actorId) {
            $payload['created_by'] = $actorId;
        }

        if (($payload['status'] ?? null) === 'published' || (($payload['published'] ?? 0) === 1)) {
            $payload['status'] = 'published';
            $payload['published'] = 1;
            if (!$isUpdate || array_key_exists('status', $data) || array_key_exists('published', $data)) {
                $payload['published_at'] = date('Y-m-d H:i:s');
            }
        } elseif (array_key_exists('status', $payload) && $payload['status'] === 'draft') {
            $payload['published'] = 0;
            if (!$isUpdate || array_key_exists('status', $data)) {
                $payload['published_at'] = null;
            }
        }

        return $payload;
    }

    public function getPublic(Request $request, Response $response): Response
    {
        try {
            $params = $request->getQueryParams();
            $columns = $this->getTableColumns('sermons');
            if (empty($columns)) {
                $columns = ['id', 'title', 'speaker', 'date', 'description', 'series', 'scripture'];
            }

            $preferredSelect = ['id', 'title', 'speaker', 'date', 'description', 'series', 'scripture', 'thumbnail_url', 'duration', 'video_url', 'audio_url', 'views'];
            $selectColumns = array_values(array_intersect($preferredSelect, $columns));
            if (empty($selectColumns)) {
                $selectColumns = ['id', 'title', 'speaker', 'date'];
            }

            $whereClause = '1 = 1';
            if (in_array('published', $columns, true)) {
                $whereClause .= ' AND published = 1';
            } elseif (in_array('is_published', $columns, true)) {
                $whereClause .= ' AND is_published = 1';
            } elseif (in_array('status', $columns, true)) {
                $whereClause .= " AND status = 'published'";
            }

            $sql = "SELECT " . implode(', ', $selectColumns) . " FROM sermons WHERE {$whereClause}";
            $queryParams = [];

            if (!empty($params['series'])) {
                $sql .= " AND series = ?";
                $queryParams[] = $this->sanitizeString($params['series']);
            }

            $sql .= " ORDER BY date DESC";
            $sermons = $this->db->all($sql, $queryParams);

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $sermons
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch sermons: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getPublicOne(Request $request, Response $response, array $args): Response
    {
        try {
            $columns = $this->getTableColumns('sermons');
            if (empty($columns)) {
                $columns = ['id', 'title', 'speaker', 'date', 'description', 'series', 'scripture'];
            }

            $preferredSelect = ['id', 'title', 'speaker', 'date', 'description', 'series', 'scripture', 'outline', 'notes', 'video_url', 'audio_url', 'thumbnail_url', 'duration', 'views'];
            $selectColumns = array_values(array_intersect($preferredSelect, $columns));
            if (empty($selectColumns)) {
                $selectColumns = ['id', 'title', 'speaker', 'date'];
            }

            $whereClause = 'id = ?';
            if (in_array('published', $columns, true)) {
                $whereClause .= ' AND published = 1';
            } elseif (in_array('is_published', $columns, true)) {
                $whereClause .= ' AND is_published = 1';
            } elseif (in_array('status', $columns, true)) {
                $whereClause .= " AND status = 'published'";
            }

            $sermon = $this->db->first(
                "SELECT " . implode(', ', $selectColumns) . " FROM sermons WHERE {$whereClause}",
                [$args['id']]
            );

            if (!$sermon) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Sermon not found'
                ], 404);
            }

            if (in_array('views', $columns, true)) {
                $this->db->query("UPDATE sermons SET views = COALESCE(views, 0) + 1 WHERE id = ?", [$args['id']]);
                $sermon['views'] = ($sermon['views'] ?? 0) + 1;
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $sermon
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch sermon: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getAll(Request $request, Response $response): Response
    {
        try {
            $params = $request->getQueryParams();
            $page = max(1, (int)($params['page'] ?? 1));
            $limit = max(1, (int)($params['limit'] ?? 20));
            $offset = ($page - 1) * $limit;

            $where = ['1 = 1'];
            $queryParams = [];

            if (!empty($params['status'])) {
                $where[] = 'status = ?';
                $queryParams[] = strtolower((string)$params['status']);
            }

            if (!empty($params['published_only'])) {
                $where[] = 'published = 1';
            }

            $whereSql = implode(' AND ', $where);
            $total = $this->db->first("SELECT COUNT(*) as total FROM sermons WHERE {$whereSql}", $queryParams)['total'] ?? 0;
            $sermons = $this->db->all(
                "SELECT * FROM sermons WHERE {$whereSql} ORDER BY COALESCE(planned_date, date) DESC, updated_at DESC LIMIT ? OFFSET ?",
                array_merge($queryParams, [$limit, $offset])
            );

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $sermons,
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
                'message' => 'Failed to fetch sermons: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getAllIncludingUnpublished(Request $request, Response $response): Response
    {
        try {
            $sermons = $this->db->all("SELECT * FROM sermons ORDER BY COALESCE(planned_date, date) DESC, updated_at DESC");

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $sermons
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch sermons: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getDrafts(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            $role = $request->getAttribute('role');

            $sql = "SELECT * FROM sermons WHERE status = 'draft'";
            $params = [];

            if (!in_array($role, ['admin', 'pastor', 'superadmin'], true) && $userId) {
                $sql .= " AND created_by = ?";
                $params[] = $userId;
            }

            $sql .= " ORDER BY updated_at DESC";
            $drafts = $this->db->all($sql, $params);

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $drafts
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch sermon drafts: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getOne(Request $request, Response $response, array $args): Response
    {
        try {
            $sermon = $this->db->first("SELECT * FROM sermons WHERE id = ?", [$args['id']]);

            if (!$sermon) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Sermon not found'
                ], 404);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $sermon
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch sermon: ' . $e->getMessage()
            ], 500);
        }
    }

    public function create(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true) ?: [];
            $userId = $this->getUserId($request);

            $isDraft = (($data['status'] ?? null) === 'draft') || (isset($data['published']) && !$data['published']);
            if (!$isDraft) {
                $required = ['title', 'speaker'];
                $errors = $this->validateRequired($data, $required);

                if (!empty($errors)) {
                    return $this->jsonResponse([
                        'status' => 'error',
                        'message' => 'Validation failed',
                        'errors' => $errors
                    ], 400);
                }
            }

            $sermonData = $this->buildSermonPayload($data, $userId, false);
            $sermonId = $this->db->insert('sermons', $sermonData);
            $sermon = $this->db->first("SELECT * FROM sermons WHERE id = ?", [$sermonId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => $isDraft ? 'Sermon draft saved successfully' : 'Sermon created successfully',
                'data' => $sermon
            ], 201);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to create sermon: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true) ?: [];
            $sermonId = (int)$args['id'];

            $existing = $this->db->first("SELECT * FROM sermons WHERE id = ?", [$sermonId]);
            if (!$existing) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Sermon not found'
                ], 404);
            }

            $updateData = $this->buildSermonPayload($data, null, true);
            if (empty($updateData)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'No data to update'
                ], 400);
            }

            $setClause = implode(', ', array_map(fn($key) => "{$key} = ?", array_keys($updateData)));
            $this->db->query(
                "UPDATE sermons SET {$setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                array_merge(array_values($updateData), [$sermonId])
            );

            $sermon = $this->db->first("SELECT * FROM sermons WHERE id = ?", [$sermonId]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => (($sermon['status'] ?? 'draft') === 'draft')
                    ? 'Sermon draft updated successfully'
                    : 'Sermon updated successfully',
                'data' => $sermon
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update sermon: ' . $e->getMessage()
            ], 500);
        }
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        try {
            $sermonId = $args['id'];
            $deleted = $this->db->delete('sermons', 'id = ?', [$sermonId]);

            if (!$deleted) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Sermon not found'
                ], 404);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Sermon deleted successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to delete sermon: ' . $e->getMessage()
            ], 500);
        }
    }

    public function publish(Request $request, Response $response, array $args): Response
    {
        try {
            $this->db->query(
                "UPDATE sermons SET published = 1, status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [$args['id']]
            );
            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Sermon published'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to publish sermon: ' . $e->getMessage()
            ], 500);
        }
    }

    public function unpublish(Request $request, Response $response, array $args): Response
    {
        try {
            $this->db->query(
                "UPDATE sermons SET published = 0, status = 'draft', published_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [$args['id']]
            );
            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Sermon unpublished'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to unpublish sermon: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getStats(Request $request, Response $response): Response
    {
        try {
            $stats = [
                'total_sermons' => $this->db->first("SELECT COUNT(*) as count FROM sermons")['count'],
                'published_sermons' => $this->db->first("SELECT COUNT(*) as count FROM sermons WHERE published = 1")['count'],
                'draft_sermons' => $this->db->first("SELECT COUNT(*) as count FROM sermons WHERE status = 'draft'")['count'],
                'total_views' => $this->db->first("SELECT SUM(views) as total FROM sermons")['total'] ?? 0,
                'by_series' => $this->db->all("SELECT series, COUNT(*) as count FROM sermons WHERE series IS NOT NULL GROUP BY series")
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

    public function getSeries(Request $request, Response $response): Response
    {
        try {
            $series = $this->db->all("SELECT series, COUNT(*) as sermon_count FROM sermons WHERE series IS NOT NULL GROUP BY series ORDER BY series");

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $series
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to get series: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getVideo(Request $request, Response $response, array $args): Response
    {
        return $this->jsonResponse([
            'status' => 'error',
            'message' => 'Video streaming not implemented'
        ], 501);
    }

    public function getAudio(Request $request, Response $response, array $args): Response
    {
        return $this->jsonResponse([
            'status' => 'error',
            'message' => 'Audio streaming not implemented'
        ], 501);
    }

    public function getThumbnail(Request $request, Response $response, array $args): Response
    {
        return $this->jsonResponse([
            'status' => 'error',
            'message' => 'Thumbnail serving not implemented'
        ], 501);
    }
}
