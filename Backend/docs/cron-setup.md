# Cron Job Setup for Eternal Love Church

This project does **not** run cron jobs automatically just because the files are uploaded.
Each cron script must be scheduled in cPanel so the server can call it at the right time.

## How It Works

The cron jobs are plain PHP scripts inside the `cron/` folder.
When cPanel triggers a script, PHP loads the app bootstrap, connects to the database, and runs the task.

Example flow:
1. cPanel reaches the scheduled time.
2. cPanel runs the PHP command for the script.
3. The script loads `src/bootstrap.php`.
4. The script reads or writes to the MySQL database.
5. The script sends emails, updates logs, or creates reminders.

## Important Paths

Use the real server path, not the browser URL.

Example base path:

```bash
/home/elchurf5h4a2/api.elchurch.site/cron/
```

If your server uses a different PHP binary, replace `ea-php82` with the version shown in MultiPHP Manager.

## Recommended Cron Schedule

### 1. Daily reminders at 5:00 AM

These are the reminder jobs that should run every day:

```bash
0 5 * * * /usr/local/bin/ea-php82 /home/elchurf5h4a2/api.elchurch.site/cron/send_reminders.php >/dev/null 2>&1
```

```bash
0 5 * * * /usr/local/bin/ea-php82 /home/elchurf5h4a2/api.elchurch.site/cron/send_event_reminders.php >/dev/null 2>&1
```

### 2. Weekly report at 7:00 AM on Monday

This sends the weekly pastor and zone leader report:

```bash
0 7 * * 1 /usr/local/bin/ea-php82 /home/elchurf5h4a2/api.elchurch.site/cron/send_weekly_reports.php >/dev/null 2>&1
```

### 3. Email queue retry every 5 minutes

This keeps failed emails moving through the retry queue:

```bash
*/5 * * * * /usr/local/bin/ea-php82 /home/elchurf5h4a2/api.elchurch.site/cron/process_email_queue.php >/dev/null 2>&1
```

### 4. Absence processing at 7:00 PM daily

This checks and processes absence follow-ups:

```bash
0 19 * * * /usr/local/bin/ea-php82 /home/elchurf5h4a2/api.elchurch.site/cron/process_absence.php >/dev/null 2>&1
```

### 5. Engagement score calculation on the 1st of each month

This updates monthly engagement scores:

```bash
0 0 1 * * /usr/local/bin/ea-php82 /home/elchurf5h4a2/api.elchurch.site/cron/calculate_scores.php >/dev/null 2>&1
```

## Why `>/dev/null 2>&1` Is Used

That part hides console output so cPanel does not email output every time the cron runs.

If you are testing and want to see output, remove it temporarily:

```bash
/usr/local/bin/ea-php82 /home/elchurf5h4a2/api.elchurch.site/cron/send_reminders.php
```

## Notes

- Use only one email queue processor on a frequent schedule.
- Do not use the `NAME.php` placeholder from cPanel examples.
- The scripts only run when cPanel triggers them.
- If the website path changes, update the cron commands to match the new path.

## Summary

The setup is:

- `send_reminders.php` runs daily at 5:00 AM
- `send_event_reminders.php` runs daily at 5:00 AM
- `send_weekly_reports.php` runs every Monday at 7:00 AM
- `process_email_queue.php` runs every 5 minutes
- `process_absence.php` runs daily at 7:00 PM
- `calculate_scores.php` runs monthly on the 1st at 12:00 AM

