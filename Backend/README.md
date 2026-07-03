# Eternal Love Church Backend API

Comprehensive PHP backend API for Eternal Love Church website.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control (admin, pastor, member)
- **Members Management**: Full CRUD operations for church members
- **Events Management**: Create, manage, and register for church events
- **Sermons**: Upload, manage, and stream sermons with video/audio support
- **Blog**: Full blog system with categories, comments, and SEO metadata
- **Prayer Requests**: Submit and manage prayer requests with priority levels
- **Giving/Donations**: Track donations, set goals, generate reports
- **Settings**: Configurable church settings and information
- **Contact Form**: Handle contact submissions with email notifications
- **Visitor Management**: Track church visitors and follow-up
- **Analytics**: Website, engagement, and growth metrics
- **Notifications**: Send notifications to users
- **Chat**: Real-time chat rooms and messaging
- **File Uploads**: Secure file upload with validation

## Requirements

- PHP 8.1 or higher
- Composer
- MySQL 5.7+ or SQLite 3
- Web server (Apache/Nginx) or PHP built-in server

## Installation

### 1. Clone and Setup

```bash
cd backend
composer install
```

### 2. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` file and configure:
- Database connection (SQLite is default, easy for development)
- JWT secret (generate a random string for production)
- Mail settings (optional, for contact form emails)

### 3. Database Setup

#### MySQL for production

1. Create a database:
```sql
CREATE DATABASE elchurf5h4a2_elchurch_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Update `.env`:
```
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=elchurf5h4a2_elchurch_db
DB_USERNAME=elchurf5h4a2_dbuser1
DB_PASSWORD=Coding12!!!
```

3. Run the schema:
```bash
# Import the MySQL schema into the cPanel database
mysql -u elchurf5h4a2_dbuser1 -p elchurf5h4a2_elchurch_db < database/schema-mysql.sql
# or import database/install.sql using phpMyAdmin
```

> `database/schema.sql` is the SQLite version and should not be imported into MariaDB/MySQL because it uses `AUTOINCREMENT`.

### 4. Create Uploads Directory

```bash
mkdir -p uploads
chmod 755 uploads
```

### 5. Start the Server

```bash
# Using PHP built-in server
php -S localhost:5000 -t public

# Or using Composer script
composer start
```

The API will be available at `http://localhost:5000`

## API Base URL

All API endpoints are prefixed with `/api`

Example: `http://localhost:5000/api/auth/login`

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/auth/refresh-token` | Refresh JWT token |
| GET | `/api/auth/profile` | Get user profile |
| POST | `/api/auth/logout` | Logout (client-side) |

### Members

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/members` | Get all members (paginated) |
| GET | `/api/members/{id}` | Get member by ID |
| POST | `/api/members` | Create new member |
| PUT | `/api/members/{id}` | Update member |
| DELETE | `/api/members/{id}` | Delete member |
| GET | `/api/members/search?q={query}` | Search members |
| GET | `/api/members/stats` | Get member statistics |
| GET | `/api/members/profile` | Get current user's member profile |
| PATCH | `/api/members/{id}/role` | Update member role |

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | Get all events (paginated) |
| GET | `/api/events/public` | Get public/published events |
| GET | `/api/events/{id}` | Get event by ID |
| POST | `/api/events` | Create event |
| PUT | `/api/events/{id}` | Update event |
| DELETE | `/api/events/{id}` | Delete event |
| POST | `/api/events/{id}/register` | Register for event |
| GET | `/api/events/{id}/registrations` | Get event registrations |
| GET | `/api/events/stats` | Get event statistics |

### Sermons

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sermons` | Get published sermons |
| GET | `/api/sermons/all` | Get all sermons (including unpublished) |
| GET | `/api/sermons/public/{id}` | Get public sermon by ID |
| POST | `/api/sermons` | Create sermon |
| PUT | `/api/sermons/{id}` | Update sermon |
| DELETE | `/api/sermons/{id}` | Delete sermon |
| PATCH | `/api/sermons/{id}/publish` | Publish sermon |
| PATCH | `/api/sermons/{id}/unpublish` | Unpublish sermon |
| GET | `/api/sermons/stats` | Get sermon statistics |
| GET | `/api/sermons/series` | Get sermon series |

### Blog

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/blog/posts` | Get published posts |
| GET | `/api/blog/posts/{slug}` | Get post by slug |
| POST | `/api/blog/posts` | Create post |
| PUT | `/api/blog/posts/{id}` | Update post |
| DELETE | `/api/blog/posts/{id}` | Delete post |
| GET | `/api/blog/drafts` | Get draft posts |
| GET | `/api/blog/featured` | Get featured posts |
| GET | `/api/blog/stats` | Get blog statistics |
| GET | `/api/blog/categories` | Get all categories |
| POST | `/api/blog/categories` | Create category |
| GET | `/api/blog/search?q={query}` | Search posts |
| GET | `/api/blog/posts/{postId}/comments` | Get post comments |
| POST | `/api/blog/posts/{postId}/comments` | Add comment |
| PUT | `/api/blog/comments/{id}` | Update comment |
| DELETE | `/api/blog/comments/{id}` | Delete comment |

### Prayer Requests

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/prayers` | Get prayers (filtered) |
| GET | `/api/prayers/all` | Get all prayers |
| POST | `/api/prayers` | Submit prayer request |
| GET | `/api/prayers/{id}` | Get prayer by ID |
| PATCH | `/api/prayers/{id}/status` | Update prayer status |
| PATCH | `/api/prayers/{id}/priority` | Update prayer priority |
| GET | `/api/prayers/stats` | Get prayer statistics |

### Giving/Donations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/giving` | Get giving history |
| GET | `/api/giving/reports` | Get giving reports |
| GET | `/api/giving/user-stats` | Get current user's giving stats |
| GET | `/api/giving/user-history` | Get current user's giving history |
| GET | `/api/giving/goals` | Get giving goals |
| POST | `/api/giving` | Record donation |
| POST | `/api/giving/goals` | Create giving goal |
| PUT | `/api/giving/goals/{id}` | Update giving goal |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings/public` | Get public settings |
| GET | `/api/settings` | Get all settings |
| POST | `/api/settings` | Update settings |
| GET | `/api/settings/church-info` | Get church information |
| POST | `/api/settings/church-info` | Update church information |

### Contact

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contact` | Submit contact form |
| GET | `/api/contact/info` | Get contact information |

### Visitors

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/visitors` | Register visitor |
| GET | `/api/visitors/stats` | Get visitor statistics |
| GET | `/api/visitors/recent` | Get recent visitors |
| PATCH | `/api/visitors/{id}/status` | Update visitor status |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/website` | Get website analytics |
| GET | `/api/analytics/engagement` | Get engagement metrics |
| GET | `/api/analytics/growth?period={monthly|yearly}` | Get growth metrics |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notifications` | Send notification |
| POST | `/api/notifications/bulk` | Send bulk notification |
| GET | `/api/notifications/templates` | Get notification templates |
| GET | `/api/notifications/stats` | Get notification statistics |
| GET | `/api/notifications/user` | Get user notifications |
| PATCH | `/api/notifications/{id}/read` | Mark notification as read |
| PATCH | `/api/notifications/read-all` | Mark all notifications as read |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/rooms` | Get user's chat rooms |
| POST | `/api/chat/rooms` | Create chat room |
| POST | `/api/chat/rooms/initialize` | Initialize default rooms |
| GET | `/api/chat/rooms/{id}/messages` | Get room messages |
| POST | `/api/chat/rooms/{id}/messages` | Send message |
| POST | `/api/chat/rooms/{id}/join` | Join room |
| POST | `/api/chat/rooms/{id}/leave` | Leave room |
| GET | `/api/chat/rooms/{id}/info` | Get room info |
| PATCH | `/api/chat/rooms/{id}/messages/read` | Mark messages as read |
| GET | `/api/chat/rooms/{id}/search?q={query}` | Search messages |
| POST | `/api/chat/messages/{id}/react` | React to message |
| DELETE | `/api/chat/messages/{id}` | Delete message |
| GET | `/api/chat/stats` | Get chat statistics |

### File Upload

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload file |
| DELETE | `/api/upload/{id}` | Delete file |

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Response Format

All API responses follow this format:

```json
{
  "status": "success|error",
  "message": "Human readable message",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

## Default Admin User

A default admin user is created automatically:

- **Email**: admin@elchurch.site
- **Password**: admin123

**IMPORTANT**: Change this password immediately after first login!

## Database Schema

The database includes the following main tables:

- `users` - User accounts and authentication
- `members` - Church member profiles
- `events` - Church events
- `event_registrations` - Event sign-ups
- `sermons` - Sermon recordings and metadata
- `blog_posts` - Blog articles
- `blog_comments` - Blog comments
- `prayers` - Prayer requests
- `giving` - Donations and contributions
- `giving_goals` - Giving campaign goals
- `settings` - Application settings
- `church_info` - Church information
- `visitors` - Visitor tracking
- `contact_submissions` - Contact form submissions
- `notifications` - User notifications
- `notification_templates` - Notification templates
- `chat_rooms` - Chat rooms
- `chat_messages` - Chat messages
- `chat_participants` - Room participants
- `uploaded_files` - Uploaded files
- `api_keys` - API keys for integrations
- `activity_logs` - Activity audit trail

## Security Features

- JWT authentication with expiration
- Password hashing with bcrypt
- Input validation and sanitization
- SQL injection prevention with prepared statements
- CORS headers configured
- Rate limiting (100 requests per minute per IP)
- File upload validation

## Error Handling

Errors return appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

## Deployment

### Production Checklist

1. Change JWT_SECRET to a long random string
2. Set APP_ENV=production
3. Set APP_DEBUG=false
4. Configure database (MySQL recommended)
5. Set up proper file permissions
6. Configure web server (Apache/Nginx)
7. Set up SSL certificate
8. Configure email settings
9. Set up backups
10. Change default admin password

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.elchurch.site;
    root /path/to/backend/public;
    
    index index.php;
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    # CORS headers
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;
}
```

### Apache Configuration

```apache
<VirtualHost *:80>
    ServerName api.elchurch.site
    DocumentRoot /path/to/backend/public
    
    <Directory /path/to/backend/public>
        AllowOverride All
        Require all granted
    </Directory>
    
    # CORS headers
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With"
</VirtualHost>
```

## Cost Breakdown

### Hosting Costs (Monthly)

| Service | Estimated Cost | Notes |
|---------|---------------|-------|
| Shared Hosting | $5-15 | Basic shared hosting (cPanel) |
| VPS Hosting | $10-30 | DigitalOcean, Linode, AWS Lightsail |
| Managed PHP Hosting | $15-50 | Platform.sh, FortRabbit |
| Domain | $10-15/year | .co.za domain |
| SSL Certificate | Free | Let's Encrypt |
| Email Service | $0-10 | Optional transactional email |
| Database | Included | MySQL usually included |
| Storage | Included/Extra | Depends on media files |

**Total Monthly Cost**: $5-50 depending on hosting choice

### Development Costs

- **Time Investment**: ~40-60 hours for full implementation
- **Server Setup**: 2-4 hours
- **Testing**: 4-8 hours
- **Deployment**: 2-4 hours

### Premium Dependencies (Optional)

- **Email Service**: SendGrid, Mailgun ($10-20/month for high volume)
- **File Storage**: AWS S3, Cloudflare R2 ($0.023/GB)
- **CDN**: Cloudflare (free), AWS CloudFront
- **Monitoring**: Sentry, New Relic (free tiers available)
- **Push Notifications**: OneSignal (free)

## Testing

```bash
# Install PHPUnit
composer require --dev phpunit/phpunit

# Run tests
./vendor/bin/phpunit
```

## Troubleshooting

### Database Connection Issues

- Check database credentials in `.env`
- Ensure database exists
- Check file permissions for SQLite database

### JWT Errors

- Ensure JWT_SECRET is set in `.env`
- Check token expiration

### File Upload Failures

- Check uploads directory exists and is writable
- Verify file size limits in PHP configuration
- Check allowed file types

### CORS Issues

- Ensure CORS middleware is active
- Check that frontend URL is allowed (currently set to `*` for all origins)

## Support

For issues or questions, contact: info@elchurch.site

## License

MIT License - See LICENSE file for details

## Version

1.0.0
