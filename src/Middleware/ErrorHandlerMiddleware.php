<?php

namespace App\Middleware;

use App\Services\LoggerService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Psr7\Factory\ResponseFactory;
use Throwable;

class ErrorHandlerMiddleware
{
    private $responseFactory;
    private $logger;

    public function __construct()
    {
        $this->responseFactory = new ResponseFactory();
        $this->logger = new LoggerService();
    }

    public function __invoke(Request $request, $handler)
    {
        try {
            $response = $handler->handle($request);
            return $response;
        } catch (Throwable $e) {
            return $this->handleException($e, $request);
        }
    }

    private function handleException(Throwable $e, Request $request): Response
    {
        $statusCode = 500;
        $errorType = 'server_error';
        $message = 'An unexpected error occurred';
        $details = null;

        // Log the error
        $this->logger->error($e->getMessage(), [
            'exception' => $e,
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
            'url' => (string)$request->getUri(),
            'method' => $request->getMethod(),
            'ip' => $request->getServerParams()['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $request->getHeaderLine('User-Agent')
        ]);

        // Determine status code and message based on exception type
        if ($e instanceof \InvalidArgumentException || $e instanceof \DomainException) {
            $statusCode = 400;
            $errorType = 'bad_request';
            $message = $e->getMessage();
        } elseif ($e instanceof \Slim\Exception\HttpNotFoundException) {
            $statusCode = 404;
            $errorType = 'not_found';
            $message = 'Resource not found';
        } elseif ($e instanceof \Slim\Exception\HttpMethodNotAllowedException) {
            $statusCode = 405;
            $errorType = 'method_not_allowed';
            $message = 'Method not allowed';
        } elseif ($e instanceof \Slim\Exception\HttpBadRequestException) {
            $statusCode = 400;
            $errorType = 'bad_request';
            $message = $e->getMessage() ?: 'Bad request';
        } elseif ($e instanceof \Slim\Exception\HttpForbiddenException) {
            $statusCode = 403;
            $errorType = 'forbidden';
            $message = 'Forbidden';
        } elseif ($e instanceof \Slim\Exception\HttpConflictException) {
            $statusCode = 409;
            $errorType = 'conflict';
            $message = $e->getMessage() ?: 'Conflict';
        } elseif ($e instanceof \Slim\Exception\HttpUnprocessableEntityException) {
            $statusCode = 422;
            $errorType = 'unprocessable_entity';
            $message = $e->getMessage() ?: 'Unprocessable entity';
        } elseif ($e instanceof \PDOException) {
            $statusCode = 500;
            $errorType = 'database_error';
            $message = 'Database error occurred';
            $details = $this->isProduction() ? null : $e->getMessage();
        } elseif ($e instanceof \Exception) {
            $statusCode = 500;
            $errorType = 'server_error';
            $message = $e->getMessage();
        }

        $response = $this->responseFactory->createResponse($statusCode);
        $responseData = [
            'status' => 'error',
            'error' => [
                'type' => $errorType,
                'message' => $message,
                'code' => $statusCode
            ],
            'timestamp' => date('c'),
            'path' => (string)$request->getUri()
        ];

        if ($details && $this->isProduction() === false) {
            $responseData['error']['details'] = $details;
        }

        if ($this->isProduction() === false && $e->getTrace()) {
            $responseData['trace'] = $e->getTrace();
        }

        $response->getBody()->write(json_encode($responseData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json');
    }

    private function isProduction(): bool
    {
        return getenv('APP_ENV') === 'production';
    }
}
