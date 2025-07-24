const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

// Create a new booking
router.post('/', bookingController.createBooking);

// Get user's bookings
router.get('/user', bookingController.getUserBookings);

// Get a specific booking
router.get('/:id', bookingController.getBooking);

// Update a booking
router.put('/:id', bookingController.updateBooking);

// Cancel a booking
router.delete('/:id', bookingController.cancelBooking);

// Get all bookings for a parking lot (admin function)
router.get('/parking-lot/:parking_lot_id', bookingController.getParkingLotBookings);

module.exports = router;
