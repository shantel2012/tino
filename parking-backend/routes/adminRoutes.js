const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin, requirePermission } = require('../middleware/roleMiddleware');

// All admin routes require admin role
router.use(requireAdmin);

// User management routes
router.get('/users', adminController.getAllUsers);
router.patch('/users/:userId/role', adminController.updateUserRole);
router.delete('/users/:userId', adminController.deleteUser);
router.post('/users/admin', adminController.createAdminUser);
router.get('/users/:userId/permissions', adminController.getUserPermissions);

// System statistics
router.get('/stats', adminController.getSystemStats);

module.exports = router;
