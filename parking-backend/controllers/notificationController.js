const { supabase } = require('../supabase');
const notificationService = require('../services/notificationService');

// Get user's notification history
exports.getNotificationHistory = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { page = 1, limit = 20, type, category, status } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error('Get notification history error:', error);
      return res.status(500).json({ error: 'Failed to fetch notification history' });
    }

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error('Get notification history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's notification preferences
exports.getNotificationPreferences = async (req, res) => {
  try {
    const user_id = req.user.id;

    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user_id)
      .order('category');

    if (error) {
      console.error('Get notification preferences error:', error);
      return res.status(500).json({ error: 'Failed to fetch notification preferences' });
    }

    res.json({ preferences });
  } catch (err) {
    console.error('Get notification preferences error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user's notification preferences
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { preferences } = req.body;

    if (!preferences || !Array.isArray(preferences)) {
      return res.status(400).json({ error: 'Preferences array is required' });
    }

    const updatedPreferences = [];

    // Update each preference
    for (const pref of preferences) {
      const { category, email_enabled, sms_enabled, push_enabled, in_app_enabled } = pref;

      if (!category) {
        continue;
      }

      const { data: updatedPref, error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id,
          category,
          email_enabled: email_enabled !== undefined ? email_enabled : true,
          sms_enabled: sms_enabled !== undefined ? sms_enabled : false,
          push_enabled: push_enabled !== undefined ? push_enabled : true,
          in_app_enabled: in_app_enabled !== undefined ? in_app_enabled : true
        })
        .select()
        .single();

      if (error) {
        console.error(`Failed to update preference for ${category}:`, error);
      } else {
        updatedPreferences.push(updatedPref);
      }
    }

    res.json({ 
      message: 'Notification preferences updated successfully',
      preferences: updatedPreferences 
    });
  } catch (err) {
    console.error('Update notification preferences error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Send test notification
exports.sendTestNotification = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { type = 'email', category = 'test' } = req.body;

    const templateData = {
      test_message: 'This is a test notification to verify your notification settings.',
      timestamp: new Date().toLocaleString()
    };

    const result = await notificationService.sendNotification(
      user_id,
      category,
      templateData,
      { metadata: { test: true } }
    );

    if (result.success) {
      res.json({
        message: 'Test notification sent successfully',
        result: result
      });
    } else {
      res.status(500).json({
        error: 'Failed to send test notification',
        details: result.error
      });
    }
  } catch (err) {
    console.error('Send test notification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark notification as read (for in-app notifications)
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { notification_id } = req.params;
    const user_id = req.user.id;

    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ 
        metadata: supabase.raw(`
          COALESCE(metadata, '{}'::jsonb) || '{"read": true, "read_at": "${new Date().toISOString()}"}'::jsonb
        `)
      })
      .eq('id', notification_id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error || !notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification marked as read',
      notification: notification
    });
  } catch (err) {
    console.error('Mark notification as read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get notification statistics
exports.getNotificationStats = async (req, res) => {
  try {
    const user_id = req.user.id;

    // Get notification counts by status
    const { data: statusStats } = await supabase
      .from('notifications')
      .select('status')
      .eq('user_id', user_id)
      .then(({ data }) => {
        const stats = { total: data?.length || 0, sent: 0, failed: 0, pending: 0 };
        data?.forEach(notification => {
          stats[notification.status] = (stats[notification.status] || 0) + 1;
        });
        return { data: stats };
      });

    // Get notification counts by type
    const { data: typeStats } = await supabase
      .from('notifications')
      .select('type')
      .eq('user_id', user_id)
      .then(({ data }) => {
        const stats = { email: 0, sms: 0, push: 0, in_app: 0 };
        data?.forEach(notification => {
          stats[notification.type] = (stats[notification.type] || 0) + 1;
        });
        return { data: stats };
      });

    // Get notification counts by category
    const { data: categoryStats } = await supabase
      .from('notifications')
      .select('category')
      .eq('user_id', user_id)
      .then(({ data }) => {
        const stats = {};
        data?.forEach(notification => {
          stats[notification.category] = (stats[notification.category] || 0) + 1;
        });
        return { data: stats };
      });

    // Get recent notifications count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentCount } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user_id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .then(({ data }) => ({ data: data?.length || 0 }));

    res.json({
      status_stats: statusStats,
      type_stats: typeStats,
      category_stats: categoryStats,
      recent_notifications_7d: recentCount,
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Get notification stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin: Get all notifications with filtering
exports.getAllNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 50, type, category, status, user_id } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('notifications')
      .select(`
        *,
        users (
          name,
          email
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error('Get all notifications error:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error('Get all notifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin: Get notification templates
exports.getNotificationTemplates = async (req, res) => {
  try {
    const { category, type } = req.query;

    let query = supabase
      .from('notification_templates')
      .select('*')
      .order('category', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }
    if (type) {
      query = query.eq('type', type);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Get notification templates error:', error);
      return res.status(500).json({ error: 'Failed to fetch notification templates' });
    }

    res.json({ templates });
  } catch (err) {
    console.error('Get notification templates error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin: Update notification template
exports.updateNotificationTemplate = async (req, res) => {
  try {
    const { template_id } = req.params;
    const { subject, template_body, variables, is_active } = req.body;

    const updateData = {};
    if (subject !== undefined) updateData.subject = subject;
    if (template_body !== undefined) updateData.template_body = template_body;
    if (variables !== undefined) updateData.variables = variables;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: template, error } = await supabase
      .from('notification_templates')
      .update(updateData)
      .eq('id', template_id)
      .select()
      .single();

    if (error || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({
      message: 'Template updated successfully',
      template: template
    });
  } catch (err) {
    console.error('Update notification template error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin: Send bulk notification
exports.sendBulkNotification = async (req, res) => {
  try {
    const { user_ids, category, template_data, schedule_for } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    const results = [];

    for (const userId of user_ids) {
      try {
        let result;
        
        if (schedule_for) {
          // Schedule notification for later
          result = await notificationService.scheduleNotification(
            userId,
            category,
            schedule_for,
            template_data || {},
            { metadata: { bulk_notification: true } }
          );
        } else {
          // Send immediately
          result = await notificationService.sendNotification(
            userId,
            category,
            template_data || {},
            { metadata: { bulk_notification: true } }
          );
        }

        results.push({
          user_id: userId,
          success: result.success,
          error: result.error
        });
      } catch (error) {
        results.push({
          user_id: userId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      message: `Bulk notification processed: ${successCount} successful, ${failureCount} failed`,
      results: results,
      summary: {
        total: user_ids.length,
        successful: successCount,
        failed: failureCount
      }
    });
  } catch (err) {
    console.error('Send bulk notification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
