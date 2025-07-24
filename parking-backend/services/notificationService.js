const { supabase } = require('../supabase');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Initialize email transporter (using SendGrid as example)
const emailTransporter = nodemailer.createTransporter({
  service: 'SendGrid',
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});

// Initialize Twilio client for SMS
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Template rendering function
function renderTemplate(template, variables) {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, value || '');
  }
  return rendered;
}

// Get user notification preferences
async function getUserPreferences(userId, category) {
  const { data: preferences, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .single();

  if (error || !preferences) {
    // Return default preferences if not found
    return {
      email_enabled: true,
      sms_enabled: false,
      push_enabled: true,
      in_app_enabled: true
    };
  }

  return preferences;
}

// Get notification template
async function getTemplate(category, type) {
  const { data: template, error } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('category', category)
    .eq('type', type)
    .eq('is_active', true)
    .single();

  if (error || !template) {
    throw new Error(`Template not found for category: ${category}, type: ${type}`);
  }

  return template;
}

// Send email notification
async function sendEmail(to, subject, body, metadata = {}) {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured, skipping email');
      return { success: false, error: 'Email service not configured' };
    }

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@parking.com',
      to: to,
      subject: subject,
      html: body.replace(/\n/g, '<br>'),
      text: body
    };

    const result = await emailTransporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: result.messageId,
      provider: 'sendgrid'
    };
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error.message,
      provider: 'sendgrid'
    };
  }
}

// Send SMS notification
async function sendSMS(to, message, metadata = {}) {
  try {
    if (!twilioClient) {
      console.warn('Twilio not configured, skipping SMS');
      return { success: false, error: 'SMS service not configured' };
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    return {
      success: true,
      messageId: result.sid,
      provider: 'twilio'
    };
  } catch (error) {
    console.error('SMS sending error:', error);
    return {
      success: false,
      error: error.message,
      provider: 'twilio'
    };
  }
}

// Main notification sending function
async function sendNotification(userId, category, templateData, options = {}) {
  try {
    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('name, email, phone')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    // Get user preferences
    const preferences = await getUserPreferences(userId, category);
    
    const notifications = [];
    const notificationTypes = [];

    // Determine which notification types to send
    if (preferences.email_enabled && user.email) {
      notificationTypes.push('email');
    }
    if (preferences.sms_enabled && user.phone) {
      notificationTypes.push('sms');
    }

    // Send each type of notification
    for (const type of notificationTypes) {
      try {
        const template = await getTemplate(category, type);
        
        // Prepare template variables
        const variables = {
          user_name: user.name,
          user_email: user.email,
          ...templateData
        };

        // Render template
        const renderedBody = renderTemplate(template.template_body, variables);
        const renderedSubject = template.subject ? renderTemplate(template.subject, variables) : null;

        let result;
        let recipient;

        // Send notification based on type
        if (type === 'email') {
          recipient = user.email;
          result = await sendEmail(user.email, renderedSubject, renderedBody, options.metadata);
        } else if (type === 'sms') {
          recipient = user.phone;
          result = await sendSMS(user.phone, renderedBody, options.metadata);
        }

        // Store notification record
        const notificationData = {
          user_id: userId,
          booking_id: options.bookingId || null,
          payment_id: options.paymentId || null,
          type: type,
          category: category,
          title: renderedSubject || `${category} notification`,
          message: renderedBody,
          recipient_email: type === 'email' ? recipient : null,
          recipient_phone: type === 'sms' ? recipient : null,
          status: result.success ? 'sent' : 'failed',
          sent_at: result.success ? new Date().toISOString() : null,
          failed_reason: result.success ? null : result.error,
          provider: result.provider,
          provider_message_id: result.messageId,
          metadata: {
            template_variables: variables,
            ...options.metadata
          }
        };

        const { data: notification, error: notificationError } = await supabase
          .from('notifications')
          .insert([notificationData])
          .select()
          .single();

        if (notificationError) {
          console.error('Failed to store notification:', notificationError);
        }

        notifications.push({
          type: type,
          success: result.success,
          notification: notification,
          error: result.error
        });

      } catch (templateError) {
        console.error(`Failed to send ${type} notification:`, templateError);
        notifications.push({
          type: type,
          success: false,
          error: templateError.message
        });
      }
    }

    return {
      success: notifications.some(n => n.success),
      notifications: notifications,
      userId: userId,
      category: category
    };

  } catch (error) {
    console.error('Notification sending error:', error);
    return {
      success: false,
      error: error.message,
      userId: userId,
      category: category
    };
  }
}

// Schedule future notification
async function scheduleNotification(userId, category, scheduledFor, templateData, options = {}) {
  try {
    const { data: scheduledNotification, error } = await supabase
      .from('scheduled_notifications')
      .insert([{
        user_id: userId,
        booking_id: options.bookingId || null,
        category: category,
        type: options.type || 'email',
        scheduled_for: scheduledFor,
        template_data: {
          ...templateData,
          ...options.metadata
        }
      }])
      .select()
      .single();

    if (error) {
      throw new Error('Failed to schedule notification');
    }

    return {
      success: true,
      scheduledNotification: scheduledNotification
    };
  } catch (error) {
    console.error('Schedule notification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Process scheduled notifications (to be called by cron job)
async function processScheduledNotifications() {
  try {
    const now = new Date().toISOString();
    
    // Get notifications that are due
    const { data: dueNotifications, error } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', now)
      .limit(100);

    if (error) {
      console.error('Failed to fetch scheduled notifications:', error);
      return;
    }

    console.log(`Processing ${dueNotifications.length} scheduled notifications`);

    for (const notification of dueNotifications) {
      try {
        // Send the notification
        const result = await sendNotification(
          notification.user_id,
          notification.category,
          notification.template_data,
          {
            bookingId: notification.booking_id,
            metadata: { scheduled_notification_id: notification.id }
          }
        );

        // Update scheduled notification status
        await supabase
          .from('scheduled_notifications')
          .update({
            status: result.success ? 'sent' : 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.id);

        console.log(`Scheduled notification ${notification.id} processed: ${result.success ? 'success' : 'failed'}`);

      } catch (error) {
        console.error(`Failed to process scheduled notification ${notification.id}:`, error);
        
        // Mark as failed
        await supabase
          .from('scheduled_notifications')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.id);
      }
    }

  } catch (error) {
    console.error('Process scheduled notifications error:', error);
  }
}

// Booking-specific notification functions
async function sendBookingConfirmation(userId, bookingId) {
  try {
    // Get booking details
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        parking_lots (
          name,
          location
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      throw new Error('Booking not found');
    }

    const templateData = {
      booking_id: booking.id,
      parking_lot_name: booking.parking_lots.name,
      parking_lot_location: booking.parking_lots.location,
      booking_date: new Date(booking.start_time).toLocaleDateString(),
      start_time: new Date(booking.start_time).toLocaleTimeString(),
      end_time: new Date(booking.end_time).toLocaleTimeString(),
      total_cost: booking.total_cost
    };

    return await sendNotification(userId, 'booking_confirmation', templateData, {
      bookingId: bookingId
    });

  } catch (error) {
    console.error('Send booking confirmation error:', error);
    return { success: false, error: error.message };
  }
}

async function sendPaymentReceipt(userId, paymentId) {
  try {
    // Get payment and booking details
    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        bookings (
          *,
          parking_lots (
            name,
            location
          )
        )
      `)
      .eq('id', paymentId)
      .single();

    if (error || !payment) {
      throw new Error('Payment not found');
    }

    const templateData = {
      amount: payment.amount,
      payment_date: new Date(payment.paid_at).toLocaleDateString(),
      payment_method: payment.payment_method,
      transaction_id: payment.stripe_payment_intent_id,
      receipt_number: `RCP-${Date.now()}-${payment.id.substring(0, 8)}`,
      parking_lot_name: payment.bookings.parking_lots.name,
      parking_lot_location: payment.bookings.parking_lots.location,
      booking_date: new Date(payment.bookings.start_time).toLocaleDateString(),
      start_time: new Date(payment.bookings.start_time).toLocaleTimeString(),
      end_time: new Date(payment.bookings.end_time).toLocaleTimeString()
    };

    return await sendNotification(userId, 'payment_receipt', templateData, {
      bookingId: payment.booking_id,
      paymentId: paymentId
    });

  } catch (error) {
    console.error('Send payment receipt error:', error);
    return { success: false, error: error.message };
  }
}

async function scheduleBookingReminder(userId, bookingId) {
  try {
    // Get booking details
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        parking_lots (
          name,
          location
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      throw new Error('Booking not found');
    }

    // Schedule reminder 30 minutes before booking starts
    const reminderTime = new Date(booking.start_time);
    reminderTime.setMinutes(reminderTime.getMinutes() - 30);

    // Only schedule if reminder time is in the future
    if (reminderTime > new Date()) {
      const templateData = {
        booking_id: booking.id,
        parking_lot_name: booking.parking_lots.name,
        parking_lot_location: booking.parking_lots.location,
        start_time: new Date(booking.start_time).toLocaleTimeString(),
        end_time: new Date(booking.end_time).toLocaleTimeString()
      };

      return await scheduleNotification(
        userId,
        'booking_reminder',
        reminderTime.toISOString(),
        templateData,
        { bookingId: bookingId }
      );
    }

    return { success: false, error: 'Reminder time has already passed' };

  } catch (error) {
    console.error('Schedule booking reminder error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendNotification,
  scheduleNotification,
  processScheduledNotifications,
  sendBookingConfirmation,
  sendPaymentReceipt,
  scheduleBookingReminder,
  sendEmail,
  sendSMS
};
