const express = require('express');
const router = express.Router();
const parkingOwnerController = require('../controllers/parkingOwnerController');
const { requireAdmin } = require('../middleware/roleMiddleware');

// All routes require admin privileges
router.use(requireAdmin);

// Owner CRUD operations
router.get('/', parkingOwnerController.getAllOwners);
router.get('/statistics', parkingOwnerController.getOwnerStatistics);
router.get('/:owner_id', parkingOwnerController.getOwner);
router.post('/', parkingOwnerController.createOwner);
router.put('/:owner_id', parkingOwnerController.updateOwner);
router.delete('/:owner_id', parkingOwnerController.deleteOwner);

// Owner verification
router.put('/:owner_id/verify', parkingOwnerController.verifyOwner);

// Owner's parking lots and revenue
router.get('/:owner_id/parking-lots', parkingOwnerController.getOwnerParkingLots);
router.get('/:owner_id/revenue', parkingOwnerController.getOwnerRevenue);

// Owner notification preferences
router.put('/:owner_id/notifications', parkingOwnerController.updateOwnerNotifications);

module.exports = router;
