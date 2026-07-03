<?php

namespace App\Middleware;

use App\Database;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Slim\Psr7\Response;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtMiddleware
{
    public function __invoke(Request $request, RequestHandler $handler)
    {
        $authHeader = $request->getHeaderLine('Authorization');
        if (!$authHeader) {
            $serverParams = $request->getServerParams();
            $authHeader = $serverParams['HTTP_AUTHORIZATION']
                ?? $serverParams['REDIRECT_HTTP_AUTHORIZATION']
                ?? $serverParams['Authorization']
                ?? '';
        }
        
        if (!$authHeader) {
            $response = new Response();
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Authorization header required',
                'code' => 401
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
        }
        
        $token = preg_replace('/^Bearer\s+/i', '', trim($authHeader));
        
        if (!$token) {
            $response = new Response();
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Token not provided',
                'code' => 401
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
        }
        
        try {
            $decoded = JWT::decode($token, new Key(JWT_SECRET, 'HS256'));
            $db = Database::getInstance();
            $userId = (int)($decoded->sub ?? 0);
            $liveUser = $userId > 0
                ? $db->first("SELECT id, email, first_name, last_name, role, zone_id, cell_id, is_active FROM users WHERE id = ?", [$userId])
                : null;

            if (!$liveUser || !(int)($liveUser['is_active'] ?? 0)) {
                $response = new Response();
                $response->getBody()->write(json_encode([
                    'status' => 'error',
                    'message' => 'User account is inactive or unavailable',
                    'code' => 401
                ]));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
            }

            if ($liveUser) {
                $decoded->data = $decoded->data ?? new \stdClass();
                $decoded->data->email = $liveUser['email'] ?? ($decoded->data->email ?? null);
                $decoded->data->role = $liveUser['role'] ?? ($decoded->data->role ?? null);
                $decoded->data->name = trim(($liveUser['first_name'] ?? '') . ' ' . ($liveUser['last_name'] ?? ''));
                $decoded->data->zone_id = $liveUser['zone_id'] ?? null;
                $decoded->data->cell_id = $liveUser['cell_id'] ?? null;
                $decoded->data->is_active = (int)($liveUser['is_active'] ?? 0);
            }

            $role = $decoded->data->role ?? null;
            $request = $request->withAttribute('user', $decoded);
            $request = $request->withAttribute('user_id', $decoded->sub ?? null);
            $request = $request->withAttribute('userId', $decoded->sub ?? null);
            $request = $request->withAttribute('role', $role);
            $request = $request->withAttribute('userRole', $role);
            return $handler->handle($request);
        } catch (\Exception $e) {
            $response = new Response();
            $response->getBody()->write(json_encode([
                'status' => 'error',
                'message' => 'Invalid or expired token',
                'code' => 401
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
        }
    }
}
