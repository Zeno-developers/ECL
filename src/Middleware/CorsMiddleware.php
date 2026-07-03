<?php

namespace App\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * CORS Middleware for Eternal Love Church API
 * 
 * Handles Cross-Origin Resource Sharing (CORS) requests
 * Allows frontend (elchurch.site) to communicate with backend (api.elchurch.site)
 * 
 * @package App\Middleware
 */
class CorsMiddleware implements MiddlewareInterface
{
    /**
     * Process a server request and return a response.
     *
     * @param Request $request
     * @param RequestHandlerInterface $handler
     * @return Response
     */
    public function process(Request $request, RequestHandlerInterface $handler): Response
    {
        // Get allowed origins from environment or use defaults
        $allowedOrigins = $this->getAllowedOrigins();
        
        // Get request origin
        $origin = $request->getHeaderLine('Origin');
        
        // Build response
        $response = $handler->handle($request);
        
        // Handle preflight OPTIONS requests
        if ($request->getMethod() === 'OPTIONS') {
            return $this->handlePreflight($request, $response, $origin, $allowedOrigins);
        }
        
        // Handle actual requests
        return $this->addCorsHeaders($response, $origin, $allowedOrigins);
    }
    
    /**
     * Get list of allowed origins from environment
     *
     * @return array
     */
    private function getAllowedOrigins(): array
    {
        $originsString = getenv('APP_ALLOWED_ORIGINS') ?: 'https://elc.zenolaunch.co.za,https://ecl.zenolaunch.co.za,https://ecl.api.zenolaunch.co.za,https://elchurch.site,https://www.elchurch.site,https://api.elchurch.site,http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174';
        
        return array_map('trim', explode(',', $originsString));
    }
    
    /**
     * Handle preflight (OPTIONS) requests
     *
     * @param Request $request
     * @param Response $response
     * @param string $origin
     * @param array $allowedOrigins
     * @return Response
     */
    private function handlePreflight(
        Request $request,
        Response $response,
        string $origin,
        array $allowedOrigins
    ): Response
    {
        // Verify origin is allowed
        if (!in_array($origin, $allowedOrigins, true)) {
            return $response->withStatus(403);
        }
        
        // Add CORS headers for preflight
        $response = $response
            ->withHeader('Access-Control-Allow-Origin', $origin)
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, Accept')
            ->withHeader('Access-Control-Max-Age', '86400')
            ->withHeader('Access-Control-Allow-Credentials', 'true');
        
        // Return 204 No Content for successful preflight
        return $response->withStatus(204);
    }
    
    /**
     * Add CORS headers to response
     *
     * @param Response $response
     * @param string $origin
     * @param array $allowedOrigins
     * @return Response
     */
    private function addCorsHeaders(
        Response $response,
        string $origin,
        array $allowedOrigins
    ): Response
    {
        // Verify origin is allowed
        if (!in_array($origin, $allowedOrigins, true)) {
            return $response;
        }
        
        // Add CORS headers
        return $response
            ->withHeader('Access-Control-Allow-Origin', $origin)
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, Accept')
            ->withHeader('Access-Control-Allow-Credentials', 'true')
            ->withHeader('Vary', 'Origin');
    }
}
