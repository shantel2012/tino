-- Create notifications table for tracking all notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'push', 'in_app'
    category VARCHAR(50) NOT NULL, -- 'booking_confirmation', 'payment_receipt', 'reminder', 'cancellation', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    failed_reason TEXT,
    provider VARCHAR(50), -- 'sendgrid', 'twilio', 'firebase', etc.
    provider_message_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification_preferences table for user preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- 'booking_confirmation', 'payment_receipt', etc.
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    push_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category)
);

-- Create notification_templates table for customizable templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'push'
    subject VARCHAR(255), -- For emails
    template_body TEXT NOT NULL,
    variables JSONB, -- Available template variables
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, type)
);

-- Create scheduled_notifications table for future notifications
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    template_data JSONB,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'cancelled', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_booking_id ON notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_category ON notification_preferences(category);

CREATE INDEX IF NOT EXISTS idx_notification_templates_category ON notification_templates(category);
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user_id ON scheduled_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at 
    BEFORE UPDATE ON notification_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_notifications_updated_at 
    BEFORE UPDATE ON scheduled_notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default notification preferences for existing users
INSERT INTO notification_preferences (user_id, category, email_enabled, sms_enabled, push_enabled, in_app_enabled)
SELECT 
    u.id,
    category.name,
    TRUE,
    FALSE,
    TRUE,
    TRUE
FROM users u
CROSS JOIN (
    VALUES 
        ('booking_confirmation'),
        ('booking_reminder'),
        ('payment_receipt'),
        ('payment_failed'),
        ('booking_cancellation'),
        ('refund_processed'),
        ('booking_starts_soon'),
        ('booking_expires_soon'),
        ('system_maintenance'),
        ('promotional')
) AS category(name)
ON CONFLICT (user_id, category) DO NOTHING;

-- Insert default notification templates
INSERT INTO notification_templates (category, type, subject, template_body, variables) VALUES
-- Booking confirmation email
('booking_confirmation', 'email', 'Booking Confirmation - {{parking_lot_name}}', 
'Dear {{user_name}},

Your parking reservation has been confirmed!

Booking Details:
- Parking Lot: {{parking_lot_name}}
- Location: {{parking_lot_location}}
- Date: {{booking_date}}
- Time: {{start_time}} - {{end_time}}
- Total Cost: ${{total_cost}}
- Booking ID: {{booking_id}}

Please arrive on time and have this confirmation ready.

Thank you for choosing our parking service!

Best regards,
Parking Management Team', 
'{"user_name": "string", "parking_lot_name": "string", "parking_lot_location": "string", "booking_date": "string", "start_time": "string", "end_time": "string", "total_cost": "number", "booking_id": "string"}'::jsonb),

-- Booking confirmation SMS
('booking_confirmation', 'sms', NULL,
'Parking confirmed! {{parking_lot_name}} on {{booking_date}} {{start_time}}-{{end_time}}. Cost: ${{total_cost}}. ID: {{booking_id}}',
'{"parking_lot_name": "string", "booking_date": "string", "start_time": "string", "end_time": "string", "total_cost": "number", "booking_id": "string"}'::jsonb),

-- Payment receipt email
('payment_receipt', 'email', 'Payment Receipt - ${{amount}}',
'Dear {{user_name}},

Thank you for your payment!

Payment Details:
- Amount: ${{amount}}
- Payment Date: {{payment_date}}
- Payment Method: {{payment_method}}
- Transaction ID: {{transaction_id}}
- Receipt Number: {{receipt_number}}

Booking Details:
- Parking Lot: {{parking_lot_name}}
- Location: {{parking_lot_location}}
- Date: {{booking_date}}
- Time: {{start_time}} - {{end_time}}

This serves as your official receipt.

Best regards,
Parking Management Team',
'{"user_name": "string", "amount": "number", "payment_date": "string", "payment_method": "string", "transaction_id": "string", "receipt_number": "string", "parking_lot_name": "string", "parking_lot_location": "string", "booking_date": "string", "start_time": "string", "end_time": "string"}'::jsonb),

-- Booking reminder email
('booking_reminder', 'email', 'Reminder: Your parking starts in 30 minutes',
'Dear {{user_name}},

This is a friendly reminder that your parking reservation starts in 30 minutes.

Booking Details:
- Parking Lot: {{parking_lot_name}}
- Location: {{parking_lot_location}}
- Start Time: {{start_time}}
- End Time: {{end_time}}

Please arrive on time to secure your parking space.

Best regards,
Parking Management Team',
'{"user_name": "string", "parking_lot_name": "string", "parking_lot_location": "string", "start_time": "string", "end_time": "string"}'::jsonb),

-- Booking reminder SMS
('booking_reminder', 'sms', NULL,
'Reminder: Your parking at {{parking_lot_name}} starts in 30 minutes ({{start_time}}). Location: {{parking_lot_location}}',
'{"parking_lot_name": "string", "parking_lot_location": "string", "start_time": "string"}'::jsonb);

-- Add phone number column to users table for SMS notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
