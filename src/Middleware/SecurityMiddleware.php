<?php

namespace App\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Psr7\Factory\ResponseFactory;

class SecurityMiddleware
{
    private $responseFactory;

    public function __construct()
    {
        $this->responseFactory = new ResponseFactory();
    }

    public function __invoke(Request $request, $handler)
    {
        // Get allowed origins from environment
        $allowedOrigins = getenv('APP_ALLOWED_ORIGINS') ?: 'https://elc.zenolaunch.co.za,https://ecl.zenolaunch.co.za,https://ecl.api.zenolaunch.co.za,https://elchurch.site,https://www.elchurch.site,https://api.elchurch.site,http://localhost:3000,http://127.0.0.1:3000';
        $origins = array_map('trim', explode(',', $allowedOrigins));
        
        // Get the request origin
        $origin = $request->getHeaderLine('Origin') ?: $request->getHeaderLine('Referer');
        
        // Check if origin is allowed
        $allowedOrigin = $origins[0] ?? 'https://elchurch.site';
        if ($origin) {
            foreach ($origins as $allowed) {
                if ($origin === $allowed || $origin === str_replace('https://', 'http://', $allowed)) {
                    $allowedOrigin = $origin;
                    break;
                }
            }
        }
        
        // Add security headers
        $response = $handler->handle($request);
        
        return $response
            ->withHeader('X-Content-Type-Options', 'nosniff')
            ->withHeader('X-Frame-Options', 'DENY')
            ->withHeader('X-XSS-Protection', '1; mode=block')
            ->withHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->withHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
            ->withHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://elc.zenolaunch.co.za https://ecl.zenolaunch.co.za https://ecl.api.zenolaunch.co.za wss://ecl.api.zenolaunch.co.za https://elchurch.site https://www.elchurch.site https://api.elchurch.site wss://api.elchurch.site http://localhost:* https://localhost:* ws://localhost:*")
            ->withHeader('Access-Control-Allow-Origin', $allowedOrigin)
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token')
            ->withHeader('Access-Control-Expose-Headers', 'Authorization, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset')
            ->withHeader('Access-Control-Max-Age', '86400')
            ->withHeader('Access-Control-Allow-Credentials', 'true');
    }
}
