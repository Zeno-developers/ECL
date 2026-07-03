# HRIM API Documentation

## Base URL
```
https://hrim-oa27.onrender.com/api
```

## Authentication
The API uses JWT (JSON Web Token) authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_token>
```

## Response Format
All responses follow this standard format:

### Success Response
```json
{
  "status": "success",
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
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

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## Rate Limiting
- Default: 100 requests per minute per user/IP
- Headers included in responses:
  - `X-RateLimit-Limit`: Maximum requests per window
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## Endpoints

### Authentication

#### POST /auth/login
Login user and obtain JWT tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "status": "success",
  "token": "jwt_token_here",
  "refresh_token": "refresh_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "member"
  }
}
```

#### POST /auth/register
Register new user.

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "role": "member"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Registration successful",
  "token": "jwt_token_here",
  "refresh_token": "refresh_token_here",
  "user": {
    "id": 2,
    "email": "newuser@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "member"
  }
}
```

#### POST /auth/forgot-password
Request password reset.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "If the email exists, a reset link has been sent"
}
```

#### POST /auth/reset-password
Reset password with token.

**Request:**
```json
{
  "token": "reset_token_here",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Password reset successful"
}
```

#### POST /auth/refresh-token
Refresh access token.

**Request:**
```json
{
  "refresh_token": "refresh_token_here"
}
```

**Response:**
```json
{
  "status": "success",
  "token": "new_jwt_token_here",
  "refresh_token": "new_refresh_token_here"
}
```

#### GET /auth/profile
Get current user profile (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 1,
      "uuid": "uuid-here",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+1234567890",
      "role": "member",
      "is_active": 1,
      "email_verified": 1,
      "last_login": "2025-03-22 10:00:00",
      "created_at": "2025-03-20 08:00:00"
    },
    "member": {
      "id": 1,
      "user_id": 1,
      "member_number": "M000001",
      "first_name": "John",
      "last_name": "Doe",
      "email": "user@example.com",
      "phone": "+1234567890",
      "address": null,
      "date_of_birth": null,
      "gender": "male",
      "marital_status": "single",
      "membership_date": "2025-03-20",
      "baptism_date": null,
      "emergency_contact": null,
      "emergency_phone": null,
      "notes": null,
      "is_active": 1,
      "created_at": "2025-03-20 08:00:00",
      "updated_at": "2025-03-20 08:00:00"
    }
  }
}
```

### Members

#### GET /members
Get all members (Authenticated).

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "status": "success",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### GET /members/{id}
Get specific member (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": { ... }
}
```

#### POST /members
Create new member (Authenticated).

**Request:**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "date_of_birth": "1990-05-15",
  "gender": "female",
  "marital_status": "married",
  "membership_date": "2025-03-22",
  "baptism_date": "2010-06-20",
  "emergency_contact": "John Smith",
  "emergency_phone": "+1234567891",
  "notes": "New member",
  "is_active": 1
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Member created successfully",
  "data": { ... }
}
```

#### PUT /members/{id}
Update member (Authenticated).

**Request:**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Member updated successfully",
  "data": { ... }
}
```

#### DELETE /members/{id}
Delete member (Authenticated).

**Response:**
```json
{
  "status": "success",
  "message": "Member deleted successfully"
}
```

#### GET /members/search
Search members (Authenticated).

**Query Parameters:**
- `q` (required): Search query

**Response:**
```json
{
  "status": "success",
  "data": [ ... ]
}
```

#### GET /members/stats
Get member statistics (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": {
    "total_members": 150,
    "active_members": 145,
    "new_members_this_month": 12,
    "members_by_gender": {
      "male": 80,
      "female": 68,
      "other": 2
    }
  }
}
```

#### GET /members/profile
Get current user's member profile (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": {
    "member": { ... }
  }
}
```

#### PATCH /members/{id}/role
Update member role (Authenticated, Admin only).

**Request:**
```json
{
  "role": "admin"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Member role updated successfully"
}
```

### Events

#### GET /events
Get all events (Authenticated).

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "status": "success",
  "data": [ ... ],
  "pagination": { ... }
}
```

#### GET /events/public
Get public events (No authentication).

**Query Parameters:**
- `upcoming` (optional): Filter upcoming events (true/false)

**Response:**
```json
{
  "status": "success",
  "data": [ ... ]
}
```

#### GET /events/{id}
Get specific event (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": { ... }
}
```

#### POST /events
Create event (Authenticated).

**Request:**
```json
{
  "title": "Sunday Service",
  "description": "Weekly worship service",
  "date": "2025-03-23",
  "time": "09:00:00",
  "location": "Main Sanctuary",
  "type": "service",
  "category": "worship",
  "speaker": "Pastor John",
  "max_attendees": 200,
  "registration_required": false,
  "image_url": "https://example.com/image.jpg",
  "is_published": true
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Event created successfully",
  "data": { ... }
}
```

#### PUT /events/{id}
Update event (Authenticated).

**Request:**
```json
{
  "title": "Updated Event Title",
  "description": "Updated description"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Event updated successfully",
  "data": { ... }
}
```

#### DELETE /events/{id}
Delete event (Authenticated).

**Response:**
```json
{
  "status": "success",
  "message": "Event deleted successfully"
}
```

#### POST /events/{id}/register
Register for event (Authenticated).

**Request:**
```json
{
  "guest_name": "John Doe",
  "guest_email": "john@example.com",
  "guest_phone": "+1234567890",
  "notes": "Looking forward to it!"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Registration successful",
  "data": {
    "registration_id": 123
  }
}
```

#### GET /events/{id}/registrations
Get event registrations (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": [ ... ]
}
```

#### GET /events/stats
Get event statistics (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": {
    "total_events": 50,
    "upcoming_events": 10,
    "past_events": 40,
    "total_registrations": 350,
    "events_by_type": [
      { "type": "service", "count": 30 },
      { "type": "meeting", "count": 15 },
      { "type": "event", "count": 5 }
    ]
  }
}
```

### Sermons

#### GET /sermons
Get all sermons (Authenticated).

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "status": "success",
  "data": [ ... ],
  "pagination": { ... }
}
```

#### GET /sermons/public
Get public sermons (No authentication).

**Query Parameters:**
- `series` (optional): Filter by series

**Response:**
```json
{
  "status": "success",
  "data": [ ... ]
}
```

#### GET /sermons/public/{id}
Get specific public sermon (No authentication).

**Response:**
```json
{
  "status": "success",
  "data": { ... }
}
```

#### GET /sermons/{id}
Get specific sermon (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": { ... }
}
```

#### POST /sermons
Create sermon (Authenticated).

**Request:**
```json
{
  "title": "The Good Shepherd",
  "speaker": "Pastor John Doe",
  "date": "2025-03-16",
  "description": "A sermon about God's guidance",
  "series": "Psalm 23",
  "video_url": "https://example.com/video.mp4",
  "audio_url": "https://example.com/audio.mp3",
  "thumbnail_url": "https://example.com/thumb.jpg",
  "duration": 3600,
  "published": false
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Sermon created successfully",
  "data": { ... }
}
```

#### PUT /sermons/{id}
Update sermon (Authenticated).

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "published": true
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Sermon updated successfully",
  "data": { ... }
}
```

#### DELETE /sermons/{id}
Delete sermon (Authenticated).

**Response:**
```json
{
  "status": "success",
  "message": "Sermon deleted successfully"
}
```

#### PATCH /sermons/{id}/publish
Publish sermon (Authenticated).

**Response:**
```json
{
  "status": "success",
  "message": "Sermon published"
}
```

#### PATCH /sermons/{id}/unpublish
Unpublish sermon (Authenticated).

**Response:**
```json
{
  "status": "success",
  "message": "Sermon unpublished"
}
```

#### GET /sermons/stats
Get sermon statistics (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": {
    "total_sermons": 200,
    "published_sermons": 150,
    "total_views": 5000,
    "by_series": [
      { "series": "Psalm 23", "count": 5 },
      { "series": "Beatitudes", "count": 8 }
    ]
  }
}
```

#### GET /sermons/series
Get all sermon series (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": [
    { "series": "Psalm 23", "sermon_count": 5 },
    { "series": "Beatitudes", "sermon_count": 8 }
  ]
}
```

### Blog

#### GET /blog/posts
Get all blog posts (Authenticated).

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "status": "success",
  "data": [ ... ],
  "pagination": { ... }
}
```

#### GET /blog/posts/{id}
Get specific blog post (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": { ... }
}
```

#### POST /blog/posts
Create blog post (Authenticated).

**Request:**
```json
{
  "title": "My Blog Post",
  "content": "This is the blog content...",
  "excerpt": "Short excerpt",
  "featured_image": "https://example.com/image.jpg",
  "category": "faith",
  "tags": ["christianity", "inspiration"],
  "status": "draft",
  "meta_title": "SEO Title",
  "meta_description": "SEO Description"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Post created successfully",
  "data": { ... }
}
```

#### PUT /blog/posts/{id}
Update blog post (Authenticated).

**Request:**
```json
{
  "title": "Updated Title",
  "content": "Updated content...",
  "status": "published"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Post updated successfully",
  "data": { ... }
}
```

#### DELETE /blog/posts/{id}
Delete blog post (Authenticated).

**Response:**
```json
{
  "status": "success",
  "message": "Post deleted successfully"
}
```

#### GET /blog/drafts
Get draft posts (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": [ ... ]
}
```

#### GET /blog/featured
Get featured posts (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": [ ... ]
}
```

#### GET /blog/stats
Get blog statistics (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": {
    "total_posts": 100,
    "published_posts": 75,
    "draft_posts": 25,
    "total_views": 10000,
    "categories": [
      { "category": "faith", "count": 30 },
      { "category": "inspiration", "count": 25 }
    ]
  }
}
```

#### GET /blog/categories
Get all categories (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": ["faith", "inspiration", "teaching"]
}
```

#### POST /blog/categories
Create category (Authenticated).

**Request:**
```json
{
  "category": "new-category"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Category created (note: categories are stored as strings in posts)"
}
```

#### GET /blog/search
Search blog posts (Authenticated).

**Query Parameters:**
- `q` (required): Search query

**Response:**
```json
{
  "status": "success",
  "data": [ ... ]
}
```

#### GET /blog/posts/{postId}/comments
Get post comments (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": [ ... ]
}
```

#### POST /blog/posts/{postId}/comments
Add comment (Authenticated optional).

**Request:**
```json
{
  "content": "Great post!",
  "author_name": "John Doe",
  "author_email": "john@example.com",
  "parent_id": null
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Comment added successfully",
  "data": { ... }
}
```

#### PUT /blog/comments/{id}
Update comment (Authenticated).

**Request:**
```json
{
  "content": "Updated comment"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Comment updated successfully"
}
```

#### DELETE /blog/comments/{id}
Delete comment (Authenticated).

**Response:**
```json
{
  "status": "success",
  "message": "Comment deleted successfully"
}
```

### Prayer Requests

#### GET /prayers
Get all prayers (Authenticated).

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "status": "success",
  "data": [ ... ],
  "pagination": { ... }
}
```

#### GET /prayers/all
Get all prayers including archived (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": [ ... ]
}
```

#### GET /prayers/{id}
Get specific prayer (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": { ... }
}
```

#### POST /prayers
Submit prayer request (Authenticated).

**Request:**
```json
{
  "title": "Prayer for healing",
  "description": "Please pray for my recovery",
  "is_anonymous": false,
  "is_public": true,
  "status": "pending",
  "priority": "high"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Prayer request submitted successfully",
  "data": { ... }
}
```

#### PATCH /prayers/{id}/status
Update prayer status (Authenticated).

**Request:**
```json
{
  "status": "praying"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Prayer status updated successfully"
}
```

#### PATCH /prayers/{id}/priority
Update prayer priority (Authenticated).

**Request:**
```json
{
  "priority": "high"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Prayer priority updated successfully"
}
```

#### GET /prayers/stats
Get prayer statistics (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": {
    "total_prayers": 500,
    "public_prayers": 450,
    "by_status": {
      "pending": 100,
      "praying": 250,
      "answered": 120,
      "archived": 30
    },
    "by_priority": {
      "high": 150,
      "medium": 300,
      "low": 50
    }
  }
}
```

### Giving

#### GET /giving
Get giving history (Authenticated).

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "status": "success",
  "data": [ ... ],
  "pagination": { ... }
}
```

#### GET /giving/reports
Get giving reports (Authenticated).

**Query Parameters:**
- `start_date` (optional): Start date (YYYY-MM-DD)
- `end_date` (optional): End date (YYYY-MM-DD)

**Response:**
```json
{
  "status": "success",
  "data": {
    "total_amount": 50000.00,
    "donation_count": 150,
    "by_fund": [
      { "fund": "General", "total": 30000.00, "count": 100 },
      { "fund": "Missions", "total": 20000.00, "count": 50 }
    ],
    "by_payment_method": [
      { "payment_method": "credit_card", "total": 25000.00, "count": 80 },
      { "payment_method": "cash", "total": 15000.00, "count": 50 },
      { "payment_method": "bank_transfer", "total": 10000.00, "count": 20 }
    ],
    "monthly_trends": [
      { "month": "2025-03", "total": 5000.00 },
      { "month": "2025-02", "total": 4500.00 }
    ]
  }
}
```

#### GET /giving/user-stats
Get current user's giving stats (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": {
    "total_given": 5000.00,
    "donation_count": 25,
    "by_fund": [
      { "fund": "General", "total": 3000.00, "count": 15 },
      { "fund": "Missions", "total": 2000.00, "count": 10 }
    ],
    "recent_donations": [ ... ]
  }
}
```

#### GET /giving/user-history
Get current user's giving history (Authenticated).

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "status": "success",
  "data": [ ... ],
  "pagination": { ... }
}
```

#### POST /giving
Record donation (Authenticated).

**Request:**
```json
{
  "amount": 100.00,
  "donor_name": "John Doe",
  "donor_email": "john@example.com",
  "fund": "General",
  "payment_method": "credit_card",
  "transaction_id": "txn_123456",
  "receipt_number": "REC-001",
  "notes": "Sunday offering",
  "is_recurring": false,
  "recurring_frequency": null
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Donation recorded successfully",
  "data": { ... }
}
```

#### GET /giving/goals
Get giving goals (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "fund": "General",
      "target_amount": 100000.00,
      "current_amount": 45000.00,
      "start_date": "2025-01-01",
      "end_date": "2025-12-31",
      "is_active": 1,
      "progress": 45.0
    }
  ]
}
```

#### POST /giving/goals
Create giving goal (Authenticated).

**Request:**
```json
{
  "fund": "General",
  "target_amount": 100000.00,
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "is_active": true
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Goal created successfully",
  "data": { ... }
}
```

#### PUT /giving/goals/{id}
Update giving goal (Authenticated).

**Request:**
```json
{
  "target_amount": 120000.00,
  "current_amount": 50000.00,
  "is_active": true
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Goal updated successfully",
  "data": { ... }
}
```

### Settings

#### GET /settings/public
Get public settings (No authentication).

**Response:**
```json
{
  "status": "success",
  "data": {
    "settings": {
      "church_name": "Hope Revival International Ministries",
      "church_tagline": "Experience God's Love and Restoration",
      "church_email": "pastor@hrim.co.za",
      "church_phone": "+27 82 358 2037",
      "church_address": "Nkodibe, Mtubatuba, KwaZulu-Natal, South Africa",
      "default_timezone": "Africa/Johannesburg"
    },
    "church_info": { ... }
  }
}
```

#### GET /settings
Get all settings (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "key_name": "church_name",
      "value": "Hope Revival International Ministries",
      "value_type": "string",
      "is_public": 1,
      "updated_at": "2025-03-20 10:00:00"
    }
  ]
}
```

#### POST /settings
Update settings (Authenticated).

**Request:**
```json
{
  "church_name": "New Church Name",
  "church_email": "newemail@example.com"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Settings updated successfully"
}
```

#### GET /settings/church-info
Get church info (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": { ... }
}
```

#### POST /settings/church-info
Update church info (Authenticated).

**Request:**
```json
{
  "name": "Church Name",
  "tagline": "Tagline",
  "address": "Address",
  "city": "City",
  "province": "Province",
  "country": "South Africa",
  "postal_code": "12345",
  "phone": "+27 82 358 2037",
  "email": "pastor@hrim.co.za",
  "website": "https://hrim.co.za",
  "latitude": -28.1234,
  "longitude": 32.1234,
  "service_times": "Sunday 9:00 AM",
  "about_us": "About the church...",
  "mission": "Our mission...",
  "vision": "Our vision...",
  "logo_url": "https://example.com/logo.png",
  "social_facebook": "https://facebook.com/hrim",
  "social_twitter": "https://twitter.com/hrim",
  "social_instagram": "https://instagram.com/hrim",
  "social_youtube": "https://youtube.com/hrim"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Church info updated successfully",
  "data": { ... }
}
```

### Contact

#### POST /contact
Submit contact form (No authentication).

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "subject": "General Inquiry",
  "message": "Hello, I have a question..."
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Message sent successfully. We will get back to you soon.",
  "data": {
    "submission_id": 123
  }
}
```

#### GET /contact/info
Get contact info (No authentication).

**Response:**
```json
{
  "status": "success",
  "data": {
    "church_name": "Hope Revival International Ministries",
    "address": "Nkodibe, Mtubatuba, KwaZulu-Natal, South Africa",
    "city": "Mtubatuba",
    "province": "KwaZulu-Natal",
    "phone": "+27 82 358 2037",
    "email": "pastor@hrim.co.za",
    "website": "https://hrim.co.za"
  }
}
```

### Visitors

#### POST /visitors
Register visitor (No authentication).

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "visit_date": "2025-03-22",
  "how_heard": "Friend",
  "notes": "First time visitor"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Visitor registered successfully",
  "data": { ... }
}
```

#### GET /visitors/stats
Get visitor statistics (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": {
    "total_visitors": 500,
    "new_this_month": 50,
    "by_status": {
      "new": 100,
      "contacted": 200,
      "followed": 150,
      "member": 50
    },
    "recent_visitors": [ ... ]
  }
}
```

#### GET /visitors/recent
Get recent visitors (Authenticated).

**Query Parameters:**
- `limit` (optional): Number of visitors (default: 10)

**Response:**
```json
{
  "status": "success",
  "data": [ ... ]
}
```

#### PATCH /visitors/{id}/status
Update visitor status (Authenticated).

**Request:**
```json
{
  "status": "contacted"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Visitor status updated successfully"
}
```

### Analytics

#### GET /analytics/website
Get website analytics (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": {
    "total_members": 150,
    "total_events": 50,
    "total_sermons": 200,
    "total_blog_posts": 100,
    "total_views": 15000,
    "total_donations": 5000,
    "total_donation_amount": 500000.00,
    "total_prayers": 500,
    "total_visitors": 500
  }
}
```

#### GET /analytics/engagement
Get engagement metrics (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": {
    "active_members": 80,
    "event_registrations": 120,
    "prayer_requests": 50,
    "blog_comments": 30,
    "donations": 25,
    "avg_donation_amount": 200.00,
    "sermon_views": 5000
  }
}
```

#### GET /analytics/growth
Get growth metrics (Authenticated).

**Query Parameters:**
- `period` (optional): yearly or monthly (default: monthly)

**Response:**
```json
{
  "status": "success",
  "data": {
    "member_growth": [
      { "period": "2025-03", "new_members": 12 },
      { "period": "2025-02", "new_members": 8 }
    ],
    "giving_growth": [
      { "period": "2025-03", "total_giving": 5000.00 },
      { "period": "2025-02", "total_giving": 4500.00 }
    ],
    "event_growth": [
      { "period": "2025-03", "new_events": 5 },
      { "period": "2025-02", "new_events": 3 }
    ],
    "blog_growth": [
      { "period": "2025-03", "new_posts": 10 },
      { "period": "2025-02", "new_posts": 8 }
    ]
  }
}
```

### Dashboard

#### GET /dashboard/stats
Get dashboard statistics (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "value": "150",
      "label": "Church Members",
      "icon": "Users",
      "color": "bg-blue-500"
    },
    {
      "value": "R 5,000.00",
      "label": "Your Total Giving",
      "icon": "DollarSign",
      "color": "bg-green-500"
    },
    {
      "value": "10",
      "label": "Upcoming Events",
      "icon": "Calendar",
      "color": "bg-purple-500"
    },
    {
      "value": "5",
      "label": "Your Prayers",
      "icon": "Heart",
      "color": "bg-red-500"
    }
  ]
}
```

#### GET /dashboard/recent-activity
Get recent activity (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "text": "You gave R 100.00 to General",
      "time": "Mar 22, 2025",
      "color": "bg-green-400"
    },
    {
      "text": "You submitted a prayer request: \"Prayer for...\"",
      "time": "Mar 21, 2025",
      "color": "bg-red-400"
    }
  ]
}
```

#### GET /dashboard/comprehensive
Get comprehensive dashboard stats (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": [
    { "value": "150", "label": "Total Members", "icon": "Users", "color": "bg-blue-500" },
    { "value": "145", "label": "Active Members", "icon": "UserCheck", "color": "bg-green-500" },
    { "value": "10", "label": "Upcoming Events", "icon": "Calendar", "color": "bg-purple-500" },
    { "value": "5", "label": "Your Prayer Requests", "icon": "Heart", "color": "bg-red-500" },
    { "value": "R 5,000.00", "label": "Your Giving", "icon": "DollarSign", "color": "bg-yellow-500" },
    { "value": "25", "label": "Donation Count", "icon": "TrendingUp", "color": "bg-indigo-500" },
    { "value": "12", "label": "New Visitors (This Month)", "icon": "UserPlus", "color": "bg-orange-500" }
  ]
}
```

### Notifications

#### POST /notifications
Send notification (Authenticated).

**Request:**
```json
{
  "title": "Important Announcement",
  "message": "This is an important message",
  "user_id": 123,
  "type": "announcement",
  "scheduled_for": "2025-03-23 10:00:00"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Notification created successfully",
  "data": {
    "notification_id": 456
  }
}
```

#### POST /notifications/bulk
Send bulk notification (Authenticated).

**Request:**
```json
{
  "title": "Bulk Announcement",
  "message": "Message to all users",
  "user_ids": [1, 2, 3, 4, 5],
  "type": "bulk",
  "scheduled_for": "2025-03-23 10:00:00"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Bulk notification scheduled for 5 users"
}
```

#### GET /notifications/templates
Get notification templates (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": [ ... ]
}
```

#### GET /notifications/stats
Get notification statistics (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": {
    "total_notifications": 1000,
    "unread_count": 50,
    "sent_today": 25,
    "scheduled_count": 10,
    "by_type": [
      { "type": "announcement", "count": 500 },
      { "type": "reminder", "count": 300 },
      { "type": "bulk", "count": 200 }
    ]
  }
}
```

#### GET /notifications/user
Get user notifications (Authenticated).

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `unreadOnly` (optional): Filter unread only (true/false)
- `markRead` (optional): Mark as read (true/false)

**Response:**
```json
{
  "status": "success",
  "data": [ ... ],
  "pagination": { ... }
}
```

#### PATCH /notifications/{id}/read
Mark notification as read (Authenticated).

**Response:**
```json
{
  "status": "success",
  "message": "Notification marked as read"
}
```

#### PATCH /notifications/read-all
Mark all notifications as read (Authenticated).

**Response:**
```json
{
  "status": "success",
  "message": "All notifications marked as read"
}
```

### Chat

#### GET /chat/rooms
Get chat rooms (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "General",
      "description": "General discussion",
      "type": "channel",
      "is_private": 0,
      "created_by": 1,
      "created_at": "2025-03-20 10:00:00",
      "participant_count": 50,
      "message_count": 200
    }
  ]
}
```

#### POST /chat/rooms
Create chat room (Authenticated).

**Request:**
```json
{
  "name": "New Room",
  "description": "Room description",
  "type": "channel",
  "is_private": false
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Room created successfully",
  "data": { ... }
}
```

#### POST /chat/rooms/initialize
Initialize default rooms (Authenticated).

**Response:**
```json
{
  "status": "success",
  "message": "Default rooms initialized"
}
```

#### GET /chat/rooms/{id}/messages
Get room messages (Authenticated).

**Query Parameters:**
- `limit` (optional): Number of messages (default: 50)
- `before` (optional): Get messages before this timestamp

**Response:**
```json
{
  "status": "success",
  "data": [ ... ]
}
```

#### POST /chat/rooms/{id}/messages
Send message (Authenticated).

**Request:**
```json
{
  "content": "Hello everyone!",
  "type": "text",
  "file_url": null,
  "file_name": null,
  "parent_id": null
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Message sent",
  "data": { ... }
}
```

#### POST /chat/rooms/{id}/join
Join room (Authenticated).

**Response:**
```json
{
  "status": "success",
  "message": "Joined room successfully"
}
```

#### POST /chat/rooms/{id}/leave
Leave room (Authenticated).

**Response:**
```json
{
  "status": "success",
  "message": "Left room successfully"
}
```

#### GET /chat/rooms/{id}/info
Get room info (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": {
    "room": { ... },
    "participants": [ ... ]
  }
}
```

#### PATCH /chat/rooms/{id}/messages/read
Mark messages as read (Authenticated).

**Response:**
```json
{
  "status": "success",
  "message": "Messages marked as read"
}
```

#### GET /chat/rooms/{id}/search
Search messages (Authenticated).

**Query Parameters:**
- `q` (required): Search query

**Response:**
```json
{
  "status": "success",
  "data": [ ... ]
}
```

#### POST /chat/messages/{id}/react
React to message (Authenticated).

**Request:**
```json
{
  "emoji": "👍"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Reaction added",
  "data": {
    "reactions": { "👍": 5, "❤️": 3 }
  }
}
```

#### DELETE /chat/messages/{id}
Delete message (Authenticated).

**Response:**
```json
{
  "status": "success",
  "message": "Message deleted"
}
```

#### GET /chat/stats
Get chat statistics (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": {
    "total_rooms": 10,
    "total_messages": 5000,
    "user_messages": 100,
    "active_users": 50
  }
}
```

### File Upload

#### POST /upload
Upload file (Authenticated).

**Form Data:**
- `file`: File to upload

**Response:**
```json
{
  "status": "success",
  "message": "File uploaded successfully",
  "data": {
    "file_id": 123,
    "filename": "abc123.jpg",
    "original_name": "photo.jpg",
    "file_path": "uploads/abc123.jpg",
    "file_size": 102400,
    "mime_type": "image/jpeg",
    "url": "/uploads/abc123.jpg"
  }
}
```

#### DELETE /upload/{id}
Delete file (Authenticated).

**Response:**
```json
{
  "status": "success",
  "message": "File deleted successfully"
}
```

### Home Images Management

#### GET /home-images
Get all home images.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `section` (optional): Filter by section
- `category` (optional): Filter by category

**Response:**
```json
{
  "status": "success",
  "data": [ ... ],
  "pagination": { ... }
}
```

#### GET /home-images/section/{section}
Get images by section.

**Query Parameters:**
- `category` (optional): Filter by category

**Response:**
```json
{
  "status": "success",
  "data": [ ... ]
}
```

#### GET /home-images/section/{section}/featured
Get featured images by section.

**Response:**
```json
{
  "status": "success",
  "data": [ ... ]
}
```

#### GET /home-images/component/{component}
Get images by component.

**Response:**
```json
{
  "status": "success",
  "data": [ ... ]
}
```

#### GET /home-images/{id}
Get specific image.

**Response:**
```json
{
  "status": "success",
  "data": { ... }
}
```

#### POST /home-images/upload
Upload home image (Authenticated).

**Form Data:**
- `image`: Image file
- `title` (optional): Image title
- `description` (optional): Image description
- `section` (optional): Section name (default: "home")
- `category` (optional): Category
- `component` (optional): Component name
- `alt_text` (optional): Alt text
- `link_url` (optional): Link URL
- `display_order` (optional): Display order (default: 0)
- `is_featured` (optional): Featured flag (0/1)
- `is_active` (optional): Active status (0/1)

**Response:**
```json
{
  "status": "success",
  "message": "Image uploaded successfully",
  "data": { ... }
}
```

#### PUT /home-images/{id}
Update image (Authenticated).

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "section": "hero",
  "category": "slider",
  "display_order": 1,
  "is_featured": true,
  "is_active": true
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Image updated successfully",
  "data": { ... }
}
```

#### DELETE /home-images/{id}
Delete image (Authenticated).

**Response:**
```json
{
  "status": "success",
  "message": "Image deleted successfully"
}
```

#### PUT /home-images/bulk/update
Bulk update images (Authenticated).

**Request:**
```json
{
  "imageIds": [1, 2, 3],
  "updates": {
    "display_order": 10,
    "is_featured": 1
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Images updated successfully"
}
```

#### DELETE /home-images/bulk/delete
Bulk delete images (Authenticated).

**Request:**
```json
{
  "imageIds": [1, 2, 3]
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Images deleted successfully"
}
```

#### PUT /home-images/reorder
Reorder images (Authenticated).

**Request:**
```json
{
  "section": "hero",
  "imageOrders": {
    "1": 0,
    "2": 1,
    "3": 2
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Images reordered successfully"
}
```

#### GET /home-images/{id}/analytics
Get image analytics (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": {
    "image_id": 1,
    "views": 150,
    "clicks": 25,
    "last_viewed": "2025-03-22 13:00:00"
  }
}
```

#### GET /home-images/stats/overview
Get image statistics (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": {
    "total_images": 50,
    "by_section": [
      { "section": "hero", "count": 10 },
      { "section": "gallery", "count": 20 }
    ],
    "by_component": [
      { "component": "slider", "count": 5 },
      { "component": "banner", "count": 10 }
    ],
    "featured_count": 15
  }
}
```

#### GET /home-images/config/upload
Get upload configuration (Authenticated).

**Response:**
```json
{
  "status": "success",
  "data": {
    "max_file_size": 10485760,
    "allowed_types": ["image/jpeg", "image/png", "image/gif", "image/webp"],
    "upload_url": "/api/home-images/upload",
    "thumbnail_sizes": [
      { "small": { "width": 300, "height": 200 } },
      { "medium": { "width": 600, "height": 400 } },
      { "large": { "width": 1200, "height": 800 } }
    ]
  }
}
```

### Health Check

#### GET /health
Health check endpoint (No authentication).

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-03-22T14:00:00+00:00",
  "version": "1.0.0"
}
```

## Error Handling

The API uses standardized error responses. Common error types:

- `bad_request`: Invalid request data
- `unauthorized`: Missing or invalid authentication
- `forbidden`: Insufficient permissions
- `not_found`: Resource not found
- `validation_error`: Request validation failed
- `rate_limit_exceeded`: Too many requests
- `server_error`: Internal server error
- `database_error`: Database operation failed

## Security Features

1. **JWT Authentication**: All protected endpoints require Bearer token
2. **Rate Limiting**: 100 requests per minute per user/IP
3. **Input Validation**: All inputs validated and sanitized
4. **SQL Injection Protection**: Prepared statements used throughout
5. **XSS Protection**: Input sanitization and security headers
6. **CORS**: Configurable allowed origins
7. **File Upload Security**: Type and size validation

## Best Practices

1. Always include `Content-Type: application/json` header
2. Use HTTPS in production
3. Store JWT tokens securely (HTTP-only cookies recommended)
4. Implement token refresh before expiration
5. Handle rate limit responses (429 status)
6. Check error responses for debugging
7. Use pagination for large datasets
8. Validate all inputs on client-side as well

## Support

For issues or questions, contact: pastor@hrim.co.za
