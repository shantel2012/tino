const express = require('express');
const router = express.Router();
const realtimeController = require('../controllers/realtimeController');
const { requireAdmin } = require('../middleware/roleMiddleware');

// Get real-time parking availability (public for authenticated users)
router.get('/parking-availability', realtimeController.getRealTimeParkingAvailability);

// Get WebSocket connection status for current user
router.get('/connection-status', realtimeController.getConnectionStatus);

// Admin-only routes
router.get('/connections', requireAdmin, realtimeController.getConnectionInfo);
router.get('/live-stats', requireAdmin, realtimeController.getLiveStatistics);
router.get('/booking-activity', requireAdmin, realtimeController.getRealTimeBookingActivity);

// Send system announcement (admin only)
router.post('/announcement', requireAdmin, realtimeController.sendSystemAnnouncement);

// Manual parking lot availability update (admin only)
router.put('/parking-lots/:parking_lot_id/availability', requireAdmin, realtimeController.updateParkingLotAvailability);

module.exports = router;
