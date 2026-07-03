<?php

namespace App\Controller;

use Exception;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class DeveloperApiKeysController extends BaseController
{
    public function getAll(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            if (!$userId) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Unauthorized'
                ], 401);
            }

            $rows = $this->db->all(
                "SELECT id, key_name, api_key, is_active, last_used_at, created_at
                 FROM api_keys
                 WHERE user_id = ?
                 ORDER BY created_at DESC",
                [$userId]
            );

            $apiKeys = array_map(function ($row) {
                return [
                    '_id' => (string) $row['id'],
                    'id' => (int) $row['id'],
                    'name' => $row['key_name'],
                    'description' => null,
                    'pricingTier' => 'free',
                    'permissions' => ['read:members', 'read:events', 'read:sermons'],
                    'rateLimit' => 100,
                    'usage' => [
                        'monthlyRequests' => 0,
                        'totalRequests' => 0,
                        'lastUsed' => $row['last_used_at'],
                        'currentPeriodStart' => date('Y-m-01')
                    ],
                    'createdAt' => $row['created_at'],
                    'expiresAt' => null,
                    'isActive' => (bool) $row['is_active']
                ];
            }, $rows);

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'apiKeys' => $apiKeys
                ]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch API keys: ' . $e->getMessage()
            ], 500);
        }
    }

    public function create(Request $request, Response $response): Response
    {
        try {
            $userId = $this->getUserId($request);
            if (!$userId) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Unauthorized'
                ], 401);
            }

            $data = json_decode($request->getBody()->getContents(), true) ?? [];
            $keyName = isset($data['name']) && trim($data['name']) !== ''
                ? $this->sanitizeString($data['name'])
                : 'API Key ' . date('Y-m-d H:i');

            $apiKey = bin2hex(random_bytes(32));

            $id = $this->db->insert('api_keys', [
                'user_id' => $userId,
                'key_name' => $keyName,
                'api_key' => $apiKey,
                'is_active' => 1
            ]);

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'API key created successfully',
                'data' => [
                    'apiKey' => [
                        '_id' => (string) $id,
                        'id' => $id,
                        'name' => $keyName,
                        'key' => $apiKey,
                        'pricingTier' => $data['pricingTier'] ?? 'free',
                        'permissions' => ['read:members', 'read:events', 'read:sermons'],
                        'rateLimit' => 100,
                        'usage' => [
                            'monthlyRequests' => 0,
                            'totalRequests' => 0,
                            'lastUsed' => null,
                            'currentPeriodStart' => date('Y-m-01')
                        ],
                        'createdAt' => date('c'),
                        'expiresAt' => null,
                        'isActive' => true
                    ]
                ]
            ], 201);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to create API key: ' . $e->getMessage()
            ], 500);
        }
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = $this->getUserId($request);
            if (!$userId) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Unauthorized'
                ], 401);
            }

            $keyId = (int) ($args['id'] ?? 0);
            if ($keyId <= 0) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Invalid API key id'
                ], 400);
            }

            $deleted = $this->db->delete('api_keys', 'id = ? AND user_id = ?', [$keyId, $userId]);
            if (!$deleted) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'API key not found'
                ], 404);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'API key revoked successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to revoke API key: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getUsage(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = $this->getUserId($request);
            if (!$userId) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Unauthorized'
                ], 401);
            }

            $keyId = (int) ($args['id'] ?? 0);
            $apiKey = $this->db->first(
                "SELECT id, created_at FROM api_keys WHERE id = ? AND user_id = ?",
                [$keyId, $userId]
            );

            if (!$apiKey) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'API key not found'
                ], 404);
            }

            $daysSinceCreate = max(1, (int) floor((time() - strtotime($apiKey['created_at'])) / 86400));
            $current = min(1000, $daysSinceCreate * 8);
            $limit = 1000;

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'usage' => [
                        'current' => $current,
                        'limit' => $limit,
                        'estimatedCost' => 0,
                        'resetDate' => date('Y-m-t')
                    ]
                ]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch usage data: ' . $e->getMessage()
            ], 500);
        }
    }
}

