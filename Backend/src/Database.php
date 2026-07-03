<?php

namespace App;

use PDO;
use PDOException;
use Exception;
use App\Services\OfflineSyncService;

class Database
{
    private static $instance = null;
    private $connection;
    private $driver;

    private function __construct()
    {
        try {
            $this->connection = $this->createPrimaryConnection();
        } catch (PDOException $e) {
            if (DB_CONNECTION !== 'sqlite' && DB_OFFLINE_FALLBACK) {
                try {
                    $this->connection = $this->createSqliteConnection(DB_OFFLINE_DATABASE);
                    $this->driver = 'sqlite';
                    error_log('Primary database unavailable; falling back to local SQLite offline database.');
                    return;
                } catch (PDOException $fallbackException) {
                    throw new Exception(
                        "Database connection failed: {$e->getMessage()}. SQLite fallback also failed: " . $fallbackException->getMessage()
                    );
                } catch (Exception $fallbackException) {
                    throw new Exception(
                        "Database connection failed: {$e->getMessage()}. SQLite fallback also failed: " . $fallbackException->getMessage()
                    );
                }
            }

            throw new Exception("Database connection failed: " . $e->getMessage());
        }
    }

    private function createPrimaryConnection(): PDO
    {
        if (DB_CONNECTION === 'sqlite') {
            $this->driver = 'sqlite';
            return $this->createSqliteConnection(DB_DATABASE);
        }

        $this->driver = 'mysql';
        $connection = $this->createMysqlConnection();
        $this->syncOfflineFallbackQueueIfAvailable($connection);
        return $connection;
    }

    private function createMysqlConnection(): PDO
    {
        return new PDO(
            $this->getMysqlConnectionString(),
            DB_USERNAME ?: null,
            DB_PASSWORD ?: null,
            $this->getPdoOptions()
        );
    }

    private function createSqliteConnection(string $databasePath): PDO
    {
        $dbPath = $this->ensureSqliteDatabasePath($databasePath);
        $connection = new PDO("sqlite:{$dbPath}", null, null, $this->getPdoOptions());
        $this->configureSqliteConnection($connection);
        return $connection;
    }

    private function getPdoOptions(): array
    {
        return [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
    }

    private function configureSqliteConnection(PDO $connection): void
    {
        $connection->exec('PRAGMA foreign_keys = ON');
        $connection->exec('PRAGMA busy_timeout = 5000');

        if ($this->shouldInitializeSqliteSchema($connection)) {
            $this->initializeSqliteSchema($connection);
        }

        if (DB_CONNECTION !== 'sqlite') {
            OfflineSyncService::ensureSqliteQueueTable($connection);
        }
    }

    private function syncOfflineFallbackQueueIfAvailable(PDO $mysqlConnection): void
    {
        if (!DB_OFFLINE_FALLBACK) {
            return;
        }

        try {
            OfflineSyncService::syncSqliteQueueToMysql(DB_OFFLINE_DATABASE, $mysqlConnection);
        } catch (Exception $e) {
            error_log('Offline sync replay failed: ' . $e->getMessage());
        }
    }

    private function shouldInitializeSqliteSchema(PDO $connection): bool
    {
        $stmt = $connection->query("
            SELECT COUNT(*) AS table_count
            FROM sqlite_master
            WHERE type = 'table'
              AND name NOT LIKE 'sqlite_%'
        ");

        $result = $stmt->fetch();
        return (int) ($result['table_count'] ?? 0) === 0;
    }

    private function initializeSqliteSchema(PDO $connection): void
    {
        $schemaPath = dirname(__DIR__) . '/database/schema.sql';
        if (!file_exists($schemaPath)) {
            throw new Exception("SQLite schema file not found: {$schemaPath}");
        }

        $schemaSql = file_get_contents($schemaPath);
        if ($schemaSql === false) {
            throw new Exception("Failed to read SQLite schema file: {$schemaPath}");
        }

        try {
            $connection->beginTransaction();
            $connection->exec($schemaSql);
            $connection->commit();
        } catch (PDOException $e) {
            if ($connection->inTransaction()) {
                $connection->rollBack();
            }

            throw new Exception("SQLite schema initialization failed: " . $e->getMessage());
        }
    }

    private function ensureSqliteDatabasePath(string $databasePath): string
    {
        $dir = dirname($databasePath);
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        return $databasePath;
    }

    private function getMysqlConnectionString(): string
    {
        return "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_DATABASE . ";charset=utf8mb4";
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection(): PDO
    {
        return $this->connection;
    }

    public function getDriver(): ?string
    {
        return $this->driver;
    }

    public function isOfflineFallbackMode(): bool
    {
        return DB_CONNECTION !== 'sqlite' && $this->driver === 'sqlite';
    }

    public function queueOfflineSyncOperation(string $type, array $payload): ?string
    {
        if (!$this->isOfflineFallbackMode()) {
            return null;
        }

        return OfflineSyncService::queueSqliteOperation($this->connection, $type, $payload);
    }

    public function lastInsertId(): int
    {
        return (int) $this->connection->lastInsertId();
    }

    public function query(string $sql, array $params = [])
    {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            throw new Exception("Query failed: " . $e->getMessage());
        }
    }

    public function first(string $sql, array $params = [])
    {
        $stmt = $this->query($sql, $params);
        return $stmt->fetch();
    }

    public function all(string $sql, array $params = [])
    {
        $stmt = $this->query($sql, $params);
        return $stmt->fetchAll();
    }

    public function insert(string $table, array $data): int
    {
        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));
        $sql = "INSERT INTO $table ($columns) VALUES ($placeholders)";
        $this->query($sql, array_values($data));
        return (int) $this->connection->lastInsertId();
    }

    public function update(string $table, array $data, string $where, array $params = []): int
    {
        $set = implode(', ', array_map(fn($key) => "$key = ?", array_keys($data)));
        $sql = "UPDATE $table SET $set WHERE $where";
        $stmt = $this->query($sql, array_merge(array_values($data), $params));
        return $stmt->rowCount();
    }

    public function delete(string $table, string $where, array $params = []): int
    {
        $sql = "DELETE FROM $table WHERE $where";
        $stmt = $this->query($sql, $params);
        return $stmt->rowCount();
    }

    public function beginTransaction(): void
    {
        $this->connection->beginTransaction();
    }

    public function commit(): void
    {
        $this->connection->commit();
    }

    public function rollBack(): void
    {
        $this->connection->rollBack();
    }
}
