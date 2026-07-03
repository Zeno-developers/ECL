<?php
/** @var array $donation */
/** @var array $recipient */
$churchName = getenv('APP_NAME') ?: 'Eternal Love Church';
$amount = number_format((float)($donation['amount'] ?? 0), 2);
$fund = $donation['fund_name'] ?? ($donation['fund'] ?? 'General');
$donationDate = !empty($donation['completed_at'] ?? null)
    ? date('F j, Y g:i A', strtotime($donation['completed_at']))
    : date('F j, Y g:i A');
$reference = $donation['donation_uuid'] ?? ($donation['snapscan_transaction_id'] ?? '');
$recipientName = trim(($recipient['first_name'] ?? '') . ' ' . ($recipient['last_name'] ?? '')) ?: ($recipient['name'] ?? 'Partner');
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Donation Receipt</title>
</head>
<body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <div style="max-width:680px;margin:0 auto;padding:24px;">
    <div style="background:linear-gradient(135deg,#0f766e,#1d4ed8);color:#fff;border-radius:20px;padding:28px 30px;">
      <div style="font-size:14px;letter-spacing:.12em;text-transform:uppercase;opacity:.9;">Donation Receipt</div>
      <h1 style="margin:10px 0 0;font-size:30px;line-height:1.2;"><?php echo htmlspecialchars($churchName, ENT_QUOTES, 'UTF-8'); ?></h1>
      <p style="margin:12px 0 0;color:rgba(255,255,255,.88);">Thank you, <?php echo htmlspecialchars($recipientName, ENT_QUOTES, 'UTF-8'); ?>.</p>
    </div>
    <div style="background:#fff;border-radius:20px;padding:28px 30px;margin-top:18px;border:1px solid #e2e8f0;">
      <table role="presentation" style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;color:#64748b;">Amount</td>
          <td style="padding:10px 0;text-align:right;font-weight:bold;font-size:20px;">R <?php echo htmlspecialchars($amount, ENT_QUOTES, 'UTF-8'); ?></td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;">Fund</td>
          <td style="padding:10px 0;text-align:right;"><?php echo htmlspecialchars($fund, ENT_QUOTES, 'UTF-8'); ?></td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;">Date</td>
          <td style="padding:10px 0;text-align:right;"><?php echo htmlspecialchars($donationDate, ENT_QUOTES, 'UTF-8'); ?></td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;">Reference</td>
          <td style="padding:10px 0;text-align:right;"><?php echo htmlspecialchars($reference, ENT_QUOTES, 'UTF-8'); ?></td>
        </tr>
      </table>
      <div style="margin-top:24px;padding-top:18px;border-top:1px solid #e2e8f0;color:#475569;line-height:1.7;">
        Your giving helps us continue the ministry. Please keep this receipt for your records.
      </div>
    </div>
  </div>
</body>
</html>
