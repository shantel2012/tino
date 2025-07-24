-- Create parking lot owners table for parking management system
-- This table stores information about parking lot owners and their properties
-- Run this migration in Supabase SQL Editor

-- Create parking_owners table
CREATE TABLE IF NOT EXISTS parking_owners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Owner Information
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    registration_number VARCHAR(100), -- Business registration number
    
    -- Contact Information
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    alternative_phone VARCHAR(20),
    
    -- Address Information
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Zimbabwe',
    
    -- Business Information
    business_type VARCHAR(50) DEFAULT 'individual', -- 'individual', 'company', 'government', 'organization'
    tax_number VARCHAR(100),
    bank_account_name VARCHAR(255),
    bank_account_number VARCHAR(100),
    bank_name VARCHAR(255),
    bank_branch VARCHAR(255),
    
    -- Revenue Sharing
    commission_rate DECIMAL(5,2) DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100), -- Percentage
    payment_terms VARCHAR(50) DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly', 'quarterly'
    
    -- Status and Verification
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMPTZ,
    verification_documents JSONB DEFAULT '[]'::jsonb,
    
    -- Profile and Preferences
    profile_picture_url TEXT,
    bio TEXT,
    website VARCHAR(255),
    social_media JSONB DEFAULT '{}'::jsonb,
    
    -- Notifications and Preferences
    notification_preferences JSONB DEFAULT '{
        "email_notifications": true,
        "sms_notifications": true,
        "revenue_reports": true,
        "booking_alerts": false,
        "maintenance_alerts": true
    }'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone ~ '^[+]?[0-9\s\-\(\)]+$' OR phone IS NULL),
    CONSTRAINT valid_business_type CHECK (business_type IN ('individual', 'company', 'government', 'organization')),
    CONSTRAINT valid_payment_terms CHECK (payment_terms IN ('daily', 'weekly', 'monthly', 'quarterly'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parking_owners_email ON parking_owners(email);
CREATE INDEX IF NOT EXISTS idx_parking_owners_name ON parking_owners(name);
CREATE INDEX IF NOT EXISTS idx_parking_owners_company ON parking_owners(company_name) WHERE company_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parking_owners_is_active ON parking_owners(is_active);
CREATE INDEX IF NOT EXISTS idx_parking_owners_is_verified ON parking_owners(is_verified);
CREATE INDEX IF NOT EXISTS idx_parking_owners_business_type ON parking_owners(business_type);
CREATE INDEX IF NOT EXISTS idx_parking_owners_city ON parking_owners(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parking_owners_created_at ON parking_owners(created_at DESC);

-- Create GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_parking_owners_verification_docs ON parking_owners USING GIN (verification_documents);
CREATE INDEX IF NOT EXISTS idx_parking_owners_social_media ON parking_owners USING GIN (social_media);
CREATE INDEX IF NOT EXISTS idx_parking_owners_notifications ON parking_owners USING GIN (notification_preferences);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_parking_owners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS trigger_update_parking_owners_updated_at ON parking_owners;
CREATE TRIGGER trigger_update_parking_owners_updated_at
    BEFORE UPDATE ON parking_owners
    FOR EACH ROW
    EXECUTE FUNCTION update_parking_owners_updated_at();

-- Add owner_id column to parking_lots table
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES parking_owners(id) ON DELETE SET NULL;

-- Create index for the foreign key
CREATE INDEX IF NOT EXISTS idx_parking_lots_owner_id ON parking_lots(owner_id);

-- Enable Row Level Security
ALTER TABLE parking_owners ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for parking_owners
-- Owners can view and edit their own information
CREATE POLICY "Owners can view own information" ON parking_owners
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND email = parking_owners.email
        )
    );

CREATE POLICY "Owners can update own information" ON parking_owners
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND email = parking_owners.email
        )
    );

-- Admins can view and manage all owners
CREATE POLICY "Admins can view all owners" ON parking_owners
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage all owners" ON parking_owners
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Insert sample parking lot owners
INSERT INTO parking_owners (
    name,
    company_name,
    registration_number,
    email,
    phone,
    address,
    city,
    country,
    business_type,
    tax_number,
    bank_account_name,
    bank_account_number,
    bank_name,
    commission_rate,
    payment_terms,
    is_verified,
    verification_date,
    bio
) VALUES 
-- Individual Owner
(
    'Tendai Mukamuri',
    'Mukamuri Properties',
    'BP/2023/001234',
    'tendai@mukamuri.co.zw',
    '+263-77-123-4567',
    '15 Borrowdale Road, Borrowdale',
    'Harare',
    'Zimbabwe',
    'company',
    'TAX123456789',
    'Mukamuri Properties',
    '1234567890',
    'CBZ Bank',
    8.50,
    'monthly',
    true,
    NOW(),
    'Experienced property developer specializing in commercial parking facilities in Harare.'
),

-- Government Entity
(
    'City of Harare',
    'Harare City Council',
    'GOV/HCC/001',
    'parking@hararecity.gov.zw',
    '+263-4-575-000',
    'Town House, Africa Unity Square',
    'Harare',
    'Zimbabwe',
    'government',
    'GOV001HCC',
    'Harare City Council',
    '9876543210',
    'Reserve Bank of Zimbabwe',
    0.00,
    'monthly',
    true,
    NOW(),
    'Municipal parking facilities managed by Harare City Council for public benefit.'
),

-- Private Company
(
    'Chipo Zvavahera',
    'ZimParking Solutions Ltd',
    'BP/2022/005678',
    'chipo@zimparking.co.zw',
    '+263-78-987-6543',
    '45 Samora Machel Avenue, Eastlea',
    'Harare',
    'Zimbabwe',
    'company',
    'TAX987654321',
    'ZimParking Solutions Ltd',
    '5555666677',
    'Steward Bank',
    12.00,
    'monthly',
    true,
    NOW(),
    'Leading parking management company providing secure parking solutions across Zimbabwe.'
),

-- Individual Owner - Bulawayo
(
    'Nkosana Ndlovu',
    'Ndlovu Investments',
    'BP/BYO/2023/001',
    'nkosana@ndlovuinvest.co.zw',
    '+263-9-888-1234',
    '78 Fife Street, Bulawayo',
    'Bulawayo',
    'Zimbabwe',
    'company',
    'TAX111222333',
    'Ndlovu Investments',
    '1111222233',
    'CABS',
    10.00,
    'monthly',
    true,
    NOW(),
    'Property investor focused on commercial real estate in Bulawayo and surrounding areas.'
),

-- Tourism Company - Victoria Falls
(
    'Farai Mutasa',
    'Victoria Falls Tourism Holdings',
    'BP/VF/2021/007',
    'farai@vftourism.co.zw',
    '+263-13-44-567',
    'Livingstone Way, Victoria Falls',
    'Victoria Falls',
    'Zimbabwe',
    'company',
    'TAX444555666',
    'VF Tourism Holdings',
    '7777888899',
    'FBC Bank',
    15.00,
    'monthly',
    true,
    NOW(),
    'Tourism-focused parking and hospitality services in the Victoria Falls area.'
),

-- Hospital/Healthcare
(
    'Dr. Rutendo Chimedza',
    'Healthcare Properties Zimbabwe',
    'BP/2023/009876',
    'rutendo@healthprops.co.zw',
    '+263-4-791-999',
    '23 Avondale Shopping Centre',
    'Harare',
    'Zimbabwe',
    'company',
    'TAX777888999',
    'Healthcare Properties Zim',
    '3333444455',
    'Barclays Bank',
    7.50,
    'monthly',
    true,
    NOW(),
    'Specialized in healthcare facility parking and medical center property management.'
),

-- University/Educational
(
    'Prof. Blessing Makoni',
    'Educational Facilities Management',
    'BP/EDU/2022/003',
    'blessing@edufacilities.co.zw',
    '+263-4-303-555',
    'Mount Pleasant Campus',
    'Harare',
    'Zimbabwe',
    'organization',
    'TAX555666777',
    'Educational Facilities Mgmt',
    '6666777788',
    'ZB Bank',
    5.00,
    'monthly',
    true,
    NOW(),
    'Managing parking and transportation facilities for educational institutions across Zimbabwe.'
);

-- Update parking_lots table to assign owners
UPDATE parking_lots SET owner_id = (
    SELECT id FROM parking_owners WHERE email = 'tendai@mukamuri.co.zw'
) WHERE name IN ('Harare Central Business District Parking', 'Eastgate Shopping Centre Parking');

UPDATE parking_lots SET owner_id = (
    SELECT id FROM parking_owners WHERE email = 'parking@hararecity.gov.zw'
) WHERE name IN ('Robert Gabriel Mugabe International Airport Parking', 'National Sports Stadium Parking');

UPDATE parking_lots SET owner_id = (
    SELECT id FROM parking_owners WHERE email = 'chipo@zimparking.co.zw'
) WHERE name IN ('Borrowdale Residential Parking');

UPDATE parking_lots SET owner_id = (
    SELECT id FROM parking_owners WHERE email = 'nkosana@ndlovuinvest.co.zw'
) WHERE name IN ('Bulawayo City Centre Parking');

UPDATE parking_lots SET owner_id = (
    SELECT id FROM parking_owners WHERE email = 'farai@vftourism.co.zw'
) WHERE name IN ('Victoria Falls Tourism Parking');

UPDATE parking_lots SET owner_id = (
    SELECT id FROM parking_owners WHERE email = 'rutendo@healthprops.co.zw'
) WHERE name IN ('Parirenyatwa Hospital Parking');

UPDATE parking_lots SET owner_id = (
    SELECT id FROM parking_owners WHERE email = 'blessing@edufacilities.co.zw'
) WHERE name IN ('University of Zimbabwe Main Campus Parking', 'Mutare Central Parking');

-- Create view for parking lots with owner information
CREATE OR REPLACE VIEW parking_lots_with_owners AS
SELECT 
    pl.id,
    pl.name as parking_lot_name,
    pl.location,
    pl.description,
    pl.total_spaces,
    pl.available_spaces,
    pl.price_per_hour,
    pl.is_active as lot_active,
    pl.created_at as lot_created_at,
    
    -- Owner information
    po.id as owner_id,
    po.name as owner_name,
    po.company_name,
    po.email as owner_email,
    po.phone as owner_phone,
    po.business_type,
    po.commission_rate,
    po.payment_terms,
    po.is_verified as owner_verified,
    
    -- Calculated fields
    ROUND(
        CASE 
            WHEN pl.total_spaces > 0 
            THEN ((pl.total_spaces - pl.available_spaces)::DECIMAL / pl.total_spaces) * 100
            ELSE 0 
        END, 2
    ) as occupancy_percentage,
    
    (pl.total_spaces - pl.available_spaces) as occupied_spaces
    
FROM parking_lots pl
LEFT JOIN parking_owners po ON pl.owner_id = po.id
ORDER BY pl.name;

-- Create function to calculate owner revenue
CREATE OR REPLACE FUNCTION calculate_owner_revenue(
    owner_uuid UUID,
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_revenue DECIMAL,
    owner_commission DECIMAL,
    platform_commission DECIMAL,
    total_bookings INTEGER
) AS $$
DECLARE
    owner_commission_rate DECIMAL;
BEGIN
    -- Get owner's commission rate
    SELECT commission_rate INTO owner_commission_rate
    FROM parking_owners
    WHERE id = owner_uuid;
    
    -- Calculate revenue
    RETURN QUERY
    SELECT 
        COALESCE(SUM(b.total_cost), 0) as total_revenue,
        COALESCE(SUM(b.total_cost * (100 - owner_commission_rate) / 100), 0) as owner_commission,
        COALESCE(SUM(b.total_cost * owner_commission_rate / 100), 0) as platform_commission,
        COUNT(b.id)::INTEGER as total_bookings
    FROM bookings b
    JOIN parking_lots pl ON b.parking_lot_id = pl.id
    WHERE pl.owner_id = owner_uuid
      AND b.status = 'completed'
      AND b.payment_status = 'paid'
      AND b.created_at >= start_date
      AND b.created_at <= end_date;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE parking_owners IS 'Stores information about parking lot owners including contact details, business information, and revenue sharing terms';
COMMENT ON COLUMN parking_owners.commission_rate IS 'Platform commission percentage (owner receives 100% - commission_rate)';
COMMENT ON COLUMN parking_owners.verification_documents IS 'JSON array of uploaded verification document URLs and types';
COMMENT ON COLUMN parking_owners.notification_preferences IS 'JSON object storing owner notification preferences';
COMMENT ON VIEW parking_lots_with_owners IS 'Combined view of parking lots with their owner information';
COMMENT ON FUNCTION calculate_owner_revenue IS 'Calculate revenue breakdown for a specific owner within a date range';

-- Success message
SELECT 'Parking owners table created successfully!' as status,
       'Sample owners added and linked to parking lots' as note,
       COUNT(*) || ' owners created' as count
FROM parking_owners;
