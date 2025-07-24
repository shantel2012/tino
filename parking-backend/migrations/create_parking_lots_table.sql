-- Create parking lots table for parking management system
-- This table stores information about different parking locations
-- Run this migration in Supabase SQL Editor

-- Create parking_lots table
CREATE TABLE IF NOT EXISTS parking_lots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100) DEFAULT 'Zimbabwe',
    location TEXT NOT NULL,
    description TEXT,
    total_spaces INTEGER NOT NULL CHECK (total_spaces > 0),
    available_spaces INTEGER NOT NULL CHECK (available_spaces >= 0),
    price_per_hour DECIMAL(10,2) NOT NULL CHECK (price_per_hour >= 0),
    
    -- Operating hours
    opening_time TIME DEFAULT '06:00:00',
    closing_time TIME DEFAULT '22:00:00',
    
    -- Features and amenities
    features JSONB DEFAULT '[]'::jsonb,
    
    -- Contact and management
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_24_hours BOOLEAN DEFAULT false,
    
    -- Location coordinates (optional for maps)
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT available_spaces_check CHECK (available_spaces <= total_spaces),
    CONSTRAINT valid_hours CHECK (opening_time < closing_time OR is_24_hours = true),
    CONSTRAINT valid_email CHECK (contact_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR contact_email IS NULL)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parking_lots_name ON parking_lots(name);
CREATE INDEX IF NOT EXISTS idx_parking_lots_location ON parking_lots(location);
CREATE INDEX IF NOT EXISTS idx_parking_lots_is_active ON parking_lots(is_active);
CREATE INDEX IF NOT EXISTS idx_parking_lots_available_spaces ON parking_lots(available_spaces);
CREATE INDEX IF NOT EXISTS idx_parking_lots_price ON parking_lots(price_per_hour);
CREATE INDEX IF NOT EXISTS idx_parking_lots_coordinates ON parking_lots(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create GIN index for features JSONB column
CREATE INDEX IF NOT EXISTS idx_parking_lots_features ON parking_lots USING GIN (features);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_parking_lots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS trigger_update_parking_lots_updated_at ON parking_lots;
CREATE TRIGGER trigger_update_parking_lots_updated_at
    BEFORE UPDATE ON parking_lots
    FOR EACH ROW
    EXECUTE FUNCTION update_parking_lots_updated_at();

-- Enable Row Level Security
ALTER TABLE parking_lots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Everyone can view active parking lots
CREATE POLICY "Everyone can view active parking lots" ON parking_lots
    FOR SELECT USING (is_active = true);

-- Admins can manage all parking lots
CREATE POLICY "Admins can manage parking lots" ON parking_lots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Insert sample parking lots data
INSERT INTO parking_lots (
    name, 
    location, 
    description,
    total_spaces, 
    available_spaces, 
    price_per_hour,
    opening_time,
    closing_time,
    features,
    contact_phone,
    contact_email,
    latitude,
    longitude,
    is_24_hours
) VALUES 
-- Harare CBD
(
    'Harare Central Business District Parking',
    'Corner of First Street & Jason Moyo Avenue, Harare CBD',
    'Premium parking facility in the heart of Harare business district. Covered parking with security.',
    150,
    120,
    5.00,
    '06:00:00',
    '22:00:00',
    '["covered", "security_cameras", "elevator", "disabled_access", "electric_charging"]'::jsonb,
    '+263-4-123-4567',
    'cbd@parkingmanager.co.zw',
    -17.8292,
    31.0522,
    false
),

-- Shopping Mall
(
    'Eastgate Shopping Centre Parking',
    'Eastgate Shopping Centre, Borrowdale, Harare',
    'Multi-level parking garage serving Eastgate Mall shoppers and visitors.',
    300,
    245,
    3.50,
    '07:00:00',
    '21:00:00',
    '["covered", "mall_access", "escalators", "family_parking", "disabled_access"]'::jsonb,
    '+263-4-217-6000',
    'eastgate@parkingmanager.co.zw',
    -17.7806,
    31.1242,
    false
),

-- Airport Parking
(
    'Robert Gabriel Mugabe International Airport Parking',
    'Robert Gabriel Mugabe International Airport, Harare',
    'Short-term and long-term parking for airport travelers. Shuttle service available.',
    500,
    380,
    8.00,
    '00:00:00',
    '23:59:59',
    '["covered", "shuttle_service", "security", "long_term", "short_term"]'::jsonb,
    '+263-4-575-111',
    'airport@parkingmanager.co.zw',
    -17.9318,
    31.0928,
    true
),

-- University Campus
(
    'University of Zimbabwe Main Campus Parking',
    'Mount Pleasant, Harare',
    'Student and staff parking facility. Valid student/staff ID required.',
    200,
    150,
    2.00,
    '06:00:00',
    '20:00:00',
    '["student_discount", "staff_parking", "bicycle_racks", "disabled_access"]'::jsonb,
    '+263-4-303-211',
    'uz@parkingmanager.co.zw',
    -17.7840,
    31.0534,
    false
),

-- Hospital Parking
(
    'Parirenyatwa Hospital Parking',
    'Parirenyatwa Group of Hospitals, Avondale, Harare',
    'Hospital visitor and staff parking. Patient drop-off zone available.',
    180,
    95,
    4.00,
    '00:00:00',
    '23:59:59',
    '["hospital_access", "patient_dropoff", "disabled_access", "emergency_parking"]'::jsonb,
    '+263-4-791-631',
    'hospital@parkingmanager.co.zw',
    -17.8047,
    31.0369,
    true
),

-- Residential Area
(
    'Borrowdale Residential Parking',
    'Borrowdale Brook Shopping Centre, Borrowdale, Harare',
    'Secure residential parking for apartment residents and visitors.',
    80,
    65,
    3.00,
    '06:00:00',
    '22:00:00',
    '["residential", "visitor_parking", "security_gate", "remote_access"]'::jsonb,
    '+263-4-882-701',
    'borrowdale@parkingmanager.co.zw',
    -17.7667,
    31.1167,
    false
),

-- Stadium/Event Parking
(
    'National Sports Stadium Parking',
    'National Sports Stadium, Causeway, Harare',
    'Large capacity parking for stadium events, concerts, and sports matches.',
    1000,
    850,
    6.00,
    '10:00:00',
    '23:00:00',
    '["event_parking", "large_capacity", "shuttle_service", "security"]'::jsonb,
    '+263-4-700-151',
    'stadium@parkingmanager.co.zw',
    -17.8406,
    31.0394,
    false
),

-- Bulawayo Location
(
    'Bulawayo City Centre Parking',
    'Corner of 9th Avenue & Fife Street, Bulawayo CBD',
    'Central parking facility serving Bulawayo city centre businesses and shoppers.',
    250,
    200,
    4.50,
    '06:00:00',
    '20:00:00',
    '["city_centre", "covered_sections", "security", "disabled_access"]'::jsonb,
    '+263-9-888-151',
    'bulawayo@parkingmanager.co.zw',
    -20.1500,
    28.5833,
    false
),

-- Victoria Falls Tourism
(
    'Victoria Falls Tourism Parking',
    'Livingstone Way, Victoria Falls',
    'Tourist parking facility near Victoria Falls with easy access to attractions and hotels.',
    400,
    320,
    7.00,
    '06:00:00',
    '22:00:00',
    '["tourism", "hotel_access", "tour_pickup", "security", "covered_sections"]'::jsonb,
    '+263-13-44-202',
    'vicfalls@parkingmanager.co.zw',
    -17.9243,
    25.8572,
    false
),

-- Mutare Business District
(
    'Mutare Central Parking',
    'Herbert Chitepo Street, Mutare CBD',
    'Central business district parking serving Mutare commercial area.',
    120,
    95,
    3.50,
    '07:00:00',
    '19:00:00',
    '["cbd_access", "security", "disabled_access", "bicycle_racks"]'::jsonb,
    '+263-20-64-711',
    'mutare@parkingmanager.co.zw',
    -18.9707,
    32.6473,
    false
);

-- Create view for parking lot statistics
CREATE OR REPLACE VIEW parking_lot_stats AS
SELECT 
    pl.id,
    pl.name,
    pl.location,
    pl.total_spaces,
    pl.available_spaces,
    (pl.total_spaces - pl.available_spaces) as occupied_spaces,
    ROUND(
        CASE 
            WHEN pl.total_spaces > 0 
            THEN ((pl.total_spaces - pl.available_spaces)::DECIMAL / pl.total_spaces) * 100
            ELSE 0 
        END, 2
    ) as occupancy_percentage,
    pl.price_per_hour,
    pl.is_active,
    pl.is_24_hours,
    -- Count active bookings for this parking lot
    COALESCE(booking_counts.active_bookings, 0) as active_bookings,
    -- Revenue calculation (simplified)
    COALESCE(booking_counts.total_revenue, 0) as total_revenue_today
FROM parking_lots pl
LEFT JOIN (
    SELECT 
        b.parking_lot_id,
        COUNT(CASE WHEN b.status = 'active' THEN 1 END) as active_bookings,
        SUM(CASE WHEN b.created_at >= CURRENT_DATE THEN b.total_cost ELSE 0 END) as total_revenue
    FROM bookings b
    GROUP BY b.parking_lot_id
) booking_counts ON pl.id = booking_counts.parking_lot_id
ORDER BY pl.name;

-- Add comments for documentation
COMMENT ON TABLE parking_lots IS 'Main table storing parking lot/facility information including location, capacity, pricing, and features';
COMMENT ON COLUMN parking_lots.features IS 'JSON array of parking lot features and amenities (e.g., ["covered", "security", "disabled_access"])';
COMMENT ON COLUMN parking_lots.available_spaces IS 'Current number of available parking spaces (updated in real-time)';
COMMENT ON COLUMN parking_lots.is_24_hours IS 'Whether the parking facility operates 24/7';
COMMENT ON VIEW parking_lot_stats IS 'Statistical view showing occupancy rates, revenue, and booking information for each parking lot';

-- Success message
SELECT 'Parking lots table created successfully!' as status,
       'Sample parking lots added for Zimbabwe cities' as note,
       COUNT(*) || ' parking lots created' as count
FROM parking_lots;
