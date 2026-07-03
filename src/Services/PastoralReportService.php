<?php

namespace App\Services;

use App\Database;

class PastoralReportService
{
    public function __construct(private Database $db) {}

    public function generateAndSend(string $serviceDate = null): array
    {
        if (!$serviceDate) {
            $serviceDate = date('Y-m-d', strtotime('yesterday'));
        }

        // Week = Monday through the service date (Sunday)
        $dow       = (int) date('N', strtotime($serviceDate)); // 1=Mon, 7=Sun
        $weekStart = date('Y-m-d', strtotime($serviceDate . ' -' . ($dow - 1) . ' days'));
        $weekEnd   = $serviceDate;

        $attendance = $this->getAttendance($serviceDate);
        $giving     = $this->getGiving($serviceDate, $weekStart, $weekEnd);
        $sermon     = $this->getSermon($serviceDate);

        $emailsSent = $this->sendEmail($serviceDate, $weekStart, $weekEnd, $attendance, $giving, $sermon);
        $waSent     = $this->sendWhatsApp($serviceDate, $weekStart, $weekEnd, $attendance, $giving, $sermon);

        return [
            'service_date'  => $serviceDate,
            'week_start'    => $weekStart,
            'emails_sent'   => $emailsSent,
            'whatsapp_sent' => $waSent,
            'attendance'    => $attendance,
            'giving_sunday' => $giving['sunday'],
            'giving_week'   => $giving['week'],
            'sermon'        => $sermon
                ? array_intersect_key($sermon, array_flip(['title', 'speaker', 'scripture']))
                : null,
        ];
    }

    // ─── Data gathering ───────────────────────────────────────────────────────

    private function getAttendance(string $date): array
    {
        $members = (int) ($this->db->first(
            "SELECT COUNT(*) AS c FROM attendance_sunday
             WHERE attendance_date = ? AND (is_visitor = 0 OR is_visitor IS NULL)",
            [$date]
        )['c'] ?? 0);

        $visitors = (int) ($this->db->first(
            "SELECT COUNT(*) AS c FROM visitor_attendance WHERE attendance_date = ?",
            [$date]
        )['c'] ?? 0);

        return [
            'members'  => $members,
            'visitors' => $visitors,
            'total'    => $members + $visitors,
        ];
    }

    private function getGiving(string $date, string $weekStart, string $weekEnd): array
    {
        $hasServiceDate = $this->columnExists('giving', 'service_date');
        $hasEntrySource = $this->columnExists('giving', 'entry_source');
        $dateCol        = $hasServiceDate ? 'service_date' : 'DATE(created_at)';
        $srcFilter      = $hasEntrySource ? " AND entry_source = 'sunday_service'" : '';

        $sundayTotal = (float) ($this->db->first(
            "SELECT COALESCE(SUM(amount), 0) AS t FROM giving WHERE {$dateCol} = ?{$srcFilter}",
            [$date]
        )['t'] ?? 0);

        $sundayCount = (int) ($this->db->first(
            "SELECT COUNT(*) AS c FROM giving WHERE {$dateCol} = ?{$srcFilter}",
            [$date]
        )['c'] ?? 0);

        $byFund = $this->db->all(
            "SELECT COALESCE(fund, 'General') AS fund,
                    COALESCE(SUM(amount), 0) AS total,
                    COUNT(*) AS count
             FROM giving WHERE {$dateCol} = ?{$srcFilter}
             GROUP BY fund ORDER BY total DESC",
            [$date]
        );

        // Weekly totals include all sources (online + cash)
        $weekTotal = (float) ($this->db->first(
            "SELECT COALESCE(SUM(amount), 0) AS t FROM giving WHERE {$dateCol} BETWEEN ? AND ?",
            [$weekStart, $weekEnd]
        )['t'] ?? 0);

        $weekCount = (int) ($this->db->first(
            "SELECT COUNT(*) AS c FROM giving WHERE {$dateCol} BETWEEN ? AND ?",
            [$weekStart, $weekEnd]
        )['c'] ?? 0);

        return [
            'sunday' => [
                'total'   => $sundayTotal,
                'count'   => $sundayCount,
                'by_fund' => $byFund,
            ],
            'week' => [
                'total' => $weekTotal,
                'count' => $weekCount,
                'start' => $weekStart,
                'end'   => $weekEnd,
            ],
        ];
    }

    private function getSermon(string $date): ?array
    {
        // Try exact date match first (published preferred)
        $row = $this->db->first(
            "SELECT title, speaker, scripture, description
             FROM sermons WHERE date = ?
             ORDER BY (status = 'published') DESC, id DESC LIMIT 1",
            [$date]
        );

        if (!$row) {
            $row = $this->db->first(
                "SELECT title, speaker, scripture, description
                 FROM sermons WHERE planned_date = ?
                 ORDER BY id DESC LIMIT 1",
                [$date]
            );
        }

        return $row ?: null;
    }

    private function getPastors(): array
    {
        return $this->db->all(
            "SELECT TRIM(first_name || ' ' || last_name) AS name, email, phone FROM users
             WHERE role IN ('pastor', 'admin', 'superadmin')
               AND is_active = 1
               AND email IS NOT NULL AND email != ''",
            []
        );
    }

    // ─── Delivery ─────────────────────────────────────────────────────────────

    private function sendEmail(
        string $serviceDate,
        string $weekStart,
        string $weekEnd,
        array $attendance,
        array $giving,
        ?array $sermon
    ): int {
        $pastors = $this->getPastors();
        if (empty($pastors)) {
            return 0;
        }

        $label      = date('l, d F Y', strtotime($serviceDate));
        $weekLabel  = date('d M', strtotime($weekStart)) . ' – ' . date('d M Y', strtotime($weekEnd));
        $subject    = "Monday Morning Report — {$label}";
        $html       = $this->buildEmailHtml($label, $weekLabel, $attendance, $giving, $sermon);

        try {
            $mail = SMTPConfigService::createFreshMailer();
            $mail->SMTPKeepAlive = true;
            $mail->isHTML(true);
            $mail->Subject = $subject;

            $sent = 0;
            foreach ($pastors as $pastor) {
                if (empty($pastor['email'])) {
                    continue;
                }
                $mail->clearAddresses();
                $mail->addAddress($pastor['email'], $pastor['name'] ?? '');
                $mail->Body    = $html;
                $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '</tr>'], "\n", $html));
                if ($mail->send()) {
                    $sent++;
                }
            }
            $mail->smtpClose();
            return $sent;
        } catch (\Throwable $e) {
            error_log('[PastoralReport] Email error: ' . $e->getMessage());
            return 0;
        }
    }

    private function sendWhatsApp(
        string $serviceDate,
        string $weekStart,
        string $weekEnd,
        array $attendance,
        array $giving,
        ?array $sermon
    ): int {
        $waService = new WhatsAppService();
        if (!$waService->isConfigured()) {
            return 0;
        }

        $pastors = $this->db->all(
            "SELECT DISTINCT phone FROM users
             WHERE role IN ('pastor', 'admin', 'superadmin')
               AND is_active = 1
               AND phone IS NOT NULL AND phone != ''
               AND phone != '0'",
            []
        );
        if (empty($pastors)) {
            return 0;
        }

        $message    = $this->buildWhatsAppMessage($serviceDate, $weekStart, $weekEnd, $attendance, $giving, $sermon);
        $recipients = array_map(fn($p) => ['phone' => $p['phone']], $pastors);
        $result     = $waService->send($recipients, $message);
        return $result['sent'] ?? 0;
    }

    // ─── Formatters ───────────────────────────────────────────────────────────

    private function buildWhatsAppMessage(
        string $serviceDate,
        string $weekStart,
        string $weekEnd,
        array $attendance,
        array $giving,
        ?array $sermon
    ): string {
        $label     = date('l, d F Y', strtotime($serviceDate));
        $weekLabel = date('d M', strtotime($weekStart)) . ' – ' . date('d M Y', strtotime($weekEnd));

        $msg  = "📋 *Monday Morning Report*\n";
        $msg .= "Sunday, {$label}\n\n";

        // Attendance
        $msg .= "🙏 *Sunday Attendance*\n";
        $msg .= "Members: {$attendance['members']}  |  Visitors: {$attendance['visitors']}  |  Total: *{$attendance['total']}*\n\n";

        // Sunday giving
        $sundayTotal = 'R' . number_format($giving['sunday']['total'], 2);
        $msg .= "💰 *Sunday Collection*\n";
        $msg .= "Total: *{$sundayTotal}* ({$giving['sunday']['count']} entries)";
        foreach ($giving['sunday']['by_fund'] as $f) {
            $msg .= "\n  • " . ucfirst($f['fund'] ?? 'General')
                  . ': R' . number_format((float) $f['total'], 2)
                  . ' (' . $f['count'] . ')';
        }
        $msg .= "\n\n";

        // Weekly giving
        $weekTotal = 'R' . number_format($giving['week']['total'], 2);
        $msg .= "📅 *Week Total ({$weekLabel})*\n";
        $msg .= "{$weekTotal} ({$giving['week']['count']} entries)\n\n";

        // Sermon
        if ($sermon) {
            $msg .= "📖 *Sunday Message*\n";
            $msg .= "*{$sermon['title']}*";
            if (!empty($sermon['speaker'])) {
                $msg .= " — {$sermon['speaker']}";
            }
            if (!empty($sermon['scripture'])) {
                $msg .= "\nScripture: _{$sermon['scripture']}_";
            }
            if (!empty($sermon['description'])) {
                $msg .= "\n{$sermon['description']}";
            }
            $msg .= "\n\n";
        }

        $msg .= "— Eternal Love Church";
        return $msg;
    }

    private function buildEmailHtml(
        string $label,
        string $weekLabel,
        array $attendance,
        array $giving,
        ?array $sermon
    ): string {
        $r = fn(float $v) => 'R' . number_format($v, 2);

        // Fund rows
        $fundRows = '';
        foreach ($giving['sunday']['by_fund'] as $f) {
            $fundName = htmlspecialchars(ucfirst($f['fund'] ?? 'General'));
            $fundRows .= "<tr>
                <td style='padding:6px 12px;color:#555'>{$fundName}</td>
                <td style='padding:6px 12px;text-align:right;font-weight:600'>{$r((float)$f['total'])}</td>
                <td style='padding:6px 12px;text-align:right;color:#888'>{$f['count']} entries</td>
            </tr>";
        }

        // Sermon block
        $sermonBlock = '';
        if ($sermon) {
            $title   = htmlspecialchars($sermon['title'] ?? '');
            $speaker = htmlspecialchars($sermon['speaker'] ?? '');
            $verse   = htmlspecialchars($sermon['scripture'] ?? '');
            $desc    = nl2br(htmlspecialchars($sermon['description'] ?? ''));

            $speakerHtml  = $speaker ? " <span style='color:#888'>by {$speaker}</span>" : '';
            $verseHtml    = $verse   ? "<p style='margin:8px 0 0;color:#6D28D9;font-style:italic'>📖 {$verse}</p>" : '';
            $descHtml     = $desc    ? "<p style='margin:10px 0 0;color:#555;line-height:1.6'>{$desc}</p>" : '';

            $sermonBlock = "
            <div style='margin-top:24px;border-top:2px solid #f0f0f0;padding-top:20px'>
                <h3 style='margin:0 0 10px;color:#1a1a2e;font-size:15px;text-transform:uppercase;letter-spacing:.5px'>📢 Sunday Message</h3>
                <div style='background:#f9f5ff;border-left:4px solid #6D28D9;padding:14px 16px;border-radius:0 8px 8px 0'>
                    <p style='margin:0;font-size:17px;font-weight:700;color:#1a1a2e'>{$title}{$speakerHtml}</p>
                    {$verseHtml}
                    {$descHtml}
                </div>
            </div>";
        }

        $sundayTotal = $r($giving['sunday']['total']);
        $weekTotal   = $r($giving['week']['total']);

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:24px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">

  <!-- Header -->
  <tr><td style="background:#1a1a2e;padding:28px 32px;text-align:center">
    <h1 style="margin:0;color:#D4AF37;font-size:22px;letter-spacing:.5px">Monday Morning Report</h1>
    <p style="margin:6px 0 0;color:#aaa;font-size:14px">{$label}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:28px 32px">

    <!-- Attendance -->
    <h3 style="margin:0 0 14px;color:#1a1a2e;font-size:15px;text-transform:uppercase;letter-spacing:.5px">🙏 Sunday Attendance</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;border:1px solid #e8e8e8">
      <tr style="background:#f9f9f9">
        <td style="padding:10px 16px;color:#555">Members</td>
        <td style="padding:10px 16px;text-align:right;font-size:20px;font-weight:700;color:#1a1a2e">{$attendance['members']}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;color:#555;border-top:1px solid #f0f0f0">Visitors</td>
        <td style="padding:10px 16px;text-align:right;font-size:20px;font-weight:700;color:#6D28D9;border-top:1px solid #f0f0f0">{$attendance['visitors']}</td>
      </tr>
      <tr style="background:#1a1a2e">
        <td style="padding:12px 16px;color:#D4AF37;font-weight:700">Total</td>
        <td style="padding:12px 16px;text-align:right;font-size:22px;font-weight:700;color:#D4AF37">{$attendance['total']}</td>
      </tr>
    </table>

    <!-- Sunday Collection -->
    <div style="margin-top:24px;border-top:2px solid #f0f0f0;padding-top:20px">
      <h3 style="margin:0 0 6px;color:#1a1a2e;font-size:15px;text-transform:uppercase;letter-spacing:.5px">💰 Sunday Collection</h3>
      <p style="margin:0 0 12px;font-size:26px;font-weight:700;color:#10b981">{$sundayTotal}
        <span style="font-size:14px;font-weight:400;color:#888">&nbsp;{$giving['sunday']['count']} entries</span>
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e8;border-radius:8px;overflow:hidden">
        <tr style="background:#f9f9f9">
          <th style="padding:8px 12px;text-align:left;color:#888;font-size:12px;text-transform:uppercase">Fund</th>
          <th style="padding:8px 12px;text-align:right;color:#888;font-size:12px;text-transform:uppercase">Amount</th>
          <th style="padding:8px 12px;text-align:right;color:#888;font-size:12px;text-transform:uppercase">Entries</th>
        </tr>
        {$fundRows}
      </table>
    </div>

    <!-- Weekly Giving -->
    <div style="margin-top:24px;border-top:2px solid #f0f0f0;padding-top:20px">
      <h3 style="margin:0 0 6px;color:#1a1a2e;font-size:15px;text-transform:uppercase;letter-spacing:.5px">📅 Week Total ({$weekLabel})</h3>
      <p style="margin:0;font-size:24px;font-weight:700;color:#3b82f6">
        {$weekTotal}
        <span style="font-size:14px;font-weight:400;color:#888">&nbsp;{$giving['week']['count']} entries (all channels)</span>
      </p>
    </div>

    {$sermonBlock}

  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#1a1a2e;padding:18px 32px;text-align:center">
    <p style="margin:0;color:#888;font-size:13px">Eternal Love Church — Automated Monday Report</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>
HTML;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function columnExists(string $table, string $column): bool
    {
        try {
            if ($this->db->getDriver() === 'sqlite') {
                $rows = $this->db->all("PRAGMA table_info({$table})");
                return in_array($column, array_column($rows, 'name'), true);
            }
            $rows = $this->db->all("SHOW COLUMNS FROM {$table}");
            return in_array($column, array_column($rows, 'Field'), true);
        } catch (\Throwable) {
            return false;
        }
    }
}
