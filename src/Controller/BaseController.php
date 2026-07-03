<?php

namespace App\Controller;

use App\Database;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Psr7\Factory\ResponseFactory;

class BaseController
{
    protected $db;
    protected $responseFactory;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->responseFactory = new ResponseFactory();
    }

    protected function jsonResponse(array $data, int $statusCode = 200): Response
    {
        $response = $this->responseFactory->createResponse($statusCode);
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json');
    }

    protected function parseJsonBody(Request $request): array
    {
        // Try getParsedBody() first (set by Slim BodyParsingMiddleware if active)
        $parsed = $request->getParsedBody();
        if (!empty($parsed) && is_array($parsed)) {
            return $parsed;
        }
        // Read raw body; rewind stream first in case it was partially consumed
        $body = $request->getBody();
        if ($body->isSeekable()) {
            $body->rewind();
        }
        $raw = $body->getContents();
        return (array)(json_decode($raw, true) ?? []);
    }

    protected function validateRequired(array $data, array $required): array
    {
        $errors = [];
        foreach ($required as $field) {
            if (!array_key_exists($field, $data)) {
                $errors[] = "The $field field is required";
                continue;
            }

            $value = $data[$field];

            if (is_array($value)) {
                if (count($value) === 0) {
                    $errors[] = "The $field field is required";
                }
                continue;
            }

            if (is_string($value)) {
                if (trim($value) === '') {
                    $errors[] = "The $field field is required";
                }
                continue;
            }

            if ($value === null || $value === false || $value === '') {
                $errors[] = "The $field field is required";
            }
        }
        return $errors;
    }

    protected function sanitizeString(string $value): string
    {
        return htmlspecialchars(strip_tags(trim($value)), ENT_QUOTES, 'UTF-8');
    }

    protected function generateUuid(): string
    {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    protected function getUserId(Request $request): ?int
    {
        return $request->getAttribute('user_id');
    }

    protected function getUser(Request $request): ?object
    {
        return $request->getAttribute('user');
    }

    protected function paginate(string $table, int $page = 1, int $limit = 20, string $where = '', array $params = []): array
    {
        $offset = ($page - 1) * $limit;
        
        $whereClause = $where ? "WHERE $where" : '';
        
        $countSql = "SELECT COUNT(*) as total FROM $table $whereClause";
        $totalResult = $this->db->first($countSql, $params);
        $total = $totalResult['total'] ?? 0;
        
        $sql = "SELECT * FROM $table $whereClause ORDER BY created_at DESC LIMIT ? OFFSET ?";
        $data = $this->db->all($sql, array_merge($params, [$limit, $offset]));
        
        return [
            'data' => $data,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => ceil($total / $limit)
            ]
        ];
    }

    protected function getTableColumns(string $table): array
    {
        try {
            if ($this->db->getDriver() === 'sqlite') {
                $rows = $this->db->all("PRAGMA table_info($table)");
                return array_values(array_filter(array_map(fn($r) => $r['name'] ?? null, $rows)));
            }

            $rows = $this->db->all("SHOW COLUMNS FROM $table");
            return array_values(array_filter(array_map(fn($r) => $r['Field'] ?? null, $rows)));
        } catch (\Throwable $e) {
            return [];
        }
    }

    /**
     * Defer a callable to run after the HTTP response is sent.
     * Emails and WhatsApp sends should go through here so the user
     * never waits for slow SMTP or the WhatsApp Node service.
     */
    protected function deferSend(callable $fn): void
    {
        register_shutdown_function(static function() use ($fn) {
            ignore_user_abort(true);
            if (function_exists('fastcgi_finish_request')) {
                fastcgi_finish_request();
            }
            try {
                $fn();
            } catch (\Throwable $e) {
                error_log('[deferSend] ' . $e->getMessage());
            }
        });
    }

    protected function isOfflineFallbackMode(): bool
    {
        return method_exists($this->db, 'isOfflineFallbackMode') && $this->db->isOfflineFallbackMode();
    }

    protected function queueOfflineSyncOperation(string $type, array $payload): ?string
    {
        if (!method_exists($this->db, 'queueOfflineSyncOperation')) {
            return null;
        }

        return $this->db->queueOfflineSyncOperation($type, $payload);
    }

    protected function tableHasColumn(string $table, string $column): bool
    {
        $columns = $this->getTableColumns($table);
        return in_array($column, $columns, true);
    }

    protected function filterDataByExistingColumns(string $table, array $data): array
    {
        $columns = $this->getTableColumns($table);
        if (empty($columns)) {
            return $data;
        }

        return array_filter(
            $data,
            fn($_, $key) => in_array($key, $columns, true),
            ARRAY_FILTER_USE_BOTH
        );
    }

    protected function getUploadDirectories(): array
    {
        $candidates = [
            getenv('UPLOAD_PATH') ?: null,
            __DIR__ . '/../../uploads/',
            __DIR__ . '/../../public/uploads/',
        ];

        $directories = [];
        foreach ($candidates as $candidate) {
            if (!$candidate) {
                continue;
            }

            $normalized = rtrim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $candidate), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
            if (!in_array($normalized, $directories, true)) {
                $directories[] = $normalized;
            }
        }

        return $directories;
    }

    protected function getUploadDirectory(string $subdirectory = ''): string
    {
        $base = $this->getUploadDirectories()[0] ?? (__DIR__ . '/../../uploads/');
        $directory = rtrim($base, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;

        if ($subdirectory !== '') {
            $directory .= trim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $subdirectory), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
        }

        return $directory;
    }

    protected function resolveUploadFilePath(string $relativePath): ?string
    {
        $relativePath = ltrim(str_replace(['\\', '..'], ['/', ''], trim($relativePath)), '/');
        if ($relativePath === '') {
            return null;
        }

        foreach ($this->getUploadDirectories() as $baseDir) {
            $candidate = $baseDir . str_replace('/', DIRECTORY_SEPARATOR, $relativePath);
            $candidateReal = realpath($candidate);
            if ($candidateReal && is_file($candidateReal)) {
                return $candidateReal;
            }
        }

        return null;
    }
}

