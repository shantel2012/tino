const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { requireAdmin } = require('../middleware/roleMiddleware');

// User notification routes
router.get('/history', notificationController.getNotificationHistory);
router.get('/preferences', notificationController.getNotificationPreferences);
router.put('/preferences', notificationController.updateNotificationPreferences);
router.post('/test', notificationController.sendTestNotification);
router.patch('/:notification_id/read', notificationController.markNotificationAsRead);
router.get('/stats', notificationController.getNotificationStats);

// Admin notification routes
router.get('/admin/all', requireAdmin, notificationController.getAllNotifications);
router.get('/admin/templates', requireAdmin, notificationController.getNotificationTemplates);
router.put('/admin/templates/:template_id', requireAdmin, notificationController.updateNotificationTemplate);
router.post('/admin/bulk', requireAdmin, notificationController.sendBulkNotification);

module.exports = router;
