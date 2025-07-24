-- Create user profiles table for extended user information
-- This table extends the basic users table with additional profile details
-- Run this migration in Supabase SQL Editor

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Personal Information
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'South Africa',
    date_of_birth DATE,
    
    -- Profile Media
    profile_picture_url TEXT,
    
    -- Preferences (stored as JSON)
    preferences JSONB DEFAULT '{
        "notifications": {
            "email": true,
            "sms": true,
            "push": true
        },
        "parking": {
            "preferred_payment_method": "card",
            "auto_extend_booking": false,
            "reminder_minutes": 30
        },
        "privacy": {
            "show_profile": false,
            "share_location": false
        }
    }'::jsonb,
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    
    -- Account Status
    is_verified BOOLEAN DEFAULT false,
    verification_method VARCHAR(20), -- 'email', 'phone', 'document'
    verification_date TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id),
    CONSTRAINT valid_phone CHECK (phone ~ '^[+]?[0-9\s\-\(\)]+$' OR phone IS NULL),
    CONSTRAINT valid_postal_code CHECK (postal_code ~ '^[0-9A-Za-z\s\-]+$' OR postal_code IS NULL)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_city ON user_profiles(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_verified ON user_profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at DESC);

-- Create GIN index for JSONB preferences for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences ON user_profiles USING GIN (preferences);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS trigger_update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trigger_update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- Create function to automatically create profile when user is created
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create profile for new users
DROP TRIGGER IF EXISTS trigger_create_user_profile ON users;
CREATE TRIGGER trigger_create_user_profile
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view and edit their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all profiles (for support purposes)
CREATE POLICY "Admins can update all profiles" ON user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create view for user profile summary (joins users and profiles)
CREATE OR REPLACE VIEW user_profile_summary AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u.created_at as user_created_at,
    p.phone,
    p.address,
    p.city,
    p.state,
    p.country,
    p.date_of_birth,
    p.profile_picture_url,
    p.is_verified,
    p.verification_method,
    p.verification_date,
    p.preferences,
    p.emergency_contact_name,
    p.emergency_contact_phone,
    p.emergency_contact_relationship,
    p.created_at as profile_created_at,
    p.updated_at as profile_updated_at,
    -- Calculate age if date_of_birth is provided
    CASE 
        WHEN p.date_of_birth IS NOT NULL 
        THEN EXTRACT(YEAR FROM AGE(p.date_of_birth))
        ELSE NULL 
    END as age,
    -- Check if profile is complete
    CASE 
        WHEN p.phone IS NOT NULL 
             AND p.address IS NOT NULL 
             AND p.city IS NOT NULL 
        THEN true 
        ELSE false 
    END as profile_complete
FROM users u
LEFT JOIN user_profiles p ON u.id = p.user_id;

-- Create function to get user preference
CREATE OR REPLACE FUNCTION get_user_preference(user_uuid UUID, preference_path TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    SELECT preferences #>> string_to_array(preference_path, '.')
    INTO result
    FROM user_profiles
    WHERE user_id = user_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to update user preference
CREATE OR REPLACE FUNCTION update_user_preference(
    user_uuid UUID, 
    preference_path TEXT, 
    new_value TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    path_array TEXT[];
BEGIN
    path_array := string_to_array(preference_path, '.');
    
    UPDATE user_profiles
    SET preferences = jsonb_set(
        preferences,
        path_array,
        to_jsonb(new_value),
        true
    ),
    updated_at = NOW()
    WHERE user_id = user_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create profiles for existing users (if any)
INSERT INTO user_profiles (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE user_profiles IS 'Extended user profile information including personal details, preferences, and verification status';
COMMENT ON COLUMN user_profiles.preferences IS 'JSON object storing user preferences for notifications, parking, and privacy settings';
COMMENT ON COLUMN user_profiles.is_verified IS 'Whether the user has completed identity verification';
COMMENT ON COLUMN user_profiles.verification_method IS 'Method used for verification: email, phone, or document';
COMMENT ON VIEW user_profile_summary IS 'Combined view of users and their profile information';
COMMENT ON FUNCTION get_user_preference IS 'Retrieve a specific user preference value using dot notation path';
COMMENT ON FUNCTION update_user_preference IS 'Update a specific user preference value using dot notation path';

-- Success message
SELECT 'User profiles table created successfully!' as status,
       'Profiles automatically created for existing users' as note,
       'Use user_profile_summary view for complete user information' as tip;
