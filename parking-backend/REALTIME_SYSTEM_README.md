# Real-Time System Documentation

## Overview

The parking management backend now includes a comprehensive real-time system using WebSockets (Socket.IO) that provides live updates for parking availability, booking status changes, payment confirmations, and administrative notifications.

## Features

### 🔄 Real-Time Updates
- **Parking Availability**: Live updates when spaces become available or occupied
- **Booking Status**: Instant notifications for booking creation, updates, and cancellations
- **Payment Status**: Real-time payment confirmation and failure notifications
- **System Announcements**: Broadcast messages from administrators to all users

### 👥 User Management
- **Authentication**: JWT-based WebSocket authentication
- **Role-Based Access**: Different access levels for users and administrators
- **Connection Tracking**: Monitor active connections and user sessions

### 📊 Administrative Features
- **Live Statistics**: Real-time system metrics and analytics
- **Connection Monitoring**: Track active users and admin connections
- **Manual Updates**: Admin ability to manually update parking availability
- **Bulk Announcements**: Send system-wide notifications

## Technical Implementation

### WebSocket Server
- **Technology**: Socket.IO v4.7.4
- **Authentication**: JWT token verification for all connections
- **CORS**: Configured for frontend integration
- **Rooms**: Organized by user ID, parking lots, and admin privileges

### Database Integration
- **Real-time Logs**: Track all WebSocket events and connections
- **Audit Trail**: Log parking lot updates and system changes
- **Statistics View**: Real-time view for system metrics
- **Cleanup Functions**: Automated maintenance for log data

## API Endpoints

### Real-Time Routes (`/realtime`)

#### Public (Authenticated Users)
```
GET /realtime/parking-availability
GET /realtime/connection-status
```

#### Admin Only
```
GET /realtime/connections
GET /realtime/live-stats
GET /realtime/booking-activity
POST /realtime/announcement
PUT /realtime/parking-lots/:id/availability
```

## WebSocket Events

### Client → Server Events

#### Authentication
```javascript
// Connect with JWT token
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

#### Room Subscriptions
```javascript
// Subscribe to parking lot updates
socket.emit('subscribe', {
  room: 'parking_lot:123',
  type: 'parking'
});

// Subscribe to admin updates (admin only)
socket.emit('subscribe', {
  room: 'admin',
  type: 'admin'
});
```

#### Data Requests
```javascript
// Get current parking availability
socket.emit('get_parking_availability', {
  parking_lot_id: '123' // optional
});

// Get booking status
socket.emit('get_booking_status', {
  booking_id: '456'
});

// Get live statistics (admin only)
socket.emit('get_live_stats');
```

### Server → Client Events

#### Connection Events
```javascript
// Connection confirmed
socket.on('connected', (data) => {
  console.log('Connected:', data.message);
});

// Subscription confirmed
socket.on('subscribed', (data) => {
  console.log('Subscribed to:', data.room);
});
```

#### Real-Time Updates
```javascript
// Parking availability updated
socket.on('parking_updated', (data) => {
  console.log('Parking update:', data);
  // data: { parking_lot_id, available_spaces, action, timestamp }
});

// Booking status changed
socket.on('booking_updated', (data) => {
  console.log('Booking update:', data);
  // data: { booking_id, status, action, booking, timestamp }
});

// Payment status changed
socket.on('payment_updated', (data) => {
  console.log('Payment update:', data);
  // data: { payment_id, status, action, payment, timestamp }
});

// New notification received
socket.on('notification', (data) => {
  console.log('New notification:', data);
  // data: { title, message, type, timestamp }
});
```

#### System Events
```javascript
// System announcement
socket.on('system_announcement', (data) => {
  console.log('System announcement:', data);
  // data: { message, type, timestamp }
});

// Live statistics (admin only)
socket.on('live_stats', (data) => {
  console.log('Live stats:', data);
  // data: { stats: {...}, timestamp }
});
```

#### Error Handling
```javascript
socket.on('error', (error) => {
  console.error('WebSocket error:', error.message);
});
```

## Frontend Integration

### Basic Setup
```javascript
import io from 'socket.io-client';

class RealtimeService {
  constructor(token) {
    this.socket = io(process.env.REACT_APP_BACKEND_URL, {
      auth: { token }
    });
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.socket.on('connected', this.handleConnection);
    this.socket.on('parking_updated', this.handleParkingUpdate);
    this.socket.on('booking_updated', this.handleBookingUpdate);
    this.socket.on('payment_updated', this.handlePaymentUpdate);
    this.socket.on('notification', this.handleNotification);
    this.socket.on('system_announcement', this.handleAnnouncement);
  }
  
  // Subscribe to parking lot updates
  subscribeToParkingLot(parkingLotId) {
    this.socket.emit('subscribe', {
      room: `parking_lot:${parkingLotId}`,
      type: 'parking'
    });
  }
  
  // Request current parking availability
  getParkingAvailability(parkingLotId = null) {
    this.socket.emit('get_parking_availability', { parking_lot_id: parkingLotId });
  }
  
  // Handle real-time updates
  handleParkingUpdate = (data) => {
    // Update UI with new parking availability
    this.updateParkingDisplay(data);
  };
  
  handleBookingUpdate = (data) => {
    // Update booking status in UI
    this.updateBookingStatus(data);
  };
  
  handlePaymentUpdate = (data) => {
    // Update payment status and show confirmation
    this.updatePaymentStatus(data);
  };
  
  handleNotification = (data) => {
    // Show notification to user
    this.showNotification(data);
  };
  
  handleAnnouncement = (data) => {
    // Show system announcement
    this.showSystemMessage(data);
  };
}
```

### React Hook Example
```javascript
import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import RealtimeService from './RealtimeService';

export const useRealtime = () => {
  const { token } = useAuth();
  const [realtimeService, setRealtimeService] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [parkingData, setParkingData] = useState([]);
  
  useEffect(() => {
    if (token) {
      const service = new RealtimeService(token);
      
      service.socket.on('connected', () => {
        setConnectionStatus('connected');
      });
      
      service.socket.on('parking_updated', (data) => {
        setParkingData(prev => 
          prev.map(lot => 
            lot.id === data.parking_lot_id 
              ? { ...lot, available_spaces: data.available_spaces }
              : lot
          )
        );
      });
      
      setRealtimeService(service);
      
      return () => {
        service.socket.disconnect();
      };
    }
  }, [token]);
  
  return {
    realtimeService,
    connectionStatus,
    parkingData,
    subscribeToParkingLot: (id) => realtimeService?.subscribeToParkingLot(id),
    getParkingAvailability: () => realtimeService?.getParkingAvailability()
  };
};
```

## Environment Variables

Add to your `.env` file:
```env
# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000
```

## Database Migrations

Run the following migration in Supabase SQL Editor:
```sql
-- See migrations/create_realtime_tables.sql
```

## Security Features

### Authentication
- JWT token verification for all WebSocket connections
- User role validation for admin-only features
- Connection tracking and session management

### Authorization
- Room-based access control
- Role-based event filtering
- Admin privilege verification

### Data Protection
- Row Level Security (RLS) on all real-time tables
- User isolation for personal data
- Admin-only access to system-wide information

## Performance Considerations

### Connection Management
- Automatic cleanup of disconnected users
- Room subscription tracking
- Memory-efficient user mapping

### Database Optimization
- Indexed tables for fast queries
- Automated log cleanup functions
- Efficient statistics views

### Scalability
- Room-based broadcasting reduces unnecessary traffic
- Event filtering at the socket level
- Configurable connection limits

## Monitoring and Analytics

### Connection Tracking
- Active user monitoring
- Session duration tracking
- Connection history logs

### Event Logging
- All WebSocket events logged
- Audit trail for system changes
- Performance metrics collection

### Statistics
- Real-time system metrics
- User activity analytics
- Parking utilization data

## Troubleshooting

### Common Issues

#### Connection Failed
```javascript
// Check token validity
socket.on('connect_error', (error) => {
  if (error.message === 'Authentication error') {
    // Refresh token and reconnect
  }
});
```

#### Missing Updates
```javascript
// Verify room subscription
socket.emit('subscribe', {
  room: 'parking_updates',
  type: 'general'
});
```

#### Performance Issues
- Check for memory leaks in event listeners
- Verify room cleanup on disconnect
- Monitor database query performance

### Debug Mode
```javascript
// Enable debug logging
localStorage.debug = 'socket.io-client:socket';
```

## Future Enhancements

### Planned Features
- Push notifications for mobile apps
- Real-time chat support
- Advanced analytics dashboard
- Geolocation-based updates
- Offline synchronization

### Scalability Improvements
- Redis adapter for multi-server deployment
- Message queuing for high-volume events
- CDN integration for global distribution
- Load balancing for WebSocket connections

## Support

For issues or questions about the real-time system:
1. Check the troubleshooting section
2. Review WebSocket connection logs
3. Verify database migrations are applied
4. Ensure environment variables are configured

## API Testing

Use the provided test scripts to verify real-time functionality:
```bash
# Install dependencies
npm install

# Start the server
npm run dev

# Test WebSocket connections
node test/websocket-test.js
```
