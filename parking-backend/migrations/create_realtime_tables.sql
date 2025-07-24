-- Real-time system tables for parking management backend
-- Run this migration in Supabase SQL Editor

-- System announcements table
CREATE TABLE IF NOT EXISTS system_announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error', 'maintenance')),
    sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parking lot updates log table
CREATE TABLE IF NOT EXISTS parking_lot_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
    previous_available INTEGER NOT NULL,
    new_available INTEGER NOT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    update_type VARCHAR(20) DEFAULT 'automatic' CHECK (update_type IN ('automatic', 'manual', 'booking', 'cancellation')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real-time connection logs table
CREATE TABLE IF NOT EXISTS realtime_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    socket_id VARCHAR(255) NOT NULL,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    disconnected_at TIMESTAMPTZ,
    session_duration INTERVAL GENERATED ALWAYS AS (disconnected_at - connected_at) STORED,
    ip_address INET,
    user_agent TEXT
);

-- WebSocket events log table
CREATE TABLE IF NOT EXISTS websocket_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    room_name VARCHAR(255),
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_announcements_sent_at ON system_announcements(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_announcements_type ON system_announcements(type);

CREATE INDEX IF NOT EXISTS idx_parking_lot_updates_lot_id ON parking_lot_updates(parking_lot_id);
CREATE INDEX IF NOT EXISTS idx_parking_lot_updates_created_at ON parking_lot_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parking_lot_updates_type ON parking_lot_updates(update_type);

CREATE INDEX IF NOT EXISTS idx_realtime_connections_user_id ON realtime_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_realtime_connections_connected_at ON realtime_connections(connected_at DESC);

CREATE INDEX IF NOT EXISTS idx_websocket_events_type ON websocket_events(event_type);
CREATE INDEX IF NOT EXISTS idx_websocket_events_user_id ON websocket_events(user_id);
CREATE INDEX IF NOT EXISTS idx_websocket_events_created_at ON websocket_events(created_at DESC);

-- Function to automatically log parking lot updates
CREATE OR REPLACE FUNCTION log_parking_lot_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if available_spaces changed
    IF OLD.available_spaces IS DISTINCT FROM NEW.available_spaces THEN
        INSERT INTO parking_lot_updates (
            parking_lot_id,
            previous_available,
            new_available,
            update_type,
            reason
        ) VALUES (
            NEW.id,
            COALESCE(OLD.available_spaces, 0),
            NEW.available_spaces,
            'automatic',
            'System update'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic parking lot update logging
DROP TRIGGER IF EXISTS trigger_log_parking_lot_update ON parking_lots;
CREATE TRIGGER trigger_log_parking_lot_update
    AFTER UPDATE ON parking_lots
    FOR EACH ROW
    EXECUTE FUNCTION log_parking_lot_update();

-- Function to clean up old real-time logs (optional - for maintenance)
CREATE OR REPLACE FUNCTION cleanup_realtime_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Clean up old connection logs
    DELETE FROM realtime_connections 
    WHERE connected_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old WebSocket events
    DELETE FROM websocket_events 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    -- Clean up old parking lot updates (keep more history for these)
    DELETE FROM parking_lot_updates 
    WHERE created_at < NOW() - INTERVAL '1 day' * (days_to_keep * 3);
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a view for real-time statistics
CREATE OR REPLACE VIEW realtime_statistics AS
SELECT 
    (SELECT COUNT(*) FROM bookings WHERE status = 'active') as active_bookings,
    (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE) as new_users_today,
    (SELECT SUM(available_spaces) FROM parking_lots) as total_available_spaces,
    (SELECT COUNT(*) FROM realtime_connections WHERE disconnected_at IS NULL) as active_connections,
    (SELECT SUM(amount) FROM payments WHERE status = 'succeeded' AND paid_at >= CURRENT_DATE) as revenue_today,
    CURRENT_TIMESTAMP as last_updated;

-- Grant necessary permissions (adjust based on your RLS policies)
-- Note: You may need to adjust these based on your specific security requirements

-- Allow authenticated users to read their own connection logs
ALTER TABLE realtime_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own connections" ON realtime_connections
    FOR SELECT USING (auth.uid() = user_id);

-- Allow admins to view all real-time data
CREATE POLICY "Admins can view all connections" ON realtime_connections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- System announcements - everyone can read, only admins can write
ALTER TABLE system_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read announcements" ON system_announcements
    FOR SELECT USING (true);
CREATE POLICY "Admins can create announcements" ON system_announcements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Parking lot updates - admins can view all, users can view updates for lots they have bookings for
ALTER TABLE parking_lot_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all parking updates" ON parking_lot_updates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- WebSocket events - admins can view all, users can view their own
ALTER TABLE websocket_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own events" ON websocket_events
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all events" ON websocket_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Insert some sample system announcements
INSERT INTO system_announcements (message, type, sent_by) VALUES
('Welcome to the new real-time parking management system!', 'info', NULL),
('System maintenance scheduled for tonight 2:00 AM - 4:00 AM', 'warning', NULL);

-- Create a function to get parking lot occupancy rates
CREATE OR REPLACE FUNCTION get_parking_occupancy_rates()
RETURNS TABLE (
    parking_lot_id UUID,
    name VARCHAR,
    location VARCHAR,
    total_spaces INTEGER,
    available_spaces INTEGER,
    occupancy_rate DECIMAL,
    is_full BOOLEAN,
    is_nearly_full BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.id,
        pl.name,
        pl.location,
        pl.total_spaces,
        pl.available_spaces,
        CASE 
            WHEN pl.total_spaces > 0 
            THEN ROUND(((pl.total_spaces - pl.available_spaces)::DECIMAL / pl.total_spaces) * 100, 2)
            ELSE 0
        END as occupancy_rate,
        (pl.available_spaces = 0) as is_full,
        (pl.available_spaces <= CEIL(pl.total_spaces * 0.1)) as is_nearly_full
    FROM parking_lots pl
    ORDER BY pl.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE system_announcements IS 'Stores system-wide announcements sent to all users';
COMMENT ON TABLE parking_lot_updates IS 'Logs all changes to parking lot availability for audit and real-time purposes';
COMMENT ON TABLE realtime_connections IS 'Tracks WebSocket connections for monitoring and analytics';
COMMENT ON TABLE websocket_events IS 'Logs WebSocket events for debugging and analytics';
COMMENT ON FUNCTION cleanup_realtime_logs IS 'Maintenance function to clean up old real-time logs';
COMMENT ON VIEW realtime_statistics IS 'Real-time view of key system statistics';
COMMENT ON FUNCTION get_parking_occupancy_rates IS 'Returns current occupancy rates for all parking lots';

-- Success message
SELECT 'Real-time tables and functions created successfully!' as status;
