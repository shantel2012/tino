const websocketService = require('../services/websocketService');
const { supabase } = require('../supabase');

// Get real-time connection info (admin only)
exports.getConnectionInfo = async (req, res) => {
  try {
    const connectionInfo = websocketService.getConnectedUsersInfo();
    
    res.json({
      message: 'Real-time connection information',
      ...connectionInfo,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Get connection info error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get live system statistics (admin only)
exports.getLiveStatistics = async (req, res) => {
  try {
    const stats = await websocketService.getLiveStatistics();
    
    res.json({
      message: 'Live system statistics',
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Get live statistics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Send system announcement to all connected users (admin only)
exports.sendSystemAnnouncement = async (req, res) => {
  try {
    const { message, type = 'info' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Validate announcement type
    const validTypes = ['info', 'warning', 'success', 'error', 'maintenance'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid announcement type' });
    }

    // Broadcast the announcement
    websocketService.broadcastSystemAnnouncement(message, type);

    // Store announcement in database for record keeping
    const { data: announcement, error } = await supabase
      .from('system_announcements')
      .insert([{
        message: message,
        type: type,
        sent_by: req.user.id,
        sent_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Failed to store announcement:', error);
    }

    res.json({
      message: 'System announcement sent successfully',
      announcement: {
        message: message,
        type: type,
        sent_at: new Date().toISOString(),
        sent_by: req.user.id
      }
    });
  } catch (err) {
    console.error('Send system announcement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get real-time parking availability
exports.getRealTimeParkingAvailability = async (req, res) => {
  try {
    const { parking_lot_id } = req.query;

    let query = supabase
      .from('parking_lots')
      .select('id, name, location, total_spaces, available_spaces, price_per_hour, updated_at');

    if (parking_lot_id) {
      query = query.eq('id', parking_lot_id);
    }

    const { data: parkingLots, error } = await query.order('name');

    if (error) {
      console.error('Get parking availability error:', error);
      return res.status(500).json({ error: 'Failed to fetch parking availability' });
    }

    // Add real-time occupancy percentage
    const enhancedData = parkingLots.map(lot => ({
      ...lot,
      occupancy_rate: lot.total_spaces > 0 
        ? Math.round(((lot.total_spaces - lot.available_spaces) / lot.total_spaces) * 100)
        : 0,
      is_full: lot.available_spaces === 0,
      is_nearly_full: lot.available_spaces <= Math.ceil(lot.total_spaces * 0.1) // 10% or less available
    }));

    res.json({
      parking_lots: enhancedData,
      total_lots: enhancedData.length,
      total_available_spaces: enhancedData.reduce((sum, lot) => sum + lot.available_spaces, 0),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Get real-time parking availability error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get real-time booking activity (admin only)
exports.getRealTimeBookingActivity = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Get recent bookings with user and parking lot info
    const { data: recentBookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        payment_status,
        total_cost,
        start_time,
        end_time,
        created_at,
        users (
          name,
          email
        ),
        parking_lots (
          name,
          location
        )
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('Get booking activity error:', error);
      return res.status(500).json({ error: 'Failed to fetch booking activity' });
    }

    // Get booking statistics for today
    const today = new Date().toISOString().split('T')[0];
    
    const { data: todayStats } = await supabase
      .from('bookings')
      .select('status, payment_status')
      .gte('created_at', `${today}T00:00:00Z`)
      .then(({ data }) => {
        const stats = {
          total_today: data?.length || 0,
          active: 0,
          completed: 0,
          cancelled: 0,
          paid: 0,
          unpaid: 0
        };
        
        data?.forEach(booking => {
          stats[booking.status] = (stats[booking.status] || 0) + 1;
          stats[booking.payment_status] = (stats[booking.payment_status] || 0) + 1;
        });
        
        return { data: stats };
      });

    res.json({
      recent_bookings: recentBookings,
      today_statistics: todayStats,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Get real-time booking activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Trigger manual parking lot update (admin only)
exports.updateParkingLotAvailability = async (req, res) => {
  try {
    const { parking_lot_id } = req.params;
    const { available_spaces, reason } = req.body;

    if (available_spaces === undefined) {
      return res.status(400).json({ error: 'Available spaces is required' });
    }

    // Get current parking lot data
    const { data: parkingLot, error: fetchError } = await supabase
      .from('parking_lots')
      .select('*')
      .eq('id', parking_lot_id)
      .single();

    if (fetchError || !parkingLot) {
      return res.status(404).json({ error: 'Parking lot not found' });
    }

    // Validate available spaces
    if (available_spaces < 0 || available_spaces > parkingLot.total_spaces) {
      return res.status(400).json({ 
        error: `Available spaces must be between 0 and ${parkingLot.total_spaces}` 
      });
    }

    // Update parking lot
    const { data: updatedLot, error: updateError } = await supabase
      .from('parking_lots')
      .update({ 
        available_spaces: available_spaces,
        updated_at: new Date().toISOString()
      })
      .eq('id', parking_lot_id)
      .select()
      .single();

    if (updateError) {
      console.error('Update parking lot error:', updateError);
      return res.status(500).json({ error: 'Failed to update parking lot' });
    }

    // Log the manual update
    await supabase
      .from('parking_lot_updates')
      .insert([{
        parking_lot_id: parking_lot_id,
        previous_available: parkingLot.available_spaces,
        new_available: available_spaces,
        updated_by: req.user.id,
        reason: reason || 'Manual update',
        update_type: 'manual'
      }]);

    // Broadcast real-time update
    websocketService.broadcastParkingUpdate(parking_lot_id, {
      available_spaces: available_spaces,
      action: 'manual_update',
      reason: reason || 'Manual update',
      updated_by: req.user.id
    });

    res.json({
      message: 'Parking lot availability updated successfully',
      parking_lot: updatedLot,
      previous_available: parkingLot.available_spaces,
      new_available: available_spaces,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Update parking lot availability error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get WebSocket connection status for current user
exports.getConnectionStatus = async (req, res) => {
  try {
    const user_id = req.user.id;
    const connectionInfo = websocketService.getConnectedUsersInfo();
    
    const isConnected = connectionInfo.users.some(user => user.user_id === user_id);
    
    res.json({
      is_connected: isConnected,
      user_id: user_id,
      total_connected_users: connectionInfo.total_connected,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Get connection status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
