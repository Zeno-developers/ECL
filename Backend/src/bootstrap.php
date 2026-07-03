<?php

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/Environment.php';

use Slim\Factory\AppFactory;
use Slim\Middleware\RoutingMiddleware;
use App\Middleware\CorsMiddleware;
use App\Middleware\SecurityMiddleware;
use App\Middleware\ErrorHandlerMiddleware;
use App\Middleware\RateLimitMiddleware;
use App\Services\LoggerService;

// Load environment variables from the deployment-friendly filenames first.
$requestHost = strtolower($_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '');
$isLocalRequest = preg_match('/^(localhost|127\.0\.0\.1)(:\d+)?$/', $requestHost) === 1;
$environmentFiles = $isLocalRequest
    ? ['.env.local', '.env', '.env.production']
    : (str_contains($requestHost, 'api.elchurch.site')
        ? ['.env.production-api-subdomain', '.env.production', '.env']
        : ['.env.production', '.env.production-api-subdomain', '.env']);

load_project_environment(__DIR__ . '/..', $environmentFiles, true);

// Configuration constants
define('APP_NAME', getenv('APP_NAME') ?: 'Eternal Love Church API');
define('APP_ENV', getenv('APP_ENV') ?: 'development');
define('APP_DEBUG', getenv('APP_DEBUG') === 'true');
define('APP_URL', getenv('APP_URL') ?: getenv('FRONTEND_URL') ?: 'https://elchurch.site');
define('FRONTEND_URL', getenv('FRONTEND_URL') ?: APP_URL);
define('API_URL', getenv('API_URL') ?: 'https://api.elchurch.site');
define('APP_LOCAL_REQUEST', $isLocalRequest);

// Database configuration
define('DB_CONNECTION', getenv('DB_CONNECTION') ?: 'sqlite');
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
if (getenv('DB_DATABASE')) {
    $resolvedDatabasePath = getenv('DB_DATABASE');
} elseif (getenv('DB_NAME')) {
    $resolvedDatabasePath = getenv('DB_NAME');
} else {
    $resolvedDatabasePath = __DIR__ . '/../database/eternallovechurch.db';
}
define('DB_DATABASE', $resolvedDatabasePath);
define('DB_USERNAME', getenv('DB_USERNAME') ?: getenv('DB_USER') ?: '');
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: '');
define('DB_OFFLINE_FALLBACK', getenv('DB_OFFLINE_FALLBACK') !== false
    ? filter_var(getenv('DB_OFFLINE_FALLBACK'), FILTER_VALIDATE_BOOLEAN)
    : true);
define('DB_OFFLINE_DATABASE', getenv('DB_OFFLINE_DATABASE') ?: (__DIR__ . '/../database/eternallovechurch.db'));

// JWT configuration
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'change-this-secret-key-in-production-with-openssl-rand-base64-64');
define('JWT_EXPIRATION', (int)(getenv('JWT_EXPIRATION') ?: 86400));
define('JWT_REFRESH_EXPIRATION', (int)(getenv('JWT_REFRESH_EXPIRATION') ?: 2592000));

// Logging configuration
define('LOG_JSON', getenv('LOG_JSON') === 'true');

// Create App
$app = AppFactory::create();

// Add CORS middleware (must be first to handle preflight requests)
$app->add(CorsMiddleware::class);

// Add custom error handler (must be early)
$app->add(ErrorHandlerMiddleware::class);

// Add security middleware
$app->add(SecurityMiddleware::class);

// Add rate limiting middleware (disable during development)
if (!APP_DEBUG) {
    $app->add(RateLimitMiddleware::class);
}

// Set up Slim's error middleware for development/debugging
if (APP_DEBUG) {
    $errorMiddleware = $app->addErrorMiddleware(true, true, true);
    $errorMiddleware->setDefaultErrorHandler(function (
        \Psr\Http\Message\ServerRequestInterface $request,
        \Throwable $exception,
        bool $displayErrorDetails,
        bool $logErrors,
        bool $logErrorDetails
    ) use ($app) {
        $response = $app->getResponseFactory()->createResponse(500);
        $response->getBody()->write(json_encode([
            'status' => 'error',
            'error' => [
                'type' => 'server_error',
                'message' => 'An unexpected error occurred',
                'code' => 500
            ],
            'timestamp' => date('c')
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json');
    });
}

// ** FIX: Make app globally accessible for routes **
$GLOBALS['app'] = $app;

// ** FIX: Also store in container for better practice **
$container = $app->getContainer();
if ($container) {
    $container->set('app', $app);
}

// Import routes
require_once __DIR__ . '/routes.php';

return $app;
