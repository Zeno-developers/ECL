<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Exception;

class CareersController extends BaseController
{
    private function ensureTable(): void
    {
        if ($this->db->getDriver() === 'sqlite') {
            $this->db->query("CREATE TABLE IF NOT EXISTS career_openings (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                department TEXT    NOT NULL,
                title      TEXT    NOT NULL,
                is_active  INTEGER NOT NULL DEFAULT 1,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
            $this->db->query("CREATE TABLE IF NOT EXISTS career_applications (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                opening_id INTEGER,
                department TEXT    NOT NULL,
                position   TEXT    NOT NULL,
                full_name  TEXT    NOT NULL,
                email      TEXT    NOT NULL,
                phone      TEXT,
                message    TEXT,
                status     TEXT    NOT NULL DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
        } else {
            $this->db->query("CREATE TABLE IF NOT EXISTS career_openings (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                department VARCHAR(120) NOT NULL,
                title      VARCHAR(120) NOT NULL,
                is_active  TINYINT(1)  NOT NULL DEFAULT 1,
                sort_order INT         NOT NULL DEFAULT 0,
                created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )");
            $this->db->query("CREATE TABLE IF NOT EXISTS career_applications (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                opening_id INT,
                department VARCHAR(120) NOT NULL,
                position   VARCHAR(120) NOT NULL,
                full_name  VARCHAR(120) NOT NULL,
                email      VARCHAR(180) NOT NULL,
                phone      VARCHAR(30),
                message    TEXT,
                status     VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
        }
    }

    // ─── Public ───────────────────────────────────────────────────────────────

    /** GET /api/careers — returns active openings grouped by department */
    public function listPublic(Request $request, Response $response): Response
    {
        try {
            $this->ensureTable();
            $rows = $this->db->all(
                "SELECT id, department, title, sort_order
                 FROM career_openings
                 WHERE is_active = 1
                 ORDER BY department ASC, sort_order ASC, id ASC"
            );

            // Group by department
            $grouped = [];
            foreach ($rows as $row) {
                $dept = $row['department'];
                if (!isset($grouped[$dept])) {
                    $grouped[$dept] = [];
                }
                $grouped[$dept][] = ['id' => (int)$row['id'], 'title' => $row['title']];
            }

            return $this->jsonResponse(['status' => 'success', 'data' => $grouped]);
        } catch (Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /** GET /api/admin/careers — returns all openings (active + inactive) */
    public function listAll(Request $request, Response $response): Response
    {
        try {
            $this->ensureTable();
            $rows = $this->db->all(
                "SELECT id, department, title, is_active, sort_order, created_at
                 FROM career_openings
                 ORDER BY department ASC, sort_order ASC, id ASC"
            );

            foreach ($rows as &$row) {
                $row['id']        = (int)$row['id'];
                $row['is_active'] = (bool)$row['is_active'];
                $row['sort_order']= (int)$row['sort_order'];
            }
            unset($row);

            return $this->jsonResponse(['status' => 'success', 'data' => $rows]);
        } catch (Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /** POST /api/admin/careers — create an opening */
    public function create(Request $request, Response $response): Response
    {
        try {
            $this->ensureTable();
            $body = $this->parseJsonBody($request);

            $department = trim($body['department'] ?? '');
            $title      = trim($body['title'] ?? '');
            if (!$department || !$title) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'department and title are required'], 400);
            }

            $sortOrder = (int)($body['sort_order'] ?? 0);
            $isActive  = isset($body['is_active']) ? (int)(bool)$body['is_active'] : 1;

            $newId = $this->db->insert('career_openings', [
                'department' => $department,
                'title'      => $title,
                'is_active'  => $isActive,
                'sort_order' => $sortOrder,
            ]);

            return $this->jsonResponse([
                'status' => 'success',
                'data'   => ['id' => $newId, 'department' => $department, 'title' => $title, 'is_active' => (bool)$isActive, 'sort_order' => $sortOrder],
            ], 201);
        } catch (Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /** PUT /api/admin/careers/{id} — update an opening */
    public function update(Request $request, Response $response, array $args): Response
    {
        try {
            $this->ensureTable();
            $id   = (int)($args['id'] ?? 0);
            $body = $this->parseJsonBody($request);

            $existing = $this->db->first("SELECT id FROM career_openings WHERE id = ?", [$id]);
            if (!$existing) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Not found'], 404);
            }

            $fields = [];
            if (isset($body['department'])) $fields['department'] = trim($body['department']);
            if (isset($body['title']))      $fields['title']      = trim($body['title']);
            if (isset($body['is_active']))  $fields['is_active']  = (int)(bool)$body['is_active'];
            if (isset($body['sort_order'])) $fields['sort_order'] = (int)$body['sort_order'];

            if (empty($fields)) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'No fields to update'], 400);
            }

            $fields['updated_at'] = date('Y-m-d H:i:s');
            $this->db->update('career_openings', $fields, 'id = ?', [$id]);

            $row = $this->db->first("SELECT id, department, title, is_active, sort_order FROM career_openings WHERE id = ?", [$id]);
            $row['id']        = (int)$row['id'];
            $row['is_active'] = (bool)$row['is_active'];

            return $this->jsonResponse(['status' => 'success', 'data' => $row]);
        } catch (Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /** DELETE /api/admin/careers/{id} */
    public function delete(Request $request, Response $response, array $args): Response
    {
        try {
            $this->ensureTable();
            $id = (int)($args['id'] ?? 0);
            $this->db->delete('career_openings', 'id = ?', [$id]);
            return $this->jsonResponse(['status' => 'success']);
        } catch (Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // ─── Applications ─────────────────────────────────────────────────────────

    /** POST /api/careers/apply — public, no auth required */
    public function apply(Request $request, Response $response): Response
    {
        try {
            $this->ensureTable();
            $body = $this->parseJsonBody($request);

            $fullName  = trim($body['full_name'] ?? '');
            $email     = trim($body['email'] ?? '');
            $position  = trim($body['position'] ?? '');
            $department= trim($body['department'] ?? '');

            if (!$fullName || !$email || !$position || !$department) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'full_name, email, position, and department are required'], 400);
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Invalid email address'], 400);
            }

            $openingId = !empty($body['opening_id']) ? (int)$body['opening_id'] : null;
            $phone     = trim($body['phone'] ?? '') ?: null;
            $message   = trim($body['message'] ?? '') ?: null;

            $this->db->insert('career_applications', [
                'opening_id' => $openingId,
                'department' => $department,
                'position'   => $position,
                'full_name'  => $fullName,
                'email'      => $email,
                'phone'      => $phone,
                'message'    => $message,
                'status'     => 'pending',
            ]);

            return $this->jsonResponse(['status' => 'success', 'message' => 'Application received'], 201);
        } catch (Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /** GET /api/admin/careers/applications — admin view of all applications */
    public function listApplications(Request $request, Response $response): Response
    {
        try {
            $this->ensureTable();
            $params = $request->getQueryParams();
            $status = $params['status'] ?? null;

            $sql    = "SELECT id, opening_id, department, position, full_name, email, phone, message, status, created_at
                       FROM career_applications";
            $args   = [];

            if ($status && in_array($status, ['pending', 'reviewed', 'accepted', 'rejected'])) {
                $sql  .= " WHERE status = ?";
                $args[] = $status;
            }

            $sql .= " ORDER BY created_at DESC";
            $rows = $this->db->all($sql, $args);

            foreach ($rows as &$row) {
                $row['id'] = (int)$row['id'];
            }
            unset($row);

            return $this->jsonResponse(['status' => 'success', 'data' => $rows]);
        } catch (Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /** PUT /api/admin/careers/applications/{id} — update status */
    public function updateApplicationStatus(Request $request, Response $response, array $args): Response
    {
        try {
            $this->ensureTable();
            $id     = (int)($args['id'] ?? 0);
            $body   = $this->parseJsonBody($request);
            $status = $body['status'] ?? '';

            if (!in_array($status, ['pending', 'reviewed', 'accepted', 'rejected'])) {
                return $this->jsonResponse(['status' => 'error', 'message' => 'Invalid status'], 400);
            }

            $this->db->update('career_applications', ['status' => $status], 'id = ?', [$id]);
            return $this->jsonResponse(['status' => 'success']);
        } catch (Exception $e) {
            return $this->jsonResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
