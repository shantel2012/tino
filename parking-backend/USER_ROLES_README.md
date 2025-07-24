# User Roles & Permissions System Documentation

## Overview
The User Roles & Permissions system provides role-based access control (RBAC) for the parking management system. It distinguishes between regular users and administrators, controlling access to various system features and endpoints.

## User Roles

### 1. Regular User (`user`)
- **Default role** assigned to all new registrations
- Can view available parking lots
- Can create, view, update, and cancel their own bookings
- Cannot access admin functions

### 2. Administrator (`admin`)
- Full system access and management capabilities
- Can manage all parking lots (create, update, delete)
- Can view and manage all user bookings
- Can manage user accounts and roles
- Can access system statistics and analytics
- Can create other admin users

## Database Schema

### Users Table Updates
```sql
-- Added role column to existing users table
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user'));
CREATE INDEX idx_users_role ON users(role);
```

### Admin Permissions Table
```sql
-- Granular permissions system for future expansion
CREATE TABLE admin_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(50) NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    UNIQUE(user_id, permission)
);
```

## Middleware Functions

### 1. `requireAdmin`
- Ensures the authenticated user has admin role
- Used for admin-only endpoints

### 2. `requirePermission(permission)`
- Checks for specific permissions
- Admins automatically have all permissions
- Regular users need explicit permission grants

### 3. `requireOwnershipOrAdmin(resourceUserIdField)`
- Allows access if user owns the resource OR is an admin
- Used for endpoints where users can access their own data

### 4. `addUserRole`
- Adds user role information to the request object
- Used for endpoints that need role information but don't restrict access

## API Endpoints

### Admin User Management

#### Get All Users
**GET** `/admin/users?page=1&limit=10&role=user&search=john`

**Query Parameters:**
- `page` (optional): Page number for pagination
- `limit` (optional): Number of users per page
- `role` (optional): Filter by role (`admin` or `user`)
- `search` (optional): Search by name or email

**Response:**
```json
{
  "users": [
    {
      "id": "user-uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

#### Update User Role
**PATCH** `/admin/users/:userId/role`

**Request Body:**
```json
{
  "role": "admin"
}
```

**Response:** Updated user object

#### Delete User
**DELETE** `/admin/users/:userId`

**Response:**
```json
{
  "message": "User deleted successfully",
  "deletedUser": {
    "id": "user-uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

#### Create Admin User
**POST** `/admin/users/admin`

**Request Body:**
```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "securepassword"
}
```

**Response:** Created admin user object

#### Get User Permissions
**GET** `/admin/users/:userId/permissions`

**Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  },
  "permissions": [
    {
      "permission": "manage_parking_lots",
      "granted_at": "2024-01-15T10:00:00Z",
      "granted_by": "admin-uuid"
    }
  ]
}
```

### System Statistics
**GET** `/admin/stats`

**Response:**
```json
{
  "users": {
    "total": 150,
    "admin": 5,
    "user": 145
  },
  "parking_lots": {
    "total_lots": 10,
    "total_spaces": 500,
    "available_spaces": 320,
    "occupied_spaces": 180
  },
  "bookings": {
    "total_bookings": 1250,
    "active": 45,
    "completed": 1180,
    "cancelled": 25,
    "total_revenue": 15750.50
  },
  "recent_activity": {
    "new_bookings_30d": 85,
    "new_users_30d": 12
  },
  "generated_at": "2024-01-15T10:00:00Z"
}
```

## Role-Based Endpoint Access

### Public Endpoints (No Authentication)
- `POST /signup` - User registration
- `POST /login` - User authentication
- `GET /` - API health check

### User Endpoints (Authenticated Users)
- `GET /parking-lots` - View available parking lots
- `POST /bookings` - Create booking
- `GET /bookings/user` - View own bookings
- `GET /bookings/:id` - View own booking
- `PUT /bookings/:id` - Update own booking
- `DELETE /bookings/:id` - Cancel own booking

### Admin-Only Endpoints
- `POST /parking-lots` - Create parking lot
- `PATCH /parking-lots/:id/spaces` - Update parking lot spaces
- `GET /bookings/parking-lot/:id` - View all bookings for a parking lot
- All `/admin/*` endpoints

## Permission System

### Available Permissions
- `manage_parking_lots` - Create, update, delete parking lots
- `view_all_bookings` - View bookings from all users
- `manage_users` - Create, update, delete user accounts
- `view_analytics` - Access system statistics and reports
- `system_settings` - Modify system configuration

### Permission Assignment
- **Admins**: Automatically have all permissions
- **Users**: No permissions by default
- **Custom**: Specific permissions can be granted to users via the admin_permissions table

## Security Features

### Role Validation
- Role checks are performed on every protected request
- Database queries ensure role consistency
- Middleware prevents privilege escalation

### Admin Protection
- Admins cannot demote themselves
- Admins cannot delete their own accounts
- At least one admin must always exist in the system

### Input Validation
- Role values are validated against allowed options
- User IDs are validated before role changes
- Proper error handling for invalid requests

## Setup Instructions

### 1. Run Database Migration
Execute the SQL migration file in your Supabase database:
```bash
# Run migrations/add_user_roles.sql in Supabase SQL editor
```

### 2. Create First Admin User
After running the migration, you can:

**Option A: Use the default admin created by migration**
- Email: `admin@parking.com`
- Password: Update the hash in the migration file

**Option B: Promote existing user to admin**
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

**Option C: Use the API endpoint (requires existing admin)**
```bash
curl -X POST http://localhost:4000/admin/users/admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "name": "System Admin",
    "email": "admin@example.com",
    "password": "securepassword"
  }'
```

### 3. Test Role-Based Access
```bash
# Login as regular user
curl -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Try to access admin endpoint (should fail)
curl -X GET http://localhost:4000/admin/users \
  -H "Authorization: Bearer USER_JWT_TOKEN"

# Login as admin
curl -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Access admin endpoint (should succeed)
curl -X GET http://localhost:4000/admin/users \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

## Error Handling

### Common Error Responses
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - Insufficient permissions for the requested action
- `404 Not Found` - User or resource not found
- `400 Bad Request` - Invalid role or request data

### Example Error Response
```json
{
  "error": "Access denied: Admin privileges required"
}
```

## Best Practices

### Security
1. **Principle of Least Privilege**: Users get minimum required permissions
2. **Regular Audits**: Review admin users and permissions regularly
3. **Strong Passwords**: Enforce strong password policies for admin accounts
4. **Session Management**: Implement proper JWT token expiration

### Development
1. **Test Role Boundaries**: Verify access controls work correctly
2. **Error Handling**: Provide clear error messages for permission issues
3. **Logging**: Log admin actions for audit trails
4. **Documentation**: Keep role documentation updated

## Future Enhancements

### Planned Features
- **Role Hierarchy**: Super admin, admin, manager, user levels
- **Custom Roles**: Create custom roles with specific permission sets
- **Time-Based Permissions**: Temporary admin access
- **API Key Management**: Service-to-service authentication
- **Audit Logging**: Detailed logs of all admin actions
- **Permission Groups**: Group permissions for easier management

### Integration Points
- **Frontend Role Display**: Show user role in UI
- **Feature Flags**: Enable/disable features based on roles
- **Notification Preferences**: Role-based notification settings
- **Reporting Access**: Role-based report visibility
