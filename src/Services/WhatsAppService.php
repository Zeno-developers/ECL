<?php

namespace App\Services;

class WhatsAppService
{
    private string $serviceUrl;

    public function __construct()
    {
        $this->serviceUrl = rtrim(getenv('WHATSAPP_SERVICE_URL') ?: '', '/');
    }

    public function isConfigured(): bool
    {
        return !empty($this->serviceUrl);
    }

    /**
     * Normalize common phone formats to E.164, assuming South Africa for local numbers.
     */
    public static function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/[\s\-()]/', '', $phone);
        $phone = preg_replace('/(?!^\+)[^\d]/', '', $phone);

        if ($phone === '') {
            return '';
        }

        if (str_starts_with($phone, '+')) {
            return strlen($phone) >= 7 ? $phone : '';
        }

        if (str_starts_with($phone, '27')) {
            $phone = '+' . $phone;
            return strlen($phone) === 12 ? $phone : '';
        }

        if (str_starts_with($phone, '0')) {
            $phone = '+27' . substr($phone, 1);
            return strlen($phone) === 12 ? $phone : '';
        }

        $phone = '+27' . $phone;
        return strlen($phone) === 12 ? $phone : '';
    }

    /**
     * Send a WhatsApp message to multiple recipients.
     *
     * @param array  $recipients [['phone' => '0760...'], ...]
     * @param string $body       Message text
     * @return array ['sent' => int, 'failed' => int]
     */
    public function send(array $recipients, string $body): array
    {
        if (!$this->isConfigured() || empty($recipients)) {
            return ['sent' => 0, 'failed' => 0];
        }

        $sent   = 0;
        $failed = 0;
        $seen   = [];

        foreach ($recipients as $r) {
            $phone = self::normalizePhone($r['phone'] ?? '');
            if (isset($seen[$phone])) {
                continue;
            }
            $seen[$phone] = true;
            if (empty($phone)) {
                $failed++;
                continue;
            }

            try {
                $ch = curl_init($this->serviceUrl . '/send');
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_POST           => true,
                    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
                    CURLOPT_POSTFIELDS     => json_encode(['phone' => $phone, 'message' => $body], JSON_UNESCAPED_UNICODE),
                    CURLOPT_TIMEOUT        => 5,
                    CURLOPT_SSL_VERIFYPEER => false,
                ]);

                $result   = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($httpCode === 200) {
                    $sent++;
                } else {
                    error_log("WhatsApp service HTTP $httpCode for $phone: $result");
                    $failed++;
                }
            } catch (\Exception $e) {
                error_log("WhatsApp service exception: " . $e->getMessage());
                $failed++;
            }
        }

        return ['sent' => $sent, 'failed' => $failed];
    }
}
