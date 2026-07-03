# SnapScan Giving Module

This module adds online giving, SnapScan payment links, webhook handling, donation history, summaries, receipt emails, and admin analytics support.

## 1. Database

Run this migration:

```sql
backend/database/migrations/2026_04_18_create_snapscan_giving_tables.sql
```

It creates:

- `snapscan_donations`
- `snapscan_webhook_log`

## 2. Environment Variables

Add these values to `backend/.env`:

```env
SNAPSCAN_SNAPCODE=your_snapcode
SNAPSCAN_API_KEY=your_api_key
SNAPSCAN_CALLBACK_TOKEN=your_callback_token
SNAPSCAN_WEBHOOK_URL=https://your-domain.com/api/snapscan/webhook
SNAPSCAN_REDIRECT_URL=https://your-site.com/giving?snapscan=success
```

Recommended production values:

- `APP_ENV=production`
- `APP_DEBUG=false`
- `FRONTEND_URL=https://your-site.com`
- `APP_URL=https://your-api-domain.com`

## 3. Backend Routes

Implemented in `backend/src/routes.php` and `backend/src/Controller/GivingController.php`:

- `POST /api/giving/snapscan/create`
- `POST /api/snapscan/webhook`
- `GET /api/giving/donations`
- `GET /api/giving/summary`
- `GET /api/giving/funds`
- `GET /api/giving/receipt/{donation_id}`
- `POST /api/giving/receipt/{donation_id}/resend`
- `POST /api/giving/offline`

## 4. Frontend Components

- `src/components/giving/GivingSection.jsx`
- `src/components/giving/GivingAdmin.jsx`

The existing pages now wrap those components:

- `src/pages/GivingPage.jsx`
- `src/pages/DonationsPage.jsx`

## 5. Receipt Email

Templates live in:

- `backend/templates/emails/snapscan_receipt.html.php`
- `backend/templates/emails/snapscan_receipt.txt.php`

## 6. Webhook Security

Webhook signatures are validated against `SNAPSCAN_CALLBACK_TOKEN` using HMAC-SHA256.

The webhook endpoint also writes every request to `snapscan_webhook_log` for debugging.

## 7. Cron Job

Optional daily reconciliation script:

```bash
php backend/cron/process_snapscan_donations.php
```

It checks for stale pending donations older than one hour and re-queries SnapScan status.

## 8. Example cURL Commands

Create a payment link:

```bash
curl -X POST https://your-api-domain.com/api/giving/snapscan/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":250,"fund_id":1}'
```

Fetch your donations:

```bash
curl https://your-api-domain.com/api/giving/donations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Get your giving summary:

```bash
curl https://your-api-domain.com/api/giving/summary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Resend a receipt:

```bash
curl -X POST https://your-api-domain.com/api/giving/receipt/123/resend \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 9. Notes

- The backend validates that amount is greater than `R1.00`.
- Production deployment should only use HTTPS URLs for redirect and webhook endpoints.
- The donor summary update is conditional: if `users.total_given` or `members.total_given` exists, it is updated automatically.
