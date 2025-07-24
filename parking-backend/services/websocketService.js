const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { supabase } = require('../supabase');

let io;
const connectedUsers = new Map(); // Store user connections
const roomSubscriptions = new Map(); // Track room subscriptions

// Initialize WebSocket server
function initializeWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Authentication middleware for WebSocket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_secret_key");
      
      // Get user details from database
      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('id', decoded.id)
        .single();

      if (error || !user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user.id;
      socket.userRole = user.role;
      socket.userEmail = user.email;
      socket.userName = user.name;
      
      next();
    } catch (err) {
      console.error('WebSocket authentication error:', err);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Handle WebSocket connections
  io.on('connection', (socket) => {
    console.log(`User ${socket.userName} (${socket.userId}) connected`);
    
    // Store user connection
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      socket: socket,
      connectedAt: new Date(),
      role: socket.userRole
    });

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);
    
    // Join admin users to admin room
    if (socket.userRole === 'admin') {
      socket.join('admin');
    }

    // Handle room subscriptions
    socket.on('subscribe', (data) => {
      handleRoomSubscription(socket, data);
    });

    socket.on('unsubscribe', (data) => {
      handleRoomUnsubscription(socket, data);
    });

    // Handle real-time parking lot availability requests
    socket.on('get_parking_availability', async (data) => {
      await handleParkingAvailabilityRequest(socket, data);
    });

    // Handle booking status updates
    socket.on('get_booking_status', async (data) => {
      await handleBookingStatusRequest(socket, data);
    });

    // Handle admin requests for live statistics
    socket.on('get_live_stats', async () => {
      if (socket.userRole === 'admin') {
        await handleLiveStatsRequest(socket);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.userName} (${socket.userId}) disconnected`);
      connectedUsers.delete(socket.userId);
      
      // Clean up room subscriptions
      for (const [room, subscribers] of roomSubscriptions.entries()) {
        subscribers.delete(socket.userId);
        if (subscribers.size === 0) {
          roomSubscriptions.delete(room);
        }
      }
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to real-time updates',
      userId: socket.userId,
      timestamp: new Date().toISOString()
    });
  });

  return io;
}

// Handle room subscription (for specific parking lots, etc.)
function handleRoomSubscription(socket, data) {
  const { room, type } = data;
  
  if (!room || !type) {
    socket.emit('error', { message: 'Room and type are required for subscription' });
    return;
  }

  // Validate subscription permissions
  if (type === 'admin' && socket.userRole !== 'admin') {
    socket.emit('error', { message: 'Admin privileges required' });
    return;
  }

  // Join the room
  socket.join(room);
  
  // Track subscription
  if (!roomSubscriptions.has(room)) {
    roomSubscriptions.set(room, new Set());
  }
  roomSubscriptions.get(room).add(socket.userId);

  console.log(`User ${socket.userId} subscribed to room: ${room}`);
  socket.emit('subscribed', { room, type, timestamp: new Date().toISOString() });
}

// Handle room unsubscription
function handleRoomUnsubscription(socket, data) {
  const { room } = data;
  
  if (!room) {
    socket.emit('error', { message: 'Room is required for unsubscription' });
    return;
  }

  socket.leave(room);
  
  if (roomSubscriptions.has(room)) {
    roomSubscriptions.get(room).delete(socket.userId);
    if (roomSubscriptions.get(room).size === 0) {
      roomSubscriptions.delete(room);
    }
  }

  console.log(`User ${socket.userId} unsubscribed from room: ${room}`);
  socket.emit('unsubscribed', { room, timestamp: new Date().toISOString() });
}

// Handle parking availability requests
async function handleParkingAvailabilityRequest(socket, data) {
  try {
    const { parking_lot_id } = data;
    
    let query = supabase
      .from('parking_lots')
      .select('id, name, location, total_spaces, available_spaces, price_per_hour');

    if (parking_lot_id) {
      query = query.eq('id', parking_lot_id);
    }

    const { data: parkingLots, error } = await query;

    if (error) {
      socket.emit('error', { message: 'Failed to fetch parking availability' });
      return;
    }

    socket.emit('parking_availability', {
      parking_lots: parkingLots,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Parking availability request error:', err);
    socket.emit('error', { message: 'Internal server error' });
  }
}

// Handle booking status requests
async function handleBookingStatusRequest(socket, data) {
  try {
    const { booking_id } = data;
    
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        parking_lots (
          name,
          location
        )
      `)
      .eq('id', booking_id)
      .eq('user_id', socket.userId)
      .single();

    if (error || !booking) {
      socket.emit('error', { message: 'Booking not found' });
      return;
    }

    socket.emit('booking_status', {
      booking: booking,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Booking status request error:', err);
    socket.emit('error', { message: 'Internal server error' });
  }
}

// Handle live statistics requests (admin only)
async function handleLiveStatsRequest(socket) {
  try {
    // Get real-time statistics
    const stats = await getLiveStatistics();
    
    socket.emit('live_stats', {
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Live stats request error:', err);
    socket.emit('error', { message: 'Failed to fetch live statistics' });
  }
}

// Get live statistics
async function getLiveStatistics() {
  try {
    // Active bookings count
    const { data: activeBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('status', 'active')
      .then(({ data }) => ({ data: data?.length || 0 }));

    // Total revenue today
    const today = new Date().toISOString().split('T')[0];
    const { data: todayRevenue } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'succeeded')
      .gte('paid_at', `${today}T00:00:00Z`)
      .then(({ data }) => ({ 
        data: data?.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0) || 0 
      }));

    // Available spaces across all lots
    const { data: totalSpaces } = await supabase
      .from('parking_lots')
      .select('available_spaces')
      .then(({ data }) => ({ 
        data: data?.reduce((sum, lot) => sum + (lot.available_spaces || 0), 0) || 0 
      }));

    // Online users count
    const onlineUsers = connectedUsers.size;

    return {
      active_bookings: activeBookings,
      today_revenue: todayRevenue,
      available_spaces: totalSpaces,
      online_users: onlineUsers,
      connected_admins: Array.from(connectedUsers.values()).filter(u => u.role === 'admin').length
    };
  } catch (err) {
    console.error('Get live statistics error:', err);
    return {};
  }
}

// Broadcast functions for real-time updates

// Broadcast parking lot availability update
function broadcastParkingUpdate(parkingLotId, updateData) {
  if (!io) return;
  
  // Broadcast to all users subscribed to this parking lot
  io.to(`parking_lot:${parkingLotId}`).emit('parking_updated', {
    parking_lot_id: parkingLotId,
    ...updateData,
    timestamp: new Date().toISOString()
  });

  // Also broadcast to general parking updates room
  io.to('parking_updates').emit('parking_updated', {
    parking_lot_id: parkingLotId,
    ...updateData,
    timestamp: new Date().toISOString()
  });
}

// Broadcast booking status update
function broadcastBookingUpdate(userId, bookingId, updateData) {
  if (!io) return;
  
  // Send to specific user
  io.to(`user:${userId}`).emit('booking_updated', {
    booking_id: bookingId,
    ...updateData,
    timestamp: new Date().toISOString()
  });

  // Send to admins
  io.to('admin').emit('booking_updated', {
    booking_id: bookingId,
    user_id: userId,
    ...updateData,
    timestamp: new Date().toISOString()
  });
}

// Broadcast payment status update
function broadcastPaymentUpdate(userId, paymentId, updateData) {
  if (!io) return;
  
  io.to(`user:${userId}`).emit('payment_updated', {
    payment_id: paymentId,
    ...updateData,
    timestamp: new Date().toISOString()
  });
}

// Broadcast notification
function broadcastNotification(userId, notification) {
  if (!io) return;
  
  io.to(`user:${userId}`).emit('notification', {
    ...notification,
    timestamp: new Date().toISOString()
  });
}

// Broadcast system announcement (admin only)
function broadcastSystemAnnouncement(message, type = 'info') {
  if (!io) return;
  
  io.emit('system_announcement', {
    message: message,
    type: type,
    timestamp: new Date().toISOString()
  });
}

// Get connected users info (admin only)
function getConnectedUsersInfo() {
  const users = Array.from(connectedUsers.entries()).map(([userId, info]) => ({
    user_id: userId,
    connected_at: info.connectedAt,
    role: info.role
  }));
  
  return {
    total_connected: users.length,
    users: users,
    admins_online: users.filter(u => u.role === 'admin').length
  };
}

module.exports = {
  initializeWebSocket,
  broadcastParkingUpdate,
  broadcastBookingUpdate,
  broadcastPaymentUpdate,
  broadcastNotification,
  broadcastSystemAnnouncement,
  getConnectedUsersInfo,
  getLiveStatistics
};
