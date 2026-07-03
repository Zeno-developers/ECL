<?php

namespace App\Services;

use App\Database;
use Exception;

class CacheService
{
    private $db;
    private $defaultTTL;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->defaultTTL = (int)(getenv('CACHE_TTL') ?: 300);
    }

    /**
     * Get cached value
     */
    public function get(string $key): ?string
    {
        try {
            $result = $this->db->first(
                "SELECT value FROM cache WHERE cache_key = ? AND expires_at > CURRENT_TIMESTAMP",
                [$key]
            );
            
            if ($result) {
                return $result['value'];
            }
        } catch (\Exception $e) {
            // Cache table might not exist, return null
            error_log('Cache get error: ' . $e->getMessage());
        }
        
        return null;
    }

    /**
     * Set cached value
     */
    public function set(string $key, $value, int $ttl = null): bool
    {
        try {
            $ttl = $ttl ?? $this->defaultTTL;
            $expiresAt = date('Y-m-d H:i:s', time() + $ttl);
            
            // Delete existing cache entry
            $this->db->query("DELETE FROM cache WHERE cache_key = ?", [$key]);
            
            // Insert new cache entry
            $this->db->insert('cache', [
                'cache_key' => $key,
                'value' => is_string($value) ? $value : json_encode($value),
                'expires_at' => $expiresAt
            ]);
            
            return true;
        } catch (\Exception $e) {
            error_log('Cache set error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Delete cached value
     */
    public function delete(string $key): bool
    {
        try {
            $this->db->query("DELETE FROM cache WHERE cache_key = ?", [$key]);
            return true;
        } catch (\Exception $e) {
            error_log('Cache delete error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Clear all cache
     */
    public function clear(): bool
    {
        try {
            $this->db->query("DELETE FROM cache");
            return true;
        } catch (\Exception $e) {
            error_log('Cache clear error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Check if key exists
     */
    public function has(string $key): bool
    {
        return $this->get($key) !== null;
    }

    /**
     * Get multiple keys
     */
    public function getMultiple(array $keys): array
    {
        $results = [];
        foreach ($keys as $key) {
            $results[$key] = $this->get($key);
        }
        return $results;
    }

    /**
     * Set multiple values
     */
    public function setMultiple(array $items, int $ttl = null): bool
    {
        $success = true;
        foreach ($items as $key => $value) {
            if (!$this->set($key, $value, $ttl)) {
                $success = false;
            }
        }
        return $success;
    }

    /**
     * Delete multiple keys
     */
    public function deleteMultiple(array $keys): bool
    {
        $success = true;
        foreach ($keys as $key) {
            if (!$this->delete($key)) {
                $success = false;
            }
        }
        return $success;
    }

    /**
     * Increment value
     */
    public function increment(string $key, int $value = 1): int
    {
        try {
            $current = (int)$this->get($key);
            $newValue = $current + $value;
            $this->set($key, (string)$newValue);
            return $newValue;
        } catch (\Exception $e) {
            error_log('Cache increment error: ' . $e->getMessage());
            return 0;
        }
    }

    /**
     * Decrement value
     */
    public function decrement(string $key, int $value = 1): int
    {
        try {
            $current = (int)$this->get($key);
            $newValue = max(0, $current - $value);
            $this->set($key, (string)$newValue);
            return $newValue;
        } catch (\Exception $e) {
            error_log('Cache decrement error: ' . $e->getMessage());
            return 0;
        }
    }

    /**
     * Get cache stats
     */
    public function getStats(): array
    {
        try {
            $total = $this->db->first("SELECT COUNT(*) as count FROM cache")['count'] ?? 0;
            $expired = $this->db->first("SELECT COUNT(*) as count FROM cache WHERE expires_at <= CURRENT_TIMESTAMP")['count'] ?? 0;
            
            return [
                'total' => (int)$total,
                'expired' => (int)$expired,
                'active' => (int)($total - $expired)
            ];
        } catch (\Exception $e) {
            error_log('Cache stats error: ' . $e->getMessage());
            return [
                'total' => 0,
                'expired' => 0,
                'active' => 0
            ];
        }
    }

    /**
     * Clean expired cache entries
     */
    public function cleanExpired(): bool
    {
        try {
            $this->db->query("DELETE FROM cache WHERE expires_at <= CURRENT_TIMESTAMP");
            return true;
        } catch (\Exception $e) {
            error_log('Cache clean error: ' . $e->getMessage());
            return false;
        }
    }
}
