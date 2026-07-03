<?php

namespace App\Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use App\Database;
use Exception;

class SettingsController extends BaseController
{
    private function formatChurchAddress(array $churchInfo): string
    {
        $address = trim((string)($churchInfo['address'] ?? ''));
        $normalizedAddress = $this->normalizeChurchAddress($address);

        if ($normalizedAddress !== '' && mb_strlen($normalizedAddress) > 20) {
            return $normalizedAddress;
        }

        $parts = array_filter([
            $normalizedAddress,
            trim((string)($churchInfo['city'] ?? '')),
            trim((string)($churchInfo['province'] ?? '')),
            trim((string)($churchInfo['country'] ?? 'South Africa')),
        ], fn($value) => $value !== '');

        $fullAddress = implode(', ', $parts);
        return $fullAddress !== '' ? $fullAddress : 'A3313 Rd, Mtubatuba, South Africa';
    }

    private function normalizeChurchAddress(string $address): string
    {
        $address = trim($address);

        if ($address === '') {
            return '';
        }

        if (stripos($address, 'ezifisweni') !== false) {
            return 'A3313 Rd, Mtubatuba, South Africa';
        }

        return $address;
    }

    private function isPublicSettingKey(string $key): bool
    {
        $publicKeys = [
            'name',
            'churchName',
            'description',
            'pastorName',
            'mission',
            'vision',
            'address',
            'phone',
            'email',
            'website',
            'serviceTimes',
            'social_facebook',
            'social_instagram',
            'social_youtube',
            'social_twitter',
            'social_tiktok',
            'map_embed_url',
            'latitude',
            'longitude',
        ];

        if (in_array($key, $publicKeys, true)) {
            return true;
        }

        return strpos($key, 'home_') === 0;
    }

    public function getPublic(Request $request, Response $response): Response
    {
        try {
            $settings = $this->db->all("SELECT key_name, value FROM settings WHERE is_public = 1");
            $result = [];
            foreach ($settings as $setting) {
                $result[$setting['key_name']] = $setting['value'];
            }

            $churchInfo = $this->db->first("SELECT * FROM church_info LIMIT 1");
            if (is_array($churchInfo)) {
                $churchInfo['address'] = $this->formatChurchAddress($churchInfo);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => [
                    'settings' => $result,
                    'church_info' => $churchInfo
                ]
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch public settings: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getAll(Request $request, Response $response): Response
    {
        try {
            $settings = $this->db->all("SELECT * FROM settings ORDER BY key_name");
            
            return $this->jsonResponse([
                'status' => 'success',
                'data' => $settings
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch settings: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            if (!is_array($data) || empty($data)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'No settings provided'
                ], 400);
            }

            foreach ($data as $key => $value) {
                $isPublic = $this->isPublicSettingKey((string)$key) ? 1 : 0;
                $existing = $this->db->first("SELECT id FROM settings WHERE key_name = ?", [$key]);
                if ($existing) {
                    $this->db->update('settings', [
                        'value' => is_array($value) ? json_encode($value) : $value,
                        'is_public' => $isPublic
                    ], 'key_name = ?', [$key]);
                } else {
                    $this->db->insert('settings', [
                        'key_name' => $key,
                        'value' => is_array($value) ? json_encode($value) : $value,
                        'value_type' => is_array($value) ? 'json' : 'string',
                        'is_public' => $isPublic
                    ]);
                }
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Settings updated successfully'
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update settings: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getChurchInfo(Request $request, Response $response): Response
    {
        try {
            $churchInfo = $this->db->first("SELECT * FROM church_info LIMIT 1");
            if (is_array($churchInfo)) {
                $churchInfo['address'] = $this->formatChurchAddress($churchInfo);
            }
            
            if (!$churchInfo) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'Church info not found'
                ], 404);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'data' => $churchInfo
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to fetch church info: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateChurchInfo(Request $request, Response $response): Response
    {
        try {
            $data = json_decode($request->getBody()->getContents(), true);
            
            $allowedFields = [
                'name', 'tagline', 'address', 'city', 'province', 'country',
                'postal_code', 'phone', 'email', 'website', 'latitude', 'longitude',
                'service_times', 'about_us', 'mission', 'vision', 'logo_url',
                'social_facebook', 'social_twitter', 'social_instagram', 'social_youtube'
            ];
            
            $updateData = [];
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $updateData[$field] = is_string($data[$field]) ? $this->sanitizeString($data[$field]) : $data[$field];
                }
            }

            if (empty($updateData)) {
                return $this->jsonResponse([
                    'status' => 'error',
                    'message' => 'No data to update'
                ], 400);
            }

            $existing = $this->db->first("SELECT id FROM church_info");
            if ($existing) {
                $setClause = implode(', ', array_map(fn($key) => "$key = ?", array_keys($updateData)));
                $this->db->query(
                    "UPDATE church_info SET $setClause, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    array_merge(array_values($updateData), [$existing['id']])
                );
                $churchInfo = $this->db->first("SELECT * FROM church_info WHERE id = ?", [$existing['id']]);
            } else {
                $id = $this->db->insert('church_info', $updateData);
                $churchInfo = $this->db->first("SELECT * FROM church_info WHERE id = ?", [$id]);
            }

            return $this->jsonResponse([
                'status' => 'success',
                'message' => 'Church info updated successfully',
                'data' => $churchInfo
            ]);
        } catch (Exception $e) {
            return $this->jsonResponse([
                'status' => 'error',
                'message' => 'Failed to update church info: ' . $e->getMessage()
            ], 500);
        }
    }
}

