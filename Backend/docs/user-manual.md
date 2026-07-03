# Eternal Love Church User Manual

This manual explains how to use the Eternal Love Church website and admin system.
It is written for church staff, pastors, leaders, and members who need to understand the main features, daily workflows, and scheduled automation.

## 1. What This System Does

The platform helps the church manage:

- Church members
- Visitors
- Events and registrations
- Sermons and blog posts
- Prayer requests
- Giving and donations
- Attendance and cell meetings
- Announcements and notifications
- Chat and communication
- Reports and analytics
- Automated reminders through cron jobs

## 2. Main User Roles

The system uses role-based access.

### Member

Members can usually:

- Log in to their profile
- View events and sermons
- Submit prayer requests
- Give online
- Register for events
- View announcements and notifications
- Update their profile if allowed

### Cell Leader

Cell leaders can usually:

- See their cell members
- Record or view cell attendance
- Receive cell reminder emails
- Review cell-related reports
- Help follow up on absent members

### Zone Leader

Zone leaders can usually:

- View members inside their zone
- Receive weekly zone summaries
- Review attendance and follow-up activity
- Manage zone-related requests

### Pastor / Admin / Superadmin

Church leaders can usually:

- Manage users and members
- Create events, sermons, blogs, and announcements
- Review giving and reports
- Manage settings and church information
- View analytics
- Run or monitor automated reminders
- Manage visitors and follow-up

## 3. Getting Started

### Logging In

1. Open the church website.
2. Click the login area.
3. Enter your email and password.
4. Click sign in.

If the account is new, the admin may have to create it first.

### Resetting a Password

If password reset is enabled:

1. Go to the password reset screen.
2. Enter your email address.
3. Follow the reset link sent to your email.

## 4. Home Page

The home page usually shows:

- Church branding
- Announcements
- Events
- Sermons
- Giving links
- Contact information
- Featured images

The content on the home page is normally controlled by the admin or content team.

## 5. Members

### Viewing Members

Admins and authorized leaders can view member records.
The member list may include:

- Name
- Email
- Phone
- Role
- Cell
- Zone
- Active status

### Creating or Editing a Member

When adding a member:

1. Enter the personal details.
2. Add contact details.
3. Assign a cell or zone if needed.
4. Save the record.

When editing:

1. Open the member record.
2. Update the fields.
3. Save the changes.

### Member Profile

Members may be able to update their own profile depending on permissions.
This typically includes:

- Name
- Email
- Phone
- Address
- Password

## 6. Visitors

Visitors can register their details when they attend church.

Visitor records may include:

- First name
- Last name
- Email
- Phone
- Visit date
- How they heard about the church
- Status
- Notes

Leaders can use this section to:

- Follow up with visitors
- Create member accounts for visitors
- Track repeated visits

## 7. Events

### Creating an Event

To create an event:

1. Go to the Events section.
2. Click create new event.
3. Enter the title, date, time, and location.
4. Add a description and any registration requirements.
5. Save and publish.

### Event Registration

Members or guests can register for events if registration is enabled.

The system can store:

- Event title
- Registration name
- Member or guest details
- Notes

### Public Events

Published events may appear on the public website.
Unpublished events stay hidden until they are ready.

## 8. Sermons

Sermons can be managed by church leaders or content editors.

Common fields include:

- Title
- Speaker
- Date
- Description
- Series
- Scripture
- Outline
- Notes
- Video or audio links

### Publishing a Sermon

1. Create the sermon entry.
2. Upload the media or add the media link.
3. Save it as draft first if needed.
4. Publish when ready.

## 9. Blog Posts

The blog is used for church news, devotionals, teaching, and updates.

### Blog Features

- Draft and published status
- Slug for public URLs
- Categories
- Tags
- Featured image
- SEO title and description

### Typical Workflow

1. Write the post.
2. Add a featured image.
3. Set category and tags.
4. Save as draft.
5. Publish when approved.

## 10. Prayer Requests

Members can submit prayer requests.

Prayer requests may be marked as:

- Pending
- Praying
- Answered
- Archived

Some requests can be public, while others can remain private or anonymous.

### Managing Prayer Requests

Authorized staff can:

- View submitted prayers
- Change the status
- Add responses or notes
- Archive old requests

## 11. Giving and Donations

The giving system lets people record or submit donations.

### Common Giving Fields

- Donor name
- Donor email
- Amount
- Fund
- Payment method
- Transaction ID
- Receipt number
- Notes

### Giving Funds

Funds may include items like:

- General
- Building
- Missions
- Relief

### SnapScan Giving

If SnapScan is enabled, online donations may be tracked automatically.

The system can store:

- Donation UUID
- User ID
- Amount
- Fund ID
- Payment status
- Payment URL
- Webhook data

### Receipts

When a donation is recorded, the system may generate or resend a receipt depending on the setup.

## 12. Attendance

The platform supports attendance for:

- Sunday services
- Cell meetings
- Meeting polls and confirmations

### Sunday Attendance

Used to record church service attendance.

### Cell Attendance

Used to record attendance at cell meetings.

### Meeting Polls

The system can create meeting polls for upcoming cell or zone meetings.
Members can respond to confirm attendance.

## 13. Zones and Cells

The church hierarchy is built around zones and cells.

### Zones

Zones help group people by area or leadership structure.

### Cells

Cells are smaller groups inside a zone.

Cells can store:

- Cell name
- Cell leader
- Zone
- Meeting day
- Meeting time
- Meeting location

This structure is important for:

- Attendance
- Reminders
- Reports
- Follow-up

## 14. Announcements

Announcements are used for targeted church communication.

You can send announcements to:

- Everyone
- Members
- Cell leaders
- Zone leaders
- Specific zones
- Specific cells

Announcements may have:

- Title
- Content
- Expiry date
- Active/inactive status

## 15. Notifications

Notifications help users stay updated inside the system.

They can be used for:

- New announcements
- Attendance reminders
- Event alerts
- Follow-up tasks
- Prayer responses

Users should check their notification area regularly.

## 16. Chat

The chat system supports internal communication.

It may include:

- Chat rooms
- Messages
- Participants
- Direct or group conversations

This is useful for team communication and ministry coordination.

## 17. Reports and Analytics

The system includes reporting for leadership.

### Common Reports

- Dashboard summary
- Growth reports
- Attendance reports
- Engagement scores
- Giving summaries
- Weekly pastor reports

### Purpose of Reports

Reports help leaders understand:

- Membership growth
- Attendance trends
- Giving trends
- Follow-up needs
- Active participation

## 18. Settings and Church Information

Admin users can manage:

- Church name
- Tagline
- Address
- Email
- Phone number
- Website
- Service times
- Social links

These settings affect public pages and emails.

## 19. File Uploads

The system can store uploaded files such as:

- Sermon media
- Blog images
- Home page images
- Documents
- Other media assets

### Important

- Only upload supported file types
- Keep file names clean and clear
- Make sure the upload folder is writable on the server

## 20. Automated Cron Jobs

Cron jobs are scheduled server tasks.
They do not run automatically just because the files exist.
They must be added in cPanel.

### What Cron Jobs Do

- Send reminder emails
- Send event reminder emails
- Retry failed emails
- Send weekly reports
- Process absence follow-up
- Calculate engagement scores

### Your Current Schedule

Recommended schedule:

- `send_reminders.php` at `5:00 AM` daily
- `send_event_reminders.php` at `5:00 AM` daily
- `send_weekly_reports.php` at `7:00 AM` every Monday
- `process_email_queue.php` every `5` minutes
- `process_absence.php` at `7:00 PM` daily
- `calculate_scores.php` on the `1st` of each month at `12:00 AM`

### Why Cron Matters

Without cron jobs:

- reminders will not be sent
- email retries will not happen
- weekly reports will not be delivered
- engagement scores will not update automatically

## 21. How Data Flows

Example reminder flow:

1. A cron job starts.
2. The script loads the app bootstrap.
3. The script checks the database for items that match the schedule.
4. The script sends emails or creates notifications.
5. The result may be saved in logs or in the database.

Example weekly report flow:

1. Cron runs Monday morning.
2. The script gathers attendance, absence, and giving data.
3. The script formats a summary.
4. The summary is sent to pastors or zone leaders.

## 22. Logs

Logs are used to troubleshoot issues.

Common log locations may include:

- `backend/logs/`
- cron test logs
- mail or error logs from the hosting provider

Logs help identify:

- Database errors
- SMTP failures
- Missing cron runs
- Permission issues

## 23. Common Problems and Fixes

### Problem: Cron job does not run

Possible causes:

- Wrong file path
- Wrong PHP version
- Permission issue
- Script error

Fix:

- Confirm the full filesystem path
- Check cPanel cron settings
- Test the script manually if SSH is available

### Problem: No database selected

Possible causes:

- SQL imported without choosing the database

Fix:

- Select the database in phpMyAdmin before importing
- Or add `USE your_database_name;` to the SQL file

### Problem: Emails fail

Possible causes:

- SMTP credentials are wrong
- Mail server blocked
- Hosting provider restriction

Fix:

- Check `.env`
- Check mail host, port, username, and password
- Review the email queue and logs

### Problem: File uploads fail

Possible causes:

- Upload directory not writable
- File type not allowed

Fix:

- Check folder permissions
- Confirm the file type is supported

## 24. Admin Checklist After Deployment

After deployment, the admin should verify:

- Database imported correctly
- `.env` file is configured
- Cron jobs are added in cPanel
- SMTP settings work
- Upload folders are writable
- Public site loads correctly
- Login works
- Emails are sending
- Weekly report runs on schedule

## 25. Quick Reference

### Important Paths

- Public web root: `public/`
- Cron jobs: `cron/`
- Database files: `database/`
- Logs: `logs/`

### Important Cron Commands

```bash
/usr/local/bin/ea-php82 /home/elchurf5h4a2/api.elchurch.site/cron/send_reminders.php
```

```bash
/usr/local/bin/ea-php82 /home/elchurf5h4a2/api.elchurch.site/cron/send_event_reminders.php
```

```bash
/usr/local/bin/ea-php82 /home/elchurf5h4a2/api.elchurch.site/cron/send_weekly_reports.php
```

## 26. Final Notes

The system is designed to be used continuously, with the website serving public pages and the cron jobs handling the background automation.

If you keep the database, SMTP, and cron setup healthy, the platform should handle:

- reminders
- reports
- attendance
- follow-up
- giving
- communication

with very little manual work.

