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
return trim(<<<TXT
Donation Receipt
{$churchName}

Thank you, {$recipientName}.

Amount: R {$amount}
Fund: {$fund}
Date: {$donationDate}
Reference: {$reference}

Your giving helps us continue the ministry.
Please keep this receipt for your records.
TXT);
