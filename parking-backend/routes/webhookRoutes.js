const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Stripe webhook endpoint (no authentication required)
// Note: This endpoint needs raw body, so it should be handled before bodyParser.json()
router.post('/stripe', express.raw({ type: 'application/json' }), paymentController.handleStripeWebhook);

module.exports = router;
