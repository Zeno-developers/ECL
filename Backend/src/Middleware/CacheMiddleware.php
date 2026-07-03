<?php

namespace App\Middleware;

use App\Services\CacheService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Psr7\Factory\ResponseFactory;

class CacheMiddleware
{
    private $responseFactory;
    private $cache;
    private $cacheTTL;

    public function __construct()
    {
        $this->responseFactory = new ResponseFactory();
        $this->cache = new CacheService();
        $this->cacheTTL = (int)(getenv('CACHE_TTL') ?: 300); // 5 minutes default
    }

    public function __invoke(Request $request, $handler)
    {
        // Only cache GET requests
        if ($request->getMethod() !== 'GET') {
            return $handler->handle($request);
        }

        $path = $request->getUri()->getPath();
        $queryParams = $request->getQueryParams();
        ksort($queryParams);
        $queryString = http_build_query($queryParams);
        
        $cacheKey = 'cache_' . md5($path . ($queryString ? '?' . $queryString : ''));

        // Check if cached response exists
        $cached = $this->cache->get($cacheKey);
        if ($cached !== null) {
            $cachedData = json_decode($cached, true);
            if ($cachedData !== null) {
                $response = $this->responseFactory->createResponse(200);
                $response->getBody()->write($cached);
                return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withHeader('X-Cache', 'HIT')
                    ->withHeader('Cache-Control', 'public, max-age=' . $this->cacheTTL);
            }
        }

        // Process request
        $response = $handler->handle($request);

        // Cache successful responses with 200 status
        if ($response->getStatusCode() === 200) {
            $body = (string)$response->getBody();
            $this->cache->set($cacheKey, $body, $this->cacheTTL);
            
            // Add cache miss header
            $response = $response->withHeader('X-Cache', 'MISS');
        }

        return $response->withHeader('Cache-Control', 'public, max-age=' . $this->cacheTTL);
    }
}
