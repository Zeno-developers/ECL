<?php

namespace App\Services;

class BulkSmsService
{
    private const BASE_URL = 'https://api.bulksms.com/v1';

    private string $tokenId;
    private string $tokenSecret;

    public function __construct()
    {
        $this->tokenId     = getenv('BULKSMS_TOKEN_ID')     ?: '';
        $this->tokenSecret = getenv('BULKSMS_TOKEN_SECRET') ?: '';
    }

    public function isConfigured(): bool
    {
        return !empty($this->tokenId) && !empty($this->tokenSecret);
    }

    /**
     * Send SMS to multiple recipients.
     *
     * @param array  $recipients [['phone' => '+27...', 'name' => '...'], ...]
     * @param string $body       SMS text (160 chars = 1 credit; longer = multiple credits)
     * @return array ['sent' => int, 'failed' => int]
     */
    public function send(array $recipients, string $body): array
    {
        if (!$this->isConfigured() || empty($recipients)) {
            return ['sent' => 0, 'failed' => 0];
        }

        $messages = [];
        foreach ($recipients as $r) {
            $phone = $this->normalizePhone($r['phone'] ?? '');
            if ($phone) {
                $messages[] = ['to' => $phone, 'body' => $body];
            }
        }

        if (empty($messages)) {
            return ['sent' => 0, 'failed' => count($recipients)];
        }

        try {
            $ch = curl_init(self::BASE_URL . '/messages');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST           => true,
                CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
                CURLOPT_USERPWD        => $this->tokenId . ':' . $this->tokenSecret,
                CURLOPT_POSTFIELDS     => json_encode($messages),
                CURLOPT_TIMEOUT        => 30,
                CURLOPT_SSL_VERIFYPEER => false,
            ]);

            $result   = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode >= 200 && $httpCode < 300) {
                error_log("BulkSMS: sent " . count($messages) . " message(s)");
                return ['sent' => count($messages), 'failed' => 0];
            }

            error_log("BulkSMS HTTP $httpCode: $result");
            return ['sent' => 0, 'failed' => count($messages)];

        } catch (\Exception $e) {
            error_log("BulkSMS exception: " . $e->getMessage());
            return ['sent' => 0, 'failed' => count($messages)];
        }
    }

    /**
     * Normalize any phone format to E.164.
     * SA landlines/mobiles starting with 0 become +27.
     */
    private function normalizePhone(string $phone): string
    {
        // Strip spaces, dashes, parentheses
        $phone = preg_replace('/[\s\-()]/', '', $phone);
        // Strip everything except digits and a leading +
        $phone = preg_replace('/[^\d+]/', '', $phone);

        if (empty($phone)) return '';

        if (str_starts_with($phone, '+')) return strlen($phone) >= 7 ? $phone : '';

        // SA local number: 0XX -> +27XX
        if (str_starts_with($phone, '0')) {
            $e164 = '+27' . substr($phone, 1);
            return strlen($e164) === 12 ? $e164 : '';
        }

        // Bare digits — assume SA
        $e164 = '+27' . $phone;
        return strlen($e164) === 12 ? $e164 : '';
    }
}
