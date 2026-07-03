<?php

namespace App\Services;

use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Monolog\Handler\RotatingFileHandler;
use Monolog\Formatter\JsonFormatter;

class LoggerService
{
    private $logger;

    public function __construct()
    {
        $this->logger = new Logger('eternal-love-church-api');
        
        $logDir = getenv('LOG_PATH') ?: (__DIR__ . '/../../logs');
        $logDir = rtrim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $logDir), DIRECTORY_SEPARATOR);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0777, true);
        }

        // Use rotating file handler for production
        $maxFiles = getenv('LOG_MAX_FILES') ?: 30;
        $handler = new RotatingFileHandler($logDir . '/app.log', $maxFiles, Logger::DEBUG);
        
        // Set JSON formatter for structured logging
        if (getenv('LOG_JSON') === 'true') {
            $handler->setFormatter(new JsonFormatter());
        }
        
        $this->logger->pushHandler($handler);

        // Also log to stdout in development
        if (getenv('APP_ENV') !== 'production') {
            $this->logger->pushHandler(new StreamHandler('php://stdout', Logger::INFO));
        }
    }

    public function emergency($message, array $context = []): void
    {
        $this->logger->emergency($message, $context);
    }

    public function alert($message, array $context = []): void
    {
        $this->logger->alert($message, $context);
    }

    public function critical($message, array $context = []): void
    {
        $this->logger->critical($message, $context);
    }

    public function error($message, array $context = []): void
    {
        $this->logger->error($message, $context);
    }

    public function warning($message, array $context = []): void
    {
        $this->logger->warning($message, $context);
    }

    public function notice($message, array $context = []): void
    {
        $this->logger->notice($message, $context);
    }

    public function info($message, array $context = []): void
    {
        $this->logger->info($message, $context);
    }

    public function debug($message, array $context = []): void
    {
        $this->logger->debug($message, $context);
    }

    public function log($level, $message, array $context = []): void
    {
        $this->logger->log($level, $message, $context);
    }

    public function getLogger(): Logger
    {
        return $this->logger;
    }
}
