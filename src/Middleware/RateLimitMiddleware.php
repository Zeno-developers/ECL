<?php

namespace App\Middleware;

use App\Database;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Psr7\Factory\ResponseFactory;

class RateLimitMiddleware
{
    private $responseFactory;
    private $db = null;
    private $maxRequests;
    private $window;

    public function __construct()
    {
        $this->responseFactory = new ResponseFactory();
        $this->maxRequests = (int)(getenv('RATE_LIMIT_MAX') ?: 100);
        $this->window = (int)(getenv('RATE_LIMIT_WINDOW') ?: 60);
    }

    public function __invoke(Request $request, $handler)
    {
        $ip = $request->getServerParams()['REMOTE_ADDR'] ?? 'unknown';
        $userId = $request->getAttribute('user_id') ?? null;
        $identifier = $userId ?: $ip;
        
        $now = time();
        $windowStartTime = $now - $this->window;
        $windowStart = date('Y-m-d H:i:s', $windowStartTime);

        // Clean old entries
        $this->cleanOldEntries($windowStart);

        // Check current request count
        $count = $this->getRequestCount($identifier, $windowStart);

        if ($count >= $this->maxRequests) {
            $response = $this->responseFactory->createResponse(429);
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Too many requests. Please try again later.',
                'error' => [
                    'type' => 'rate_limit_exceeded',
                    'retry_after' => $this->getRetryAfter($identifier, $windowStart)
                ]
            ]));
            return $response->withHeader('Content-Type', 'application/json')
                ->withHeader('X-RateLimit-Limit', (string)$this->maxRequests)
                ->withHeader('X-RateLimit-Remaining', '0')
                ->withHeader('Retry-After', (string)$this->getRetryAfter($identifier, $windowStart));
        }

        // Record this request
        $this->recordRequest($identifier);

        // Add rate limit headers
        $remaining = $this->maxRequests - $count - 1;
        $response = $handler->handle($request);
        
        return $response
            ->withHeader('X-RateLimit-Limit', (string)$this->maxRequests)
            ->withHeader('X-RateLimit-Remaining', (string)max(0, $remaining))
            ->withHeader('X-RateLimit-Reset', (string)($windowStartTime + $this->window));
    }

    private function cleanOldEntries(string $windowStart): void
    {
        $db = $this->getDatabase();
        if (!$db) {
            return;
        }
        try {
            $db->query(
                "DELETE FROM rate_limits WHERE request_time < ?",
                [$windowStart]
            );
        } catch (\Exception $e) {
            // Table might not exist, ignore
        }
    }

    private function getRequestCount(string $identifier, string $windowStart): int
    {
        $db = $this->getDatabase();
        if (!$db) {
            return 0;
        }
        try {
            $result = $db->first(
                "SELECT COUNT(*) as count FROM rate_limits WHERE identifier = ? AND request_time >= ?",
                [$identifier, $windowStart]
            );
            return (int)($result['count'] ?? 0);
        } catch (\Exception $e) {
            // Table might not exist, return 0
            return 0;
        }
    }

    private function recordRequest(string $identifier): void
    {
        $db = $this->getDatabase();
        if (!$db) {
            return;
        }
        try {
            $db->query(
                "INSERT INTO rate_limits (identifier, request_time) VALUES (?, ?)",
                [$identifier, date('Y-m-d H:i:s')]
            );
        } catch (\Exception $e) {
            // Table might not exist, ignore
        }
    }

    private function getRetryAfter(string $identifier, string $windowStart): int
    {
        $db = $this->getDatabase();
        if (!$db) {
            return $this->window;
        }
        try {
            $oldest = $db->first(
                "SELECT MIN(request_time) as oldest FROM rate_limits WHERE identifier = ? AND request_time >= ?",
                [$identifier, $windowStart]
            );
            if ($oldest && $oldest['oldest']) {
                $oldestTime = strtotime($oldest['oldest']);
                $retryAfter = $this->window - (time() - $oldestTime);
                return max(1, $retryAfter);
            }
        } catch (\Exception $e) {
            // Table might not exist
        }
        return $this->window;
    }

    private function getDatabase(): ?Database
    {
        if ($this->db !== null) {
            return $this->db;
        }

        try {
            $this->db = Database::getInstance();
            return $this->db;
        } catch (\Throwable $e) {
            // Fail open if the database is temporarily unavailable.
            return null;
        }
    }
}
