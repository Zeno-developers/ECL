# Eternal Love Church Backend API

A production-ready PHP REST API for Eternal Love Church management system.

## Features

- **RESTful API Design**: Clean, standardized endpoints following REST principles
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Role-Based Access Control**: Admin, pastor, and member roles
- **Rate Limiting**: Database-backed rate limiting (100 req/min by default)
- **Input Validation**: Comprehensive validation with the Validator service
- **Error Handling**: Structured error responses with proper HTTP status codes
- **Logging**: Monolog-based structured logging with rotation
- **Caching**: Database caching for improved performance
- **Security Headers**: CSP, XSS protection, frame denial, and more
- **CORS Support**: Configurable allowed origins
- **File Uploads**: Secure file upload with type and size validation
- **Database**: MySQL/SQLite with optimized indexes
- **Health Checks**: Built-in health monitoring endpoint

## Requirements

- PHP 8.1 or higher
- Composer
- MySQL 5.7+ or SQLite 3.8+

## Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   composer install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   - Database connection (`DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`)
   - JWT secret (generate with: `openssl rand -base64 64`)
   - Mail settings (for password reset emails)
   - Allowed origins for CORS

4. **Set up database**
   
   For MySQL:
   ```sql
   CREATE DATABASE elchurf5h4a2_elchurch_db;
   ```
   
   Then run the schema:
   ```bash
   php -r "require_once 'src/bootstrap.php'; \$app = require_once 'src/bootstrap.php';"
   # Or manually import schema-mysql.sql into your database
   ```

5. **Start development server**
   ```bash
   composer start
   ```
   
   The API will be available at `http://localhost:5000`

## Project Structure

```
backend/
├── composer.json          # Dependencies
├── .env                   # Environment configuration (create from .env.example)
├── .env.example          # Example environment file
├── public/
│   └── index.php         # Application entry point
├── src/
│   ├── bootstrap.php     # Application setup and middleware configuration
│   ├── Database.php      # Database connection singleton
│   ├── routes.php        # API route definitions
│   ├── Middleware/       # Custom middleware
│   │   ├── SecurityMiddleware.php
│   │   ├── ErrorHandlerMiddleware.php
│   │   ├── RateLimitMiddleware.php
│   │   ├── CacheMiddleware.php
│   │   └── JwtMiddleware.php
│   ├── Controller/       # API controllers
│   │   ├── AuthController.php
│   │   ├── MembersController.php
│   │   ├── EventsController.php
│   │   ├── SermonsController.php
│   │   ├── BlogController.php
│   │   ├── PrayerController.php
│   │   ├── GivingController.php
│   │   ├── SettingsController.php
│   │   ├── ContactController.php
│   │   ├── VisitorController.php
│   │   ├── AnalyticsController.php
│   │   ├── DashboardController.php
│   │   ├── NotificationController.php
│   │   ├── ChatController.php
│   │   ├── UploadController.php
│   │   └── HomeImagesController.php
│   ├── Services/
│   │   ├── JwtService.php
│   │   ├── Validator.php
│   │   ├── LoggerService.php
│   │   └── CacheService.php
│   └── BaseController.php # Base controller with helper methods
├── database/
│   └── schema-mysql.sql   # MySQL database schema
├── docs/
│   └── api-documentation.md # Full API documentation
├── logs/                 # Application logs (created automatically)
├── uploads/              # Uploaded files (created automatically)
└── README-BACKEND.md     # This file
```

## API Documentation

Full API documentation is available at [`backend/docs/api-documentation.md`](backend/docs/api-documentation.md)

### Quick Start Example

#### 1. Register a user
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

#### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

#### 3. Access protected endpoint (replace TOKEN with actual JWT)
```bash
curl -X GET http://localhost:5000/api/members \
  -H "Authorization: Bearer TOKEN"
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication.

1. **Login** to obtain access token and refresh token
2. **Include token** in subsequent requests:
   ```
   Authorization: Bearer <access_token>
   ```
3. **Refresh token** when access token expires using the refresh token endpoint

### Token Payload
```json
{
  "iat": 1612345678,
  "nbf": 1612345678,
  "exp": 1612432078,
  "sub": 1,
  "data": {
    "email": "user@example.com",
    "role": "member",
    "name": "John Doe"
  }
}
```

## User Roles

- **admin**: Full system access
- **pastor**: Pastoral access (can manage members, prayers, etc.)
- **member**: Standard member access (view own data, submit prayers, etc.)

## Rate Limiting

- Default: 100 requests per minute per user/IP
- Rate limit headers included in responses:
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp
  - `Retry-After`: Seconds to wait when limit exceeded

## Error Handling

All errors follow this format:

```json
{
  "status": "error",
  "error": {
    "type": "error_type",
    "message": "Human readable error message",
    "code": 400
  },
  "timestamp": "2025-03-22T14:00:00+00:00",
  "path": "/api/endpoint"
}
```

### Common Error Types

- `bad_request`: Invalid request data (400)
- `unauthorized`: Missing or invalid token (401)
- `forbidden`: Insufficient permissions (403)
- `not_found`: Resource not found (404)
- `validation_error`: Request validation failed (422)
- `rate_limit_exceeded`: Too many requests (429)
- `server_error`: Internal server error (500)
- `database_error`: Database operation failed (500)

## Security Features

1. **JWT Authentication**: Stateless, secure token-based auth
2. **Rate Limiting**: Prevents abuse and DoS attacks
3. **Input Validation**: All inputs validated and sanitized
4. **SQL Injection Protection**: PDO prepared statements
5. **XSS Protection**: Input sanitization and security headers
6. **CSRF Protection**: Optional CSRF tokens (can be enabled)
7. **CORS**: Configurable allowed origins
8. **File Upload Security**: Type, size validation, and secure storage
9. **Security Headers**:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
   - `Content-Security-Policy`
   - `Referrer-Policy`
   - `Permissions-Policy`

## Database

### Supported Databases
- MySQL 5.7+
- SQLite 3.8+

### Schema
The complete database schema is in [`database/schema-mysql.sql`](database/schema-mysql.sql). It includes:

- Users and authentication
- Members management
- Events and registrations
- Sermons with series
- Blog posts and comments
- Prayer requests
- Giving/donations with goals
- Settings and church info
- Visitors tracking
- Contact submissions
- Notifications and templates
- Chat rooms and messages
- Home images management
- File uploads
- API keys
- Activity logs
- Rate limiting
- Caching

### Indexes
All tables are properly indexed for optimal performance.

## Environment Configuration

| Variable | Description | Default |
|-----------|-------------|---------|
| `APP_NAME` | Application name | "Eternal Love Church API" |
| `APP_ENV` | Environment (development/production) | "development" |
| `APP_DEBUG` | Enable debug mode | false |
| `APP_URL` | Application URL | "http://localhost:5000" |
| `APP_ALLOWED_ORIGINS` | CORS allowed origins | Comma-separated URLs |
| `DB_CONNECTION` | Database driver (mysql/sqlite, use mysql on host) | "mysql" |
| `DB_HOST` | Database host | "localhost" |
| `DB_PORT` | Database port | "3306" |
| `DB_DATABASE` | Database name/path | MySQL database name |
| `DB_USERNAME` | Database username | "" |
| `DB_PASSWORD` | Database password | "" |
| `JWT_SECRET` | JWT signing secret (REQUIRED) | Random string |
| `JWT_EXPIRATION` | Access token TTL (seconds) | 86400 (24 hours) |
| `JWT_REFRESH_EXPIRATION` | Refresh token TTL (seconds) | 2592000 (30 days) |
| `MAIL_HOST` | SMTP host | "" |
| `MAIL_PORT` | SMTP port | 587 |
| `MAIL_USERNAME` | SMTP username | "" |
| `MAIL_PASSWORD` | SMTP password | "" |
| `MAIL_ENCRYPTION` | SMTP encryption (tls/ssl) | "tls" |
| `MAIL_FROM_ADDRESS` | From email address | "noreply@elchurch.site" |
| `MAIL_FROM_NAME` | From name | App name |
| `UPLOAD_MAX_SIZE` | Max upload size (bytes) | 104857600 (100MB) |
| `UPLOAD_ALLOWED_TYPES` | Allowed file extensions | jpg,jpeg,png,gif,pdf,mp4,... |
| `RATE_LIMIT_MAX` | Max requests per window | 100 |
| `RATE_LIMIT_WINDOW` | Rate limit window (seconds) | 60 |
| `LOG_JSON` | Enable JSON logging | false |
| `LOG_MAX_FILES` | Max log files to keep | 30 |
| `CACHE_TTL` | Default cache TTL (seconds) | 300 |
| `SESSION_LIFETIME` | Session lifetime (minutes) | 120 |
| `CSRF_ENABLED` | Enable CSRF protection | true |

## Performance Optimizations

1. **Database Caching**: Query results cached in database
2. **Response Caching**: GET responses cached with Cache middleware
3. **Database Indexes**: Optimized indexes on all query columns
4. **Connection Pooling**: PDO persistent connections
5. **Gzip Compression**: Enable in web server (Apache/Nginx)
6. **ETags**: Can be added for client-side caching

## Deployment

### Production Checklist

- [ ] Set `APP_ENV=production`
- [ ] Set `APP_DEBUG=false`
- [ ] Generate strong `JWT_SECRET`
- [ ] Configure database (MySQL recommended)
- [ ] Set up proper file permissions
- [ ] Configure web server (Apache/Nginx)
- [ ] Enable HTTPS
- [ ] Set up log rotation
- [ ] Configure backup strategy
- [ ] Set up monitoring
- [ ] Configure CORS allowed origins
- [ ] Enable rate limiting
- [ ] Set up email (SMTP)

### Web Server Configuration

#### Apache (.htaccess)
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ index.php [QSA,L]
</IfModule>

# Security headers
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "DENY"
Header always set X-XSS-Protection "1; mode=block"

# Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE application/json
</IfModule>
```

#### Nginx
```nginx
location /api {
    try_files $uri $uri/ /index.php?$query_string;
    
    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # CORS
    add_header Access-Control-Allow-Origin "https://elchurch.site" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
    
    # Gzip
    gzip on;
    gzip_types application/json;
}
```

### Docker Deployment

```dockerfile
FROM php:8.2-apache

RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    zip \
    unzip \
    && docker-php-ext-install pdo_mysql zip

RUN a2enmod rewrite

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN composer install --no-dev --optimize-autoloader

RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && mkdir -p /var/www/html/logs /var/www/html/uploads \
    && chmod -R 775 /var/www/html/logs /var/www/html/uploads

EXPOSE 80

CMD ["apache2-foreground"]
```

## Testing

Run tests with PHPUnit:

```bash
./vendor/bin/phpunit
```

## Monitoring

### Health Check
```bash
curl https://your-api.com/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-03-22T14:00:00+00:00",
  "version": "1.0.0"
}
```

### Logs
Logs are stored in `logs/app.log` with rotation. View recent logs:

```bash
tail -f logs/app.log
```

### Cache Stats
```php
$cache = new \App\Services\CacheService();
$stats = $cache->getStats();
```

## Troubleshooting

### Database Connection Issues
- Verify database credentials in `.env`
- Check database server is running
- Ensure database exists
- Check user permissions

### JWT Errors
- Ensure `JWT_SECRET` is set and strong
- Check token expiration
- Verify token format (Bearer token)

### File Upload Issues
- Check `upload_max_filesize` and `post_max_size` in php.ini
- Verify upload directory exists and is writable
- Check allowed file types

### Rate Limiting
- Clear rate_limits table if needed
- Adjust `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW` in .env

### CORS Issues
- Set `APP_ALLOWED_ORIGINS` with your frontend URL
- Ensure no trailing slashes

## Contributing

1. Follow PSR-12 coding standards
2. Write tests for new features
3. Update documentation
4. Submit pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues or questions: info@elchurch.site

---

**Version**: 1.0.0
**Last Updated**: March 22, 2025
