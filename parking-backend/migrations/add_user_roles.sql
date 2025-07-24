-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user'));

-- Create index for role column for better query performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Update existing users to have 'user' role if null
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Create admin_permissions table for granular permissions (optional for future expansion)
CREATE TABLE IF NOT EXISTS admin_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(50) NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    UNIQUE(user_id, permission)
);

-- Create index for permissions
CREATE INDEX IF NOT EXISTS idx_admin_permissions_user_id ON admin_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_permission ON admin_permissions(permission);

-- Insert default admin user (update email/password as needed)
-- Note: You should change this email and password in production
INSERT INTO users (name, email, password, role) 
VALUES (
    'System Admin', 
    'admin@parking.com', 
    '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZQZQZQZQZQZQZQ', -- placeholder hash
    'admin'
) ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- Grant all permissions to admin users (for future use)
INSERT INTO admin_permissions (user_id, permission, granted_by)
SELECT 
    u.id,
    perm.permission,
    u.id
FROM users u
CROSS JOIN (
    VALUES 
        ('manage_parking_lots'),
        ('view_all_bookings'),
        ('manage_users'),
        ('view_analytics'),
        ('system_settings')
) AS perm(permission)
WHERE u.role = 'admin'
ON CONFLICT (user_id, permission) DO NOTHING;
