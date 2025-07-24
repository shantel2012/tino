const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Create payment intent for booking
router.post('/create-payment-intent', paymentController.createPaymentIntent);

// Confirm payment
router.post('/confirm-payment', paymentController.confirmPayment);

// Get payment history for user
router.get('/history', paymentController.getPaymentHistory);

// Get specific payment details
router.get('/:payment_id', paymentController.getPayment);

// Process refund
router.post('/:payment_id/refund', paymentController.processRefund);

module.exports = router;
