# Event Reminder Automation Setup

## Features

The event reminder automation includes:

### Core Features
- ✅ **Automatic Scheduling** - Runs daily, checks for events 2 days away
- ✅ **Registration Count** - Shows number of people registered per event
- ✅ **Event Details** - Includes title, date, time, and location
- ✅ **Professional Email** - HTML-formatted with clear visual layout
- ✅ **Logging** - All activity logged to `backend/logs/event_reminders.log`

### Reliability Features
- ✅ **Configured Email Priority** - Uses pastor's configured email from settings first
- ✅ **Fallback to All Pastors** - Falls back to all pastor/admin emails if no setting
- ✅ **Email Queue Fallback** - Failed emails automatically queued for retry
- ✅ **Error Handling** - Graceful handling of SMTP failures
- ✅ **Audit Trail** - Optional logging to database via `cron_logs` table
- ✅ **Role-Based** - Sends to pastors, admins, and superadmins

### Email Recipients

The automation uses a **priority system** for determining where to send reminders:

1. **Pastor Dashboard Setting** (Highest Priority)
   - Checks `settings.pastor_report_email` configured by pastor
   - This is the same email used for contact form submissions
   - Pastor can change this in the Pastor Dashboard at any time

2. **All Active Pastor/Admin Emails** (Fallback)
   - If no setting configured, sends to all active users with roles:
     - `pastor`
     - `admin`  
     - `superadmin`
   - Uses email from `users.email` field

3. **Duplicate Prevention**
   - If pastor's settings email matches their user email, only sends once
   - Avoids sending duplicate reminders to the same person

## Setting Up Pastor Email for Reminders

### Via Pastor Dashboard (Recommended)

1. **Login to Pastor Dashboard** at `/pastor`
2. **Go to Settings**
3. **Find email configuration settings:**
   - "Contact/Notification Email" or  
   - "Pastor Report Email"
4. **Enter your preferred email address** (can be different from login email)
5. **Save settings**

⚠️ **Note:** This email is used for:
- Event reminders (2 days before)
- Contact form submissions
- Registration notifications
- All pastor notifications

### Direct Database (Alternative)

```sql
-- Set or update the pastor's notification email
INSERT INTO `settings` (`key_name`, `value`, `updated_at`)
VALUES ('pastor_report_email', 'pastor@example.com', NOW())
ON DUPLICATE KEY UPDATE 
  `value` = 'pastor@example.com',
  `updated_at` = NOW();
```

### Verify Configuration

**Via Dashboard:**
- Check that your email is saved in Settings

**Via Database:**
```sql
SELECT value FROM settings WHERE key_name = 'pastor_report_email';
```

Should show your email address.

### For Linux/Mac (using cron)

1. **Open crontab editor:**
   ```bash
   crontab -e
   ```

2. **Add this line to run the automation daily at 8 AM:**
   ```bash
   0 8 * * * php /path/to/backend/cron/send_event_reminders.php >> /path/to/backend/logs/cron.log 2>&1
   ```

   Replace `/path/to/backend/` with the actual path to your backend directory.

3. **Verify it was added:**
   ```bash
   crontab -l
   ```

### For Windows (using Task Scheduler)

1. **Open Task Scheduler:**
   - Press `Win + R`, type `taskschd.msc`, and press Enter

2. **Create a Basic Task:**
   - Right-click on "Task Scheduler Library"
   - Select "Create Basic Task"
   - Name: "Event Reminder Cron"
   - Trigger: Daily at 8:00 AM
   - Action: Start a program

3. **Set the Program:**
   - Program/script: `C:\php\php.exe` (adjust path to your PHP installation)
   - Add arguments: `C:\path\to\backend\cron\send_event_reminders.php`
   - Start in: `C:\path\to\backend`

4. **Save and activate the task**

### For Hosting Environments

Most hosting providers support cron jobs through:

**cPanel:**
1. Go to Advanced > Cron Jobs
2. Set the time to run daily at a preferred time (e.g., 8:00 AM)
3. Enter command: `php /home/username/public_html/backend/cron/send_event_reminders.php`

**Plesk:**
1. Go to Tools & Settings > Scheduled Tasks
2. Add a new task
3. Set to run daily
4. Command: `php /path/to/backend/cron/send_event_reminders.php`

## How It Works

1. **Runs daily** at the scheduled time (e.g., 8 AM)
2. **Calculates** which events are happening in exactly 2 days
3. **Queries** the database for:
   - Events with the target date
   - Number of people registered for each event
4. **Sends emails** to all active pastors with:
   - Event details (title, date, time, location)
   - Number of registrations
   - Professional HTML-formatted email
5. **Logs** all activities in `backend/logs/event_reminders.log`

## Monitoring & Troubleshooting

### Check the Logs

```bash
tail -f backend/logs/event_reminders.log
```

### Email Queue Fallback

If an email fails to send (SMTP down, network issue, etc.):
1. **Logged:** Message appears in `event_reminders.log` with error details
2. **Queued:** Email is automatically saved to `email_queue` table for retry
3. **Retry:** Email can be resent via a separate cron job or manually

**To manually process queued emails:**
```bash
php backend/cron/process_email_queue.php
```

**To schedule email queue processing:**
Add to crontab to run every hour:
```bash
0 * * * * php /path/to/backend/cron/process_email_queue.php
```

### Test Run Manually

To test the cron job manually (without waiting for the scheduled time):

```bash
php backend/cron/send_event_reminders.php
```

### Common Issues

**No emails sent:**
- Check if pastors are marked as `is_active = 1` in the users table
- Verify SMTP credentials in `.env` file
- Check logs: `tail backend/logs/event_reminders.log`

**Emails going to spam:**
- The email sender address is configured in `.env` (`MAIL_FROM_ADDRESS`)
- Ensure domain is whitelisted/trusted

**Cron not running:**
- Verify the cron job is properly scheduled: `crontab -l`
- Check server logs for errors
- Test the PHP script manually: `php /path/to/send_event_reminders.php`

## Database Tables Required

The automation uses existing tables:
- `events` - Event details
- `event_registrations` - Who's registered for each event
- `users` - Pastor contact information
- `settings` - Configuration (for `pastor_report_email` setting)

Optional tables (for enhanced reliability):
- `email_queue` - Failed emails are queued here for retry (auto-created if missing)
- `cron_logs` - Audit trail of reminder runs (auto-created if missing)

**To create the optional tables, run:**
```sql
-- From backend/database/migrations/create_email_queue_and_cron_logs.sql
```

## Email Template

The email sent to pastors includes:
- **Subject:** "Event Reminder: [Event Title]"
- **Content:**
  - Greeting to pastor
  - Event details (date, time, location)
  - Large display of registration count
  - Call to action about preparations
  - Signature from the church management system

## Customization

### Modify reminder timing

Since the cron runs daily, to change from 2 days to 3 days:

In `send_event_reminders.php`, line ~37, change:
```php
$reminderDate->modify('+2 days');  // Change 2 to 3
```

### Customize email template

Edit the `renderReminderTemplate()` method in `send_event_reminders.php` to modify the HTML email content.

### Change email recipients

Currently sends to all pastors marked as `role = 'pastor'` and `is_active = 1`. To modify, edit the `getPastorEmails()` method.

## Performance Notes

- The script runs efficiently even with hundreds of events
- Email sending is handled sequentially (not threaded)
- Each email takes ~1-2 seconds
- Typical run time: 10-30 seconds depending on number of pastors and events

## Security

- No sensitive data is exposed in logs (emails are logged but passwords are not)
- Script requires database access
- SMTP credentials come from `.env` (never hardcoded)
- Suitable for production use with proper cron permissions
