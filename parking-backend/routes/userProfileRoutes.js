const express = require('express');
const router = express.Router();
const userProfileController = require('../controllers/userProfileController');
const { requireAdmin } = require('../middleware/roleMiddleware');

// User's own profile routes
router.get('/me', userProfileController.getMyProfile);
router.put('/me', userProfileController.updateMyProfile);

// User preferences routes
router.put('/me/preferences', userProfileController.updatePreferences);
router.get('/me/preferences/:path', userProfileController.getPreference);
router.put('/me/preferences/:path', userProfileController.updatePreference);

// Profile verification routes
router.put('/verify/:user_id', userProfileController.verifyProfile);

// Admin-only routes
router.get('/', requireAdmin, userProfileController.getAllProfiles);
router.get('/statistics', requireAdmin, userProfileController.getProfileStatistics);
router.get('/:user_id', requireAdmin, userProfileController.getUserProfile);
router.delete('/:user_id', requireAdmin, userProfileController.deleteUserProfile);

module.exports = router;
