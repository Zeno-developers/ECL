# 📧 Email System Troubleshooting Guide

## Current Issue: SMTP Connection Failure

The system is now correctly attempting to send pastor notifications, but encounters:
```
SMTP Error: Could not connect to SMTP host. Failed to connect to server
```

### Root Cause
The HRIM SMTP server (`mail.hrim.co.za:465`) is not reachable from this environment.

---

## Sunday Check-in and Offering Impact

The SMTP failure does not only affect pastor notifications in the abstract. It also impacts the Sunday usher workflow used during live service:

- `src/pages/checkin/SundayCheckin.jsx` lets ushers search members, record Sunday check-ins, register visitors, and capture the Sunday Offering collection entry.
- The collection form sends Sunday service giving using `givingAPI.recordGiving(...)` with values such as:
  - `donor_name: 'Sunday Service Collection'`
  - `fund: 'Sunday Offering'`
  - `entry_source: 'sunday_service'`
  - `service_date: selectedDate`
- The page text already states that these entries are included in the weekly Monday pastor report email.

Operationally, that means:

- Ushers can still record the check-in and offering data locally.
- Email-dependent follow-up, report delivery, and notification workflows may fail or queue until SMTP is restored.
- If the Monday report email is generated from these Sunday entries, the report will be delayed or unavailable until mail sending works again.

Related backend paths:

- `backend/src/Controller/AttendanceController.php` handles Sunday check-in persistence.
- `backend/src/Controller/VisitorController.php` handles visitor check-in and visitor registration during Sunday service.
- `backend/src/Services/MailService.php` is the shared SMTP layer used by church email workflows.

---

## 🔍 Diagnosis Steps

### 1. Test SMTP Connection from Command Line
```bash
# Test telnet connection to HRIM
telnet mail.hrim.co.za 465

# Or using PowerShell
Test-NetConnection -ComputerName mail.hrim.co.za -Port 465
```

### 2. Check Current Configuration
```bash
# Verify .env has correct SMTP settings
grep "MAIL_" /path/to/.env
```

### 3. Review Email Logs
```bash
# Check email sending attempts
tail -f backend/logs/app-*.log | grep -i "smtp\|mail\|phpmailer"
```

---

## ✅ Solutions

### Option A: Use Gmail SMTP (Recommended for Development)

**Step 1:** Enable 2-Factor Authentication on Gmail account
- Go to https://myaccount.google.com/security
- Enable 2-Step Verification

**Step 2:** Generate App Password
- Visit https://myaccount.google.com/apppasswords
- Select "Mail" and "Windows Computer"
- Google generates 16-character password

**Step 3:** Update `.env` file
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-16-character-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your-email@gmail.com
MAIL_FROM_NAME="Eternal Love Church"
```

### Option B: Use SendGrid (Free tier available)

**Step 1:** Create SendGrid account
- Visit https://sendgrid.com
- Sign up for free account (100 emails/day)

**Step 2:** Generate API Key
- Dashboard → Settings → API Keys
- Create new API key with "Mail Send" permission

**Step 3:** Update `.env` file
```env
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=SG.xxxxxxxxxxxx...
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@elchurch.site
MAIL_FROM_NAME="Eternal Love Church"
```

### Option C: Use Mailgun (Free tier available)

**Step 1:** Create Mailgun account
- Visit https://mailgun.com
- Sign up for free account

**Step 2:** Get SMTP Credentials
- Dashboard → Sending → Domain Settings
- Copy SMTP credentials

**Step 3:** Update `.env` file
```env
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=postmaster@yourdomain.mailgun.org
MAIL_PASSWORD=your-mailgun-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@elchurch.site
MAIL_FROM_NAME="Eternal Love Church"
```

---

## 📨 Email Queue System

If SMTP is temporarily unavailable, emails are automatically queued in the database and retried later.

### How It Works

1. **Initial Send Fails** → Email stored in `email_queue` table
2. **Cron Job Retry** → Run every 5-10 minutes: `php cron/retry-email-queue.php`
3. **Max Retries** → Emails retry up to 5 times before marking as failed

### Manual Database Check
```sql
-- See pending emails
SELECT * FROM email_queue WHERE status = 'pending';

-- See failed emails
SELECT * FROM email_queue WHERE status = 'failed';

-- See sent emails
SELECT * FROM email_queue WHERE status = 'sent';

-- Clear old processed emails (keep 30 days)
DELETE FROM email_queue WHERE status = 'sent' AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### Set Up Cron Job for Retries

**Linux/Mac (crontab)**
```bash
# Edit crontab
crontab -e

# Add this line (retry every 5 minutes)
*/5 * * * * cd /path/to/backend && php cron/retry-email-queue.php >> logs/email-queue.log 2>&1
```

**Windows (Task Scheduler)**
```
Action: Start a program
Program: php.exe
Arguments: C:\path\to\backend\cron\retry-email-queue.php
Start in: C:\path\to\backend
Run: Every 5 minutes
```

---

## 📋 Required Database Migration

Run this SQL to create the email queue table:

```sql
CREATE TABLE IF NOT EXISTS email_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    body LONGTEXT NOT NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    last_attempted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);
```

---

## 🧪 Test Email Functionality

### Send Test Email
```bash
cd backend
php test-email.php
```

### Monitor In Real-Time
```bash
tail -f logs/app-*.log | grep -i "email\|smtp\|php"
```

---

## 🚀 Production Recommendations

### Option 1: Dedicated SMTP Service
- **SendGrid** - $10-20/month (1M emails/month)
- **Mailgun** - $0.50 - $1 per 1000 emails
- **AWS SES** - $0.10 per 1000 emails
- **Google Workspace** - Includes business email

### Option 2: Email Queue Best Practices
1. Always queue emails from web requests (don't send synchronously)
2. Send via background workers/cron jobs
3. Implement exponential backoff for retries
4. Monitor queue health and alert on failures
5. Archive processed emails for audit trail

### Option 3: Email Template Management
- Store templates in database for easy management
- Support dynamic variables (member names, dates, etc.)
- Test templates before production deployment
- Track email send rates and bounce rates

---

## 📍 Key Files

| File | Purpose |
|------|---------|
| `backend/src/Service/PastorNotificationService.php` | Sends notifications to pastors |
| `backend/src/Services/MailService.php` | General email sending service |
| `src/pages/checkin/SundayCheckin.jsx` | Ushers record Sunday check-ins and Sunday Offering entries |
| `backend/cron/retry-email-queue.php` | Retries failed emails |
| `backend/database/migrations/2026_04_15_add_email_queue_table.sql` | Email queue table schema |
| `backend/.env` | Email configuration |

---

## 🐛 Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Could not connect to SMTP host` | SMTP server unreachable | Switch to different SMTP provider |
| `SMTP authentication failed` | Wrong credentials | Verify username/password in .env |
| `Port 465 refused` | Wrong port or firewall | Try port 587 with TLS |
| `Certificate verification failed` | SSL/TLS issue | Try different MAIL_ENCRYPTION value |
| `Timeout` | Server too slow | Increase timeout or use queue system |

---

## ✨ Next Steps

1. **Choose SMTP Provider** - Gmail for dev, SendGrid/Mailgun for production
2. **Update `.env`** - Set correct SMTP credentials
3. **Create Email Queue Table** - Run the SQL migration
4. **Set Up Cron Job** - For automatic email retries
5. **Test** - Send test email and verify delivery
6. **Monitor** - Check logs regularly for SMTP issues

