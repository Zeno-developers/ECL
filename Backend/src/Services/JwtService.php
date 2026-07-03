<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;

class JwtService
{
    private $secret;
    private $algorithm;

    public function __construct()
    {
        $this->secret = JWT_SECRET;
        $this->algorithm = 'HS256';
    }

    public function generateToken(array $payload, int $expiration = null): string
    {
        $now = time();
        
        $tokenPayload = [
            'iat' => $now,
            'nbf' => $now,
            'exp' => $now + ($expiration ?? JWT_EXPIRATION),
            'sub' => $payload['user_id'] ?? $payload['id'],
            'data' => [
                'email' => $payload['email'] ?? null,
                'role' => $payload['role'] ?? 'member',
                'name' => trim((string)($payload['first_name'] ?? '') . ' ' . ($payload['last_name'] ?? ''))
            ]
        ];

        return JWT::encode($tokenPayload, $this->secret, $this->algorithm);
    }

    public function decode(string $token): object
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secret, $this->algorithm));
            return $decoded;
        } catch (\Firebase\JWT\ExpiredException $e) {
            throw new Exception('Token has expired');
        } catch (\Firebase\JWT\SignatureInvalidException $e) {
            throw new Exception('Invalid token signature');
        } catch (\Exception $e) {
            throw new Exception('Invalid token');
        }
    }

    public function refreshToken(string $token): string
    {
        try {
            $decoded = $this->decode($token);
            
            // Generate new token with same payload but new expiration
            $payload = [
                'user_id' => $decoded->sub,
                'email' => $decoded->data->email,
                'role' => $decoded->data->role,
                'first_name' => $decoded->data->name ? explode(' ', $decoded->data->name)[0] : '',
                'last_name' => $decoded->data->name ? implode(' ', array_slice(explode(' ', $decoded->data->name), 1)) : ''
            ];

            return $this->generateToken($payload);
        } catch (\Exception $e) {
            throw new Exception('Cannot refresh token: ' . $e->getMessage());
        }
    }

    public function generateRefreshToken(array $payload): string
    {
        return $this->generateToken($payload, JWT_REFRESH_EXPIRATION);
    }
}
