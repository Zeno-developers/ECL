<?php

namespace App\Services;

use Exception;

class Validator
{
    private $errors = [];
    private $data;

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    public function validate(string $field, callable $rule): self
    {
        $value = $this->data[$field] ?? null;
        
        if (!$rule($value, $this->data)) {
            $this->errors[$field][] = $this->getDefaultMessage($field);
        }
        
        return $this;
    }

    public function required(string $field): self
    {
        if (!isset($this->data[$field]) || $this->data[$field] === '') {
            $this->errors[$field][] = "The {$field} field is required";
        }
        return $this;
    }

    public function email(string $field): self
    {
        if (isset($this->data[$field]) && !filter_var($this->data[$field], FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field][] = "The {$field} field must be a valid email address";
        }
        return $this;
    }

    public function minLength(string $field, int $length): self
    {
        if (isset($this->data[$field]) && strlen($this->data[$field]) < $length) {
            $this->errors[$field][] = "The {$field} field must be at least {$length} characters";
        }
        return $this;
    }

    public function maxLength(string $field, int $length): self
    {
        if (isset($this->data[$field]) && strlen($this->data[$field]) > $length) {
            $this->errors[$field][] = "The {$field} field must not exceed {$length} characters";
        }
        return $this;
    }

    public function numeric(string $field): self
    {
        if (isset($this->data[$field]) && !is_numeric($this->data[$field])) {
            $this->errors[$field][] = "The {$field} field must be numeric";
        }
        return $this;
    }

    public function integer(string $field): self
    {
        if (isset($this->data[$field]) && !filter_var($this->data[$field], FILTER_VALIDATE_INT)) {
            $this->errors[$field][] = "The {$field} field must be an integer";
        }
        return $this;
    }

    public function boolean(string $field): self
    {
        if (isset($this->data[$field]) && !in_array($this->data[$field], [0, 1, '0', '1', true, false, 'true', 'false'], true)) {
            $this->errors[$field][] = "The {$field} field must be a boolean";
        }
        return $this;
    }

    public function inArray(string $field, array $allowed): self
    {
        if (isset($this->data[$field]) && !in_array($this->data[$field], $allowed)) {
            $this->errors[$field][] = "The {$field} field must be one of: " . implode(', ', $allowed);
        }
        return $this;
    }

    public function date(string $field): self
    {
        if (isset($this->data[$field])) {
            $d = \DateTime::createFromFormat('Y-m-d', $this->data[$field]);
            if (!$d || $d->format('Y-m-d') !== $this->data[$field]) {
                $this->errors[$field][] = "The {$field} field must be a valid date (YYYY-MM-DD)";
            }
        }
        return $this;
    }

    public function datetime(string $field): self
    {
        if (isset($this->data[$field])) {
            $d = \DateTime::createFromFormat('Y-m-d H:i:s', $this->data[$field]);
            if (!$d || $d->format('Y-m-d H:i:s') !== $this->data[$field]) {
                $this->errors[$field][] = "The {$field} field must be a valid datetime (YYYY-MM-DD HH:MM:SS)";
            }
        }
        return $this;
    }

    public function url(string $field): self
    {
        if (isset($this->data[$field]) && !filter_var($this->data[$field], FILTER_VALIDATE_URL)) {
            $this->errors[$field][] = "The {$field} field must be a valid URL";
        }
        return $this;
    }

    public function phone(string $field): self
    {
        if (isset($this->data[$field]) && !preg_match('/^[\+]?[1-9]\d{1,14}$/', preg_replace('/[\s\-\(\)]/', '', $this->data[$field]))) {
            $this->errors[$field][] = "The {$field} field must be a valid phone number";
        }
        return $this;
    }

    public function positive(string $field): self
    {
        if (isset($this->data[$field]) && $this->data[$field] <= 0) {
            $this->errors[$field][] = "The {$field} field must be positive";
        }
        return $this;
    }

    public function gt(string $field, $min): self
    {
        if (isset($this->data[$field]) && $this->data[$field] <= $min) {
            $this->errors[$field][] = "The {$field} field must be greater than {$min}";
        }
        return $this;
    }

    public function lt(string $field, $max): self
    {
        if (isset($this->data[$field]) && $this->data[$field] >= $max) {
            $this->errors[$field][] = "The {$field} field must be less than {$max}";
        }
        return $this;
    }

    public function arrayField(string $field): self
    {
        if (isset($this->data[$field]) && !is_array($this->data[$field])) {
            $this->errors[$field][] = "The {$field} field must be an array";
        }
        return $this;
    }

    public function custom(string $field, callable $callback, string $message): self
    {
        if (isset($this->data[$field]) && !$callback($this->data[$field], $this->data)) {
            $this->errors[$field][] = $message;
        }
        return $this;
    }

    public function sanitize(string $field): string
    {
        $value = $this->data[$field] ?? '';
        return htmlspecialchars(strip_tags(trim($value)), ENT_QUOTES, 'UTF-8');
    }

    public function getErrors(): array
    {
        return $this->errors;
    }

    public function hasErrors(): bool
    {
        return !empty($this->errors);
    }

    public function getFirstError(string $field = null): ?string
    {
        if ($field) {
            return $this->errors[$field][0] ?? null;
        }
        return $this->errors ? reset($this->errors[0]) : null;
    }

    public function getAllErrors(): array
    {
        $all = [];
        foreach ($this->errors as $fieldErrors) {
            $all = array_merge($all, $fieldErrors);
        }
        return $all;
    }

    public function isValid(): bool
    {
        return empty($this->errors);
    }

    private function getDefaultMessage(string $field): string
    {
        return "The {$field} field is invalid";
    }

    public static function make(array $data): self
    {
        return new self($data);
    }
}
