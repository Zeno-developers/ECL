<?php

if (!function_exists('load_project_environment')) {
    /**
     * Load environment variables from the first matching production-friendly file.
     *
     * This keeps shared-hosting deployments working when the provider expects
     * .env.production while the application code still supports .env for local use.
     */
    function load_project_environment(string $baseDir, array $filenames = ['.env.production', '.env.production-api-subdomain', '.env'], bool $overrideExisting = false): void
    {
        $baseDir = rtrim($baseDir, DIRECTORY_SEPARATOR);

        foreach ($filenames as $filename) {
            $path = $baseDir . DIRECTORY_SEPARATOR . $filename;
            if (!is_file($path)) {
                continue;
            }

            $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if (!is_array($lines)) {
                continue;
            }

            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || $line[0] === '#') {
                    continue;
                }

                if (stripos($line, 'export ') === 0) {
                    $line = trim(substr($line, 7));
                }

                if (strpos($line, '=') === false) {
                    continue;
                }

                [$name, $value] = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);

                if ($name === '') {
                    continue;
                }

                if (strlen($value) >= 2 && (($value[0] === '"' && substr($value, -1) === '"') || ($value[0] === '\'' && substr($value, -1) === '\''))) {
                    $value = substr($value, 1, -1);
                }

                $current = getenv($name);
                if (!$overrideExisting && $current !== false && $current !== '') {
                    continue;
                }

                putenv("{$name}={$value}");
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }

            // Stop after the first readable environment file so deployments do not
            // silently mix settings from multiple production env files.
            return;
        }
    }
}
