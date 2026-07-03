# HRIM Backend API - Quick Start Guide

## 5-Minute Setup

### 1. Install Dependencies
```bash
cd backend
composer install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and at minimum set:
```env
APP_ENV=production
APP_DEBUG=false
JWT_SECRET=openssl rand -base64 64
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=elchurf5h4a2_elchurch_db
DB_USERNAME=elchurf5h4a2_dbuser1
DB_PASSWORD=Coding12!!!
```

### 3. Database Setup
```bash
# Create database
mysql -u elchurf5h4a2_dbuser1 -p -e "CREATE DATABASE elchurf5h4a2_elchurch_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Import schema
mysql -u elchurf5h4a2_dbuser1 -p elchurf5h4a2_elchurch_db < database/schema-mysql.sql
```

### 4. Start Server
```bash
composer start
# or
php -S localhost:5000 -t public
```

API is now running at `http://localhost:5000`

## First API Calls

### 1. Health Check
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-03-22T14:00:00+00:00",
  "version": "1.0.0"
}
```

### 2. Register Admin User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hrim.co.za",
    "password": "SecureAdminPass123!",
    "first_name": "System",
    "last_name": "Administrator",
    "role": "admin"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hrim.co.za",
    "password": "SecureAdminPass123!"
  }'
```

Save the `token` from the response.

### 4. Test Authenticated Endpoint
```bash
curl -X GET http://localhost:5000/api/members \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Frontend Integration

### JavaScript/React Example

```javascript
// api.js - API client
const API_BASE = 'http://localhost:5000/api';

export const api = {
  // Auth
  login: async (email, password) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  },

  register: async (userData) => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return response.json();
  },

  // Members
  getMembers: async (token, page = 1, limit = 20) => {
    const response = await fetch(
      `${API_BASE}/members?page=${page}&limit=${limit}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.json();
  },

  // Events
  getEvents: async (token) => {
    const response = await fetch(`${API_BASE}/events`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  // Sermons
  getSermons: async (token) => {
    const response = await fetch(`${API_BASE}/sermons`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  // Prayer requests
  submitPrayer: async (token, prayerData) => {
    const response = await fetch(`${API_BASE}/prayers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(prayerData)
    });
    return response.json();
  },

  // Giving
  recordDonation: async (token, donationData) => {
    const response = await fetch(`${API_BASE}/giving`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(donationData)
    });
    return response.json();
  }
};

// Auth context example
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const login = async (email, password) => {
    const result = await api.login(email, password);
    if (result.status === 'success') {
      setToken(result.token);
      setUser(result.user);
      localStorage.setItem('token', result.token);
      localStorage.setItem('refresh_token', result.refresh_token);
    }
    return result;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
  };

  return { user, token, login, logout };
};
```

## Common Tasks

### Create a New Member
```bash
curl -X POST http://localhost:5000/api/members \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
    "phone": "+27 82 123 4567",
    "gender": "female",
    "marital_status": "married",
    "membership_date": "2025-03-22"
  }'
```

### Create an Event
```bash
curl -X POST http://localhost:5000/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sunday Worship Service",
    "description": "Join us for worship and fellowship",
    "date": "2025-03-23",
    "time": "09:00:00",
    "location": "Main Sanctuary",
    "type": "service",
    "is_published": true
  }'
```

### Create a Blog Post
```bash
curl -X POST http://localhost:5000/api/blog/posts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "The Power of Prayer",
    "content": "Prayer is a powerful tool...",
    "excerpt": "A short excerpt about prayer",
    "category": "faith",
    "tags": ["prayer", "faith", "christianity"],
    "status": "published"
  }'
```

### Submit Prayer Request
```bash
curl -X POST http://localhost:5000/api/prayers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Prayer for Healing",
    "description": "Please pray for my recovery from surgery",
    "is_anonymous": false,
    "is_public": true,
    "priority": "high"
  }'
```

### Record Donation
```bash
curl -X POST http://localhost:5000/api/giving \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500.00,
    "donor_name": "John Doe",
    "donor_email": "john@example.com",
    "fund": "General",
    "payment_method": "credit_card",
    "transaction_id": "txn_abc123",
    "receipt_number": "REC-001",
    "notes": "Sunday offering"
  }'
```

## Error Handling

Always check for errors in responses:

```javascript
const result = await api.login(email, password);

if (result.status === 'success') {
  // Handle success
  console.log('Logged in:', result.user);
} else {
  // Handle error
  console.error('Error:', result.error?.message || result.message);
}
```

Common error codes:
- 400: Bad request (validation error)
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (insufficient permissions)
- 404: Not found
- 409: Conflict (email already exists)
- 422: Validation error
- 429: Rate limit exceeded
- 500: Server error

## Token Management

### Access Token
- Expires in 24 hours (default)
- Send in `Authorization: Bearer <token>` header
- Refresh before expiration using refresh token

### Refresh Token
- Expires in 30 days (default)
- Use to get new access token:
```bash
curl -X POST http://localhost:5000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "your_refresh_token"}'
```

### Logout
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## File Uploads

### Upload Profile Picture
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch(`${API_BASE}/upload`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log('File URL:', result.data.url);
```

## Webhooks (Optional)

Configure webhooks for real-time notifications:

1. Set up webhook endpoint in your frontend
2. Configure webhook URL in settings (future feature)
3. Handle events: `member.created`, `event.registered`, `donation.received`, etc.

## Testing

### Using Postman/Insomnia
Import the API collection from `backend/docs/api-documentation.md`

### Automated Tests
```bash
# Run PHPUnit tests
./vendor/bin/phpunit

# Test specific endpoint
./vendor/bin/phpunit --filter testLogin
```

## Production Deployment

### 1. Environment
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com
APP_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 2. Database
- Use MySQL (not SQLite) for production
- Enable query cache
- Set up regular backups
- Use connection pooling

### 3. JWT Secret
Generate a strong secret:
```bash
openssl rand -base64 64
```

### 4. File Storage
- Configure `UPLOAD_MAX_SIZE` appropriately
- Store uploads outside web root if possible
- Use CDN for static files
- Implement virus scanning

### 5. Caching
- Enable Redis or Memcached for better performance
- Configure cache TTLs appropriately
- Set up cache warming for popular endpoints

### 6. Monitoring
- Monitor logs in `logs/` directory
- Set up error alerting
- Monitor database performance
- Track API response times

### 7. Security
- Enable HTTPS only
- Set up firewall
- Regular security updates
- Implement IP whitelisting for admin routes
- Use strong passwords
- Enable 2FA (future feature)

## Troubleshooting

### "Token expired"
- Use refresh token to get new access token
- If refresh token also expired, user must login again

### "Rate limit exceeded"
- Wait for rate limit window to reset
- Implement exponential backoff in client
- Consider increasing limit if needed

### "Validation failed"
- Check required fields in request body
- Ensure proper data types (strings, numbers, booleans)
- Validate email format, dates, etc.

### "Database connection failed"
- Check database credentials
- Ensure database server is running
- Verify database exists
- Check user permissions

### "File upload failed"
- Check file size (max 10MB for images)
- Verify file type is allowed
- Ensure uploads directory exists and is writable
- Check PHP upload limits (upload_max_filesize, post_max_size)

## Support

- Full API Docs: [`backend/docs/api-documentation.md`](backend/docs/api-documentation.md)
- Backend README: [`backend/README-BACKEND.md`](backend/README-BACKEND.md)
- Issues: Email pastor@hrim.co.za

## Next Steps

1. ✅ Set up backend server
2. ✅ Test health endpoint
3. ✅ Create admin user
4. ✅ Test authentication
5. ✅ Integrate with frontend
6. ✅ Deploy to production
7. 🔄 Set up monitoring
8. 🔄 Configure backups
9. 🔄 Implement additional features as needed

---

**Need Help?** Contact: pastor@hrim.co.za
