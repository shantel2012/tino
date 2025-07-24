-- Add GPS mapping functions and enhancements for parking management system
-- This migration adds location-based search and mapping capabilities
-- Run this migration in Supabase SQL Editor

-- Create function to calculate distance between two GPS coordinates using Haversine formula
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL,
    lng1 DECIMAL,
    lat2 DECIMAL,
    lng2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    R DECIMAL := 6371; -- Earth's radius in kilometers
    dLat DECIMAL;
    dLng DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dLat := RADIANS(lat2 - lat1);
    dLng := RADIANS(lng2 - lng1);
    
    a := SIN(dLat / 2) * SIN(dLat / 2) +
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
         SIN(dLng / 2) * SIN(dLng / 2);
    
    c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
    
    RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- Create function to get nearby parking lots within a specified radius
CREATE OR REPLACE FUNCTION get_nearby_parking_lots(
    user_lat DECIMAL,
    user_lng DECIMAL,
    radius_km DECIMAL DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    location TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    total_spaces INTEGER,
    available_spaces INTEGER,
    price_per_hour DECIMAL,
    distance_km DECIMAL,
    is_active BOOLEAN,
    owner_name VARCHAR,
    company_name VARCHAR,
    occupancy_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.id,
        pl.name,
        pl.location,
        pl.latitude,
        pl.longitude,
        pl.total_spaces,
        pl.available_spaces,
        pl.price_per_hour,
        calculate_distance(user_lat, user_lng, pl.latitude, pl.longitude) as distance_km,
        pl.is_active,
        po.name as owner_name,
        po.company_name,
        CASE 
            WHEN pl.total_spaces > 0 
            THEN ROUND(((pl.total_spaces - pl.available_spaces)::DECIMAL / pl.total_spaces) * 100, 2)
            ELSE 0 
        END as occupancy_percentage
    FROM parking_lots pl
    LEFT JOIN parking_owners po ON pl.owner_id = po.id
    WHERE pl.is_active = true
      AND pl.latitude IS NOT NULL 
      AND pl.longitude IS NOT NULL
      AND calculate_distance(user_lat, user_lng, pl.latitude, pl.longitude) <= radius_km
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- Create function to find parking lots within map bounds
CREATE OR REPLACE FUNCTION get_parking_lots_in_bounds(
    north_lat DECIMAL,
    south_lat DECIMAL,
    east_lng DECIMAL,
    west_lng DECIMAL
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    location TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    total_spaces INTEGER,
    available_spaces INTEGER,
    price_per_hour DECIMAL,
    is_active BOOLEAN,
    owner_name VARCHAR,
    company_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.id,
        pl.name,
        pl.location,
        pl.latitude,
        pl.longitude,
        pl.total_spaces,
        pl.available_spaces,
        pl.price_per_hour,
        pl.is_active,
        po.name as owner_name,
        po.company_name
    FROM parking_lots pl
    LEFT JOIN parking_owners po ON pl.owner_id = po.id
    WHERE pl.is_active = true
      AND pl.latitude IS NOT NULL 
      AND pl.longitude IS NOT NULL
      AND pl.latitude BETWEEN south_lat AND north_lat
      AND pl.longitude BETWEEN west_lng AND east_lng
    ORDER BY pl.name;
END;
$$ LANGUAGE plpgsql;

-- Create function to get the closest parking lot to a given location
CREATE OR REPLACE FUNCTION get_closest_parking_lot(
    user_lat DECIMAL,
    user_lng DECIMAL,
    max_radius_km DECIMAL DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    location TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    available_spaces INTEGER,
    price_per_hour DECIMAL,
    distance_km DECIMAL,
    owner_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.id,
        pl.name,
        pl.location,
        pl.latitude,
        pl.longitude,
        pl.available_spaces,
        pl.price_per_hour,
        calculate_distance(user_lat, user_lng, pl.latitude, pl.longitude) as distance_km,
        po.name as owner_name
    FROM parking_lots pl
    LEFT JOIN parking_owners po ON pl.owner_id = po.id
    WHERE pl.is_active = true
      AND pl.latitude IS NOT NULL 
      AND pl.longitude IS NOT NULL
      AND pl.available_spaces > 0
      AND calculate_distance(user_lat, user_lng, pl.latitude, pl.longitude) <= max_radius_km
    ORDER BY distance_km ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create table for user location history (optional - for analytics)
CREATE TABLE IF NOT EXISTS user_location_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    accuracy_meters INTEGER,
    search_query TEXT,
    search_radius_km DECIMAL,
    results_found INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_coordinates CHECK (
        latitude BETWEEN -90 AND 90 AND 
        longitude BETWEEN -180 AND 180
    )
);

-- Create indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_user_location_history_user_id ON user_location_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_location_history_coordinates ON user_location_history(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_user_location_history_created_at ON user_location_history(created_at DESC);

-- Create spatial index for parking lots coordinates (PostGIS-style if available)
CREATE INDEX IF NOT EXISTS idx_parking_lots_coordinates_spatial ON parking_lots(latitude, longitude);

-- Create table for popular routes/directions
CREATE TABLE IF NOT EXISTS popular_routes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_latitude DECIMAL(10,8) NOT NULL,
    from_longitude DECIMAL(11,8) NOT NULL,
    to_parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
    route_requests_count INTEGER DEFAULT 1,
    last_requested_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(from_latitude, from_longitude, to_parking_lot_id)
);

-- Create indexes for popular routes
CREATE INDEX IF NOT EXISTS idx_popular_routes_parking_lot ON popular_routes(to_parking_lot_id);
CREATE INDEX IF NOT EXISTS idx_popular_routes_requests_count ON popular_routes(route_requests_count DESC);
CREATE INDEX IF NOT EXISTS idx_popular_routes_from_coordinates ON popular_routes(from_latitude, from_longitude);

-- Create function to log route requests and track popular routes
CREATE OR REPLACE FUNCTION log_route_request(
    from_lat DECIMAL,
    from_lng DECIMAL,
    parking_lot_uuid UUID
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO popular_routes (from_latitude, from_longitude, to_parking_lot_id)
    VALUES (from_lat, from_lng, parking_lot_uuid)
    ON CONFLICT (from_latitude, from_longitude, to_parking_lot_id)
    DO UPDATE SET 
        route_requests_count = popular_routes.route_requests_count + 1,
        last_requested_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create view for parking lot map markers with all necessary information
CREATE OR REPLACE VIEW parking_lot_map_markers AS
SELECT 
    pl.id,
    pl.name,
    pl.location,
    pl.latitude,
    pl.longitude,
    pl.total_spaces,
    pl.available_spaces,
    pl.price_per_hour,
    pl.opening_time,
    pl.closing_time,
    pl.is_24_hours,
    pl.features,
    pl.contact_phone,
    pl.is_active,
    
    -- Owner information
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
    
FROM parking_lots pl
LEFT JOIN parking_owners po ON pl.owner_id = po.id
WHERE pl.latitude IS NOT NULL 
  AND pl.longitude IS NOT NULL
ORDER BY pl.name;

-- Create function to get parking lot statistics by area/region
CREATE OR REPLACE FUNCTION get_parking_stats_by_area(
    center_lat DECIMAL,
    center_lng DECIMAL,
    radius_km DECIMAL DEFAULT 10
)
RETURNS TABLE (
    total_lots INTEGER,
    total_spaces INTEGER,
    available_spaces INTEGER,
    average_price DECIMAL,
    occupancy_rate DECIMAL,
    lots_full INTEGER,
    lots_nearly_full INTEGER,
    lots_available INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_lots,
        SUM(pl.total_spaces)::INTEGER as total_spaces,
        SUM(pl.available_spaces)::INTEGER as available_spaces,
        ROUND(AVG(pl.price_per_hour), 2) as average_price,
        CASE 
            WHEN SUM(pl.total_spaces) > 0 
            THEN ROUND(((SUM(pl.total_spaces) - SUM(pl.available_spaces))::DECIMAL / SUM(pl.total_spaces)) * 100, 2)
            ELSE 0 
        END as occupancy_rate,
        COUNT(CASE WHEN pl.available_spaces = 0 THEN 1 END)::INTEGER as lots_full,
        COUNT(CASE WHEN pl.available_spaces > 0 AND pl.available_spaces <= (pl.total_spaces * 0.1) THEN 1 END)::INTEGER as lots_nearly_full,
        COUNT(CASE WHEN pl.available_spaces > (pl.total_spaces * 0.1) THEN 1 END)::INTEGER as lots_available
    FROM parking_lots pl
    WHERE pl.is_active = true
      AND pl.latitude IS NOT NULL 
      AND pl.longitude IS NOT NULL
      AND calculate_distance(center_lat, center_lng, pl.latitude, pl.longitude) <= radius_km;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security for new tables
ALTER TABLE user_location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE popular_routes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_location_history
CREATE POLICY "Users can view own location history" ON user_location_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own location history" ON user_location_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for popular_routes (read-only for users, full access for admins)
CREATE POLICY "Everyone can view popular routes" ON popular_routes
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage popular routes" ON popular_routes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add comments for documentation
COMMENT ON FUNCTION calculate_distance IS 'Calculate distance between two GPS coordinates using Haversine formula';
COMMENT ON FUNCTION get_nearby_parking_lots IS 'Find parking lots within specified radius of user location';
COMMENT ON FUNCTION get_parking_lots_in_bounds IS 'Get parking lots within map viewport bounds';
COMMENT ON FUNCTION get_closest_parking_lot IS 'Find the closest available parking lot to user location';
COMMENT ON FUNCTION log_route_request IS 'Log route requests to track popular destinations';
COMMENT ON FUNCTION get_parking_stats_by_area IS 'Get parking statistics for a specific geographic area';
COMMENT ON TABLE user_location_history IS 'Track user location searches for analytics and personalization';
COMMENT ON TABLE popular_routes IS 'Track popular routes and destinations for optimization';
COMMENT ON VIEW parking_lot_map_markers IS 'Complete parking lot information optimized for map display';

-- Success message
SELECT 'GPS mapping functions and tables created successfully!' as status,
       'Location-based search and mapping features are now available' as note;
