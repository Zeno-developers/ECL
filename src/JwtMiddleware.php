<?php

namespace App\Middleware;

use App\Services\JwtService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Psr7\Factory\ResponseFactory;

class JwtMiddleware
{
    private $jwtService;
    private $responseFactory;

    public function __construct()
    {
        $this->jwtService = new JwtService();
        $this->responseFactory = new ResponseFactory();
    }

    public function __invoke(Request $request, $handler)
    {
        $authHeader = $request->getHeaderLine('Authorization');
        if (!$authHeader) {
            $serverParams = $request->getServerParams();
            $authHeader = $serverParams['HTTP_AUTHORIZATION']
                ?? $serverParams['REDIRECT_HTTP_AUTHORIZATION']
                ?? $serverParams['Authorization']
                ?? '';
        }

        if (empty($authHeader) || !preg_match('/Bearer\s+(.*)/', $authHeader, $matches)) {
            return $this->jsonResponse(['error' => 'Unauthorized', 'message' => 'Missing or invalid authorization header'], 401);
        }

        $token = $matches[1];

        try {
            $decoded = $this->jwtService->decode($token);
            
            if (!$decoded || !isset($decoded->sub)) {
                return $this->jsonResponse(['error' => 'Unauthorized', 'message' => 'Invalid token'], 401);
            }

            // Add user to request attributes
            $request = $request->withAttribute('user', $decoded);
            $request = $request->withAttribute('user_id', $decoded->sub);

            return $handler->handle($request);

        } catch (\Exception $e) {
            return $this->jsonResponse(['error' => 'Unauthorized', 'message' => $e->getMessage()], 401);
        }
    }

    private function jsonResponse(array $data, int $statusCode): Response
    {
        $response = $this->responseFactory->createResponse($statusCode);
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json');
    }
}
