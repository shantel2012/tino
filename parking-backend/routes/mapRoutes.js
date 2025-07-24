const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');

// Public routes (no authentication required for basic map data)
router.get('/parking-lots', mapController.getAllParkingLotsForMap);
router.get('/nearby', mapController.getNearbyParkingLots);
router.get('/search', mapController.searchParkingByLocation);
router.get('/clusters', mapController.getParkingClusters);

// Protected routes (authentication required)
router.get('/directions/:parking_lot_id', mapController.getDirections);

module.exports = router;
