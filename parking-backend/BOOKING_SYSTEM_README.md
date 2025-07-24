# Parking Booking System API Documentation

## Overview
The booking system allows users to reserve parking spaces for specific time periods. It includes conflict detection, cost calculation, and comprehensive booking management.

## Database Schema

### Bookings Table
```sql
CREATE TABLE bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parking_lot_id UUID NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

All booking endpoints require JWT authentication via the `Authorization: Bearer <token>` header.

### 1. Create Booking
**POST** `/bookings`

**Request Body:**
```json
{
  "parking_lot_id": "uuid",
  "start_time": "2024-01-15T10:00:00Z",
  "end_time": "2024-01-15T12:00:00Z"
}
```

**Response:**
```json
{
  "id": "booking-uuid",
  "user_id": "user-uuid",
  "parking_lot_id": "lot-uuid",
  "start_time": "2024-01-15T10:00:00Z",
  "end_time": "2024-01-15T12:00:00Z",
  "total_cost": 25.00,
  "status": "active",
  "created_at": "2024-01-15T09:00:00Z",
  "parking_lots": {
    "name": "Downtown Parking",
    "location": "123 Main St",
    "price_per_hour": 12.50
  }
}
```

### 2. Get User Bookings
**GET** `/bookings/user?status=active`

**Query Parameters:**
- `status` (optional): Filter by booking status (`active`, `completed`, `cancelled`)

**Response:**
```json
[
  {
    "id": "booking-uuid",
    "user_id": "user-uuid",
    "parking_lot_id": "lot-uuid",
    "start_time": "2024-01-15T10:00:00Z",
    "end_time": "2024-01-15T12:00:00Z",
    "total_cost": 25.00,
    "status": "active",
    "parking_lots": {
      "name": "Downtown Parking",
      "location": "123 Main St",
      "price_per_hour": 12.50
    }
  }
]
```

### 3. Get Specific Booking
**GET** `/bookings/:id`

**Response:** Same as create booking response

### 4. Update Booking
**PUT** `/bookings/:id`

**Request Body:**
```json
{
  "start_time": "2024-01-15T11:00:00Z",
  "end_time": "2024-01-15T13:00:00Z"
}
```

**Response:** Updated booking object

### 5. Cancel Booking
**DELETE** `/bookings/:id`

**Response:** Cancelled booking object with status set to 'cancelled'

### 6. Get Parking Lot Bookings (Admin)
**GET** `/bookings/parking-lot/:parking_lot_id?status=active&date=2024-01-15`

**Query Parameters:**
- `status` (optional): Filter by booking status
- `date` (optional): Filter by specific date (YYYY-MM-DD)

**Response:**
```json
[
  {
    "id": "booking-uuid",
    "user_id": "user-uuid",
    "parking_lot_id": "lot-uuid",
    "start_time": "2024-01-15T10:00:00Z",
    "end_time": "2024-01-15T12:00:00Z",
    "total_cost": 25.00,
    "status": "active",
    "users": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
]
```

## Business Logic

### Booking Validation
1. **Time Validation:**
   - Start time must be in the future
   - End time must be after start time
   - Cannot update bookings that have already started

2. **Conflict Detection:**
   - Prevents double-booking of the same parking lot
   - Checks for overlapping time slots

3. **Cost Calculation:**
   - Based on parking lot's hourly rate
   - Rounds up to the nearest hour
   - Calculated as: `ceil(duration_hours) * price_per_hour`

### Space Management
- Available spaces are decremented when booking is created
- Available spaces are incremented when booking is cancelled
- Real-time availability tracking

## Setup Instructions

### 1. Environment Variables
Create a `.env` file in the `parking-backend` directory with:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret_key
PORT=4000
```

### 2. Database Setup
Run the SQL migration file to create the bookings table:
```sql
-- Execute the contents of migrations/create_bookings_table.sql in your Supabase SQL editor
```

### 3. Required Tables
Ensure these tables exist in your Supabase database:

**users table:**
```sql
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**parking_lots table:**
```sql
CREATE TABLE parking_lots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    total_spaces INTEGER NOT NULL,
    available_spaces INTEGER NOT NULL,
    price_per_hour DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Start the Server
```bash
cd parking-backend
npm install
npm start
```

## Error Handling

The API returns appropriate HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `404`: Not Found
- `409`: Conflict (booking time slot conflict)
- `500`: Internal Server Error

## Testing

You can test the booking system using tools like Postman or curl:

```bash
# Login to get JWT token
curl -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Create a booking (replace TOKEN with actual JWT)
curl -X POST http://localhost:4000/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "parking_lot_id": "lot-uuid",
    "start_time": "2024-01-15T10:00:00Z",
    "end_time": "2024-01-15T12:00:00Z"
  }'
```

## Features Implemented

✅ **Core Booking Operations:**
- Create, read, update, delete bookings
- User-specific booking management
- Admin parking lot booking views

✅ **Business Logic:**
- Time conflict detection
- Automatic cost calculation
- Space availability management
- Booking status tracking

✅ **Security:**
- JWT authentication for all endpoints
- User-specific data access
- Input validation and sanitization

✅ **Database Integration:**
- Supabase integration
- Proper foreign key relationships
- Indexed queries for performance

## Next Steps

Consider implementing:
- Payment processing integration
- Email notifications for bookings
- Booking reminders
- Advanced reporting and analytics
- Mobile app integration
- Real-time updates via WebSockets
