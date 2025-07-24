-- Create favorites table for user favorite parking lots
-- This migration adds favorites functionality to the parking management system
-- Run this migration in Supabase SQL Editor

-- Create favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parking_lot_id UUID NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure a user can't favorite the same parking lot twice
    UNIQUE(user_id, parking_lot_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_parking_lot_id ON user_favorites(parking_lot_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON user_favorites(created_at DESC);

-- Create view for user favorites with parking lot details
CREATE OR REPLACE VIEW user_favorites_with_details AS
SELECT 
    uf.id as favorite_id,
    uf.user_id,
    uf.created_at as favorited_at,
    
    -- Parking lot details
    pl.id as parking_lot_id,
    pl.name as parking_lot_name,
    pl.location,
    pl.description,
    pl.total_spaces,
    pl.available_spaces,
    pl.price_per_hour,
    pl.opening_time,
    pl.closing_time,
    pl.is_24_hours,
    pl.features,
    pl.contact_phone,
    pl.contact_email,
    pl.is_active,
    pl.latitude,
    pl.longitude,
    
    -- Owner details
    po.name as owner_name,
    po.company_name,
    po.business_type,
    
    -- Calculated fields
    CASE 
        WHEN pl.total_spaces > 0 
        THEN ROUND(((pl.total_spaces - pl.available_spaces)::DECIMAL / pl.total_spaces) * 100, 2)
        ELSE 0 
    END as occupancy_percentage,
    
    CASE 
        WHEN pl.available_spaces = 0 THEN 'full'
        WHEN pl.available_spaces <= (pl.total_spaces * 0.1) THEN 'nearly_full'
        WHEN pl.available_spaces >= (pl.total_spaces * 0.8) THEN 'mostly_empty'
        ELSE 'available'
    END as availability_status,
    
    -- Current time status
    CASE 
        WHEN pl.is_24_hours THEN 'open'
        WHEN CURRENT_TIME BETWEEN pl.opening_time AND pl.closing_time THEN 'open'
        ELSE 'closed'
    END as current_status
    
FROM user_favorites uf
JOIN parking_lots pl ON uf.parking_lot_id = pl.id
LEFT JOIN parking_owners po ON pl.owner_id = po.id
WHERE pl.is_active = true
ORDER BY uf.created_at DESC;

-- Create function to get user's favorite parking lots count
CREATE OR REPLACE FUNCTION get_user_favorites_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM user_favorites 
        WHERE user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to check if parking lot is favorited by user
CREATE OR REPLACE FUNCTION is_parking_lot_favorited(user_uuid UUID, parking_lot_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM user_favorites 
        WHERE user_id = user_uuid AND parking_lot_id = parking_lot_uuid
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to get popular parking lots (most favorited)
CREATE OR REPLACE FUNCTION get_popular_parking_lots(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    parking_lot_id UUID,
    parking_lot_name VARCHAR,
    location TEXT,
    favorites_count BIGINT,
    available_spaces INTEGER,
    total_spaces INTEGER,
    price_per_hour DECIMAL,
    occupancy_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.id as parking_lot_id,
        pl.name as parking_lot_name,
        pl.location,
        COUNT(uf.id) as favorites_count,
        pl.available_spaces,
        pl.total_spaces,
        pl.price_per_hour,
        CASE 
            WHEN pl.total_spaces > 0 
            THEN ROUND(((pl.total_spaces - pl.available_spaces)::DECIMAL / pl.total_spaces) * 100, 2)
            ELSE 0 
        END as occupancy_percentage
    FROM parking_lots pl
    LEFT JOIN user_favorites uf ON pl.id = uf.parking_lot_id
    WHERE pl.is_active = true
    GROUP BY pl.id, pl.name, pl.location, pl.available_spaces, pl.total_spaces, pl.price_per_hour
    ORDER BY favorites_count DESC, pl.name
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_favorites
CREATE POLICY "Users can view own favorites" ON user_favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add own favorites" ON user_favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own favorites" ON user_favorites
    FOR DELETE USING (auth.uid() = user_id);

-- Create policy for admins to view all favorites
CREATE POLICY "Admins can view all favorites" ON user_favorites
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add comments for documentation
COMMENT ON TABLE user_favorites IS 'Store user favorite parking lots for quick access';
COMMENT ON VIEW user_favorites_with_details IS 'Complete favorite parking lots with all details for display';
COMMENT ON FUNCTION get_user_favorites_count IS 'Get count of user favorite parking lots';
COMMENT ON FUNCTION is_parking_lot_favorited IS 'Check if a parking lot is favorited by user';
COMMENT ON FUNCTION get_popular_parking_lots IS 'Get most popular (favorited) parking lots';

-- Success message
SELECT 'User favorites system created successfully!' as status,
       'Users can now favorite parking lots for quick access' as note;
