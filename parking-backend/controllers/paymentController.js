const { supabase } = require('../supabase');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const notificationService = require('../services/notificationService');
const websocketService = require('../services/websocketService');

// Create payment intent for booking
exports.createPaymentIntent = async (req, res) => {
  try {
    const { booking_id, payment_method_id } = req.body;
    const user_id = req.user.id;

    if (!booking_id) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        parking_lots (
          name,
          location
        )
      `)
      .eq('id', booking_id)
      .eq('user_id', user_id)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if booking is already paid
    if (booking.payment_status === 'paid') {
      return res.status(400).json({ error: 'Booking is already paid' });
    }

    // Check if booking is still active
    if (booking.status !== 'active') {
      return res.status(400).json({ error: 'Cannot pay for cancelled or completed booking' });
    }

    // Check if payment already exists for this booking
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', booking_id)
      .eq('status', 'succeeded')
      .single();

    if (existingPayment) {
      return res.status(400).json({ error: 'Payment already exists for this booking' });
    }

    // Create Stripe payment intent
    const paymentIntentData = {
      amount: Math.round(booking.total_cost * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        booking_id: booking.id,
        user_id: user_id,
        parking_lot: booking.parking_lots.name,
        location: booking.parking_lots.location
      },
      description: `Parking reservation at ${booking.parking_lots.name}`,
      automatic_payment_methods: {
        enabled: true,
      },
    };

    // If payment method is provided, attach it
    if (payment_method_id) {
      paymentIntentData.payment_method = payment_method_id;
      paymentIntentData.confirm = true;
      paymentIntentData.return_url = `${process.env.FRONTEND_URL}/booking/${booking_id}/payment/success`;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    // Store payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        booking_id,
        user_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: booking.total_cost,
        status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending',
        metadata: {
          stripe_payment_intent: paymentIntent.id,
          booking_details: {
            parking_lot: booking.parking_lots.name,
            location: booking.parking_lots.location,
            start_time: booking.start_time,
            end_time: booking.end_time
          }
        }
      }])
      .select()
      .single();

    if (paymentError) {
      console.error('Payment record creation error:', paymentError);
      return res.status(500).json({ error: 'Failed to create payment record' });
    }

    // If payment succeeded immediately, update booking status
    if (paymentIntent.status === 'succeeded') {
      await supabase
        .from('bookings')
        .update({ payment_status: 'paid' })
        .eq('id', booking_id);

      await supabase
        .from('payments')
        .update({ 
          paid_at: new Date().toISOString(),
          stripe_charge_id: paymentIntent.latest_charge 
        })
        .eq('id', payment.id);

      // Send payment receipt notification
      try {
        await notificationService.sendPaymentReceipt(user_id, payment.id);
      } catch (notificationError) {
        console.error('Failed to send payment receipt notification:', notificationError);
      }

      // Broadcast real-time payment update
      try {
        websocketService.broadcastPaymentUpdate(user_id, payment.id, {
          status: 'succeeded',
          action: 'payment_confirmed',
          payment: payment,
          booking: booking
        });

        // Also broadcast booking status update
        websocketService.broadcastBookingUpdate(user_id, booking_id, {
          payment_status: 'paid',
          action: 'payment_confirmed',
          booking: booking
        });
      } catch (wsError) {
        console.error('Failed to broadcast payment updates:', wsError);
      }
    }

    res.json({
      payment_intent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        status: paymentIntent.status
      },
      payment: payment,
      booking: booking
    });
  } catch (err) {
    console.error('Create payment intent error:', err);
    if (err.type === 'StripeCardError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Confirm payment (webhook or manual confirmation)
exports.confirmPayment = async (req, res) => {
  try {
    const { payment_intent_id } = req.body;
    const user_id = req.user.id;

    if (!payment_intent_id) {
      return res.status(400).json({ error: 'Payment intent ID is required' });
    }

    // Get payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('stripe_payment_intent_id', payment_intent_id)
      .eq('user_id', user_id)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Get payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    // Update payment status based on Stripe status
    const updateData = {
      status: paymentIntent.status,
      stripe_charge_id: paymentIntent.latest_charge
    };

    if (paymentIntent.status === 'succeeded') {
      updateData.paid_at = new Date().toISOString();
    }

    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', payment.id)
      .select()
      .single();

    if (updateError) {
      console.error('Payment update error:', updateError);
      return res.status(500).json({ error: 'Failed to update payment' });
    }

    // Update booking payment status if payment succeeded
    if (paymentIntent.status === 'succeeded') {
      await supabase
        .from('bookings')
        .update({ payment_status: 'paid' })
        .eq('id', payment.booking_id);

      // Generate receipt
      await generateReceipt(payment.id);
    }

    res.json({
      payment: updatedPayment,
      stripe_status: paymentIntent.status
    });
  } catch (err) {
    console.error('Confirm payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get payment history for user
exports.getPaymentHistory = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('payments')
      .select(`
        *,
        bookings (
          id,
          start_time,
          end_time,
          parking_lots (
            name,
            location
          )
        )
      `, { count: 'exact' })
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: payments, error, count } = await query;

    if (error) {
      console.error('Get payment history error:', error);
      return res.status(500).json({ error: 'Failed to fetch payment history' });
    }

    res.json({
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error('Get payment history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get specific payment details
exports.getPayment = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const user_id = req.user.id;

    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        bookings (
          id,
          start_time,
          end_time,
          parking_lots (
            name,
            location
          )
        ),
        payment_receipts (
          receipt_number,
          receipt_url
        )
      `)
      .eq('id', payment_id)
      .eq('user_id', user_id)
      .single();

    if (error || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (err) {
    console.error('Get payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Process refund
exports.processRefund = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const { amount, reason } = req.body;
    const user_id = req.user.id;

    // Get payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        bookings (
          id,
          status,
          start_time
        )
      `)
      .eq('id', payment_id)
      .eq('user_id', user_id)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'succeeded') {
      return res.status(400).json({ error: 'Can only refund successful payments' });
    }

    // Check if booking can be refunded (e.g., hasn't started yet)
    const bookingStart = new Date(payment.bookings.start_time);
    const now = new Date();
    const hoursUntilStart = (bookingStart - now) / (1000 * 60 * 60);

    if (hoursUntilStart < 2) {
      return res.status(400).json({ error: 'Cannot refund booking less than 2 hours before start time' });
    }

    // Calculate refund amount
    const refundAmount = amount || payment.amount;
    const refundAmountCents = Math.round(refundAmount * 100);

    // Process refund with Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: refundAmountCents,
      reason: reason || 'requested_by_customer',
      metadata: {
        booking_id: payment.booking_id,
        user_id: user_id
      }
    });

    // Update payment record
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        status: refund.status === 'succeeded' ? 'refunded' : payment.status,
        refund_amount: refundAmount,
        refund_reason: reason,
        refunded_at: refund.status === 'succeeded' ? new Date().toISOString() : null,
        metadata: {
          ...payment.metadata,
          refund_id: refund.id,
          refund_status: refund.status
        }
      })
      .eq('id', payment_id)
      .select()
      .single();

    if (updateError) {
      console.error('Payment refund update error:', updateError);
      return res.status(500).json({ error: 'Failed to update payment record' });
    }

    // Update booking status and payment status
    if (refund.status === 'succeeded') {
      await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          payment_status: 'refunded'
        })
        .eq('id', payment.booking_id);

      // Increase available spaces back
      const { data: booking } = await supabase
        .from('bookings')
        .select('parking_lot_id')
        .eq('id', payment.booking_id)
        .single();

      if (booking) {
        const { data: parkingLot } = await supabase
          .from('parking_lots')
          .select('available_spaces')
          .eq('id', booking.parking_lot_id)
          .single();

        if (parkingLot) {
          await supabase
            .from('parking_lots')
            .update({ available_spaces: parkingLot.available_spaces + 1 })
            .eq('id', booking.parking_lot_id);
        }
      }
    }

    res.json({
      payment: updatedPayment,
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
        reason: refund.reason
      }
    });
  } catch (err) {
    console.error('Process refund error:', err);
    if (err.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Stripe webhook handler
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'refund.created':
        await handleRefundCreated(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

// Helper function to handle successful payment
async function handlePaymentSucceeded(paymentIntent) {
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (payment) {
    await supabase
      .from('payments')
      .update({
        status: 'succeeded',
        paid_at: new Date().toISOString(),
        stripe_charge_id: paymentIntent.latest_charge
      })
      .eq('id', payment.id);

    await supabase
      .from('bookings')
      .update({ payment_status: 'paid' })
      .eq('id', payment.booking_id);

    // Generate receipt
    await generateReceipt(payment.id);
  }
}

// Helper function to handle failed payment
async function handlePaymentFailed(paymentIntent) {
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (payment) {
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed'
      })
      .eq('id', payment.id);

    await supabase
      .from('bookings')
      .update({ payment_status: 'failed' })
      .eq('id', payment.booking_id);
  }
}

// Helper function to handle refund creation
async function handleRefundCreated(refund) {
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('stripe_payment_intent_id', refund.payment_intent)
    .single();

  if (payment) {
    await supabase
      .from('payments')
      .update({
        status: 'refunded',
        refund_amount: refund.amount / 100,
        refunded_at: new Date().toISOString(),
        metadata: {
          ...payment.metadata,
          refund_id: refund.id
        }
      })
      .eq('id', payment.id);
  }
}

// Helper function to generate receipt
async function generateReceipt(paymentId) {
  try {
    const { data: payment } = await supabase
      .from('payments')
      .select(`
        *,
        bookings (
          *,
          parking_lots (
            name,
            location
          )
        )
      `)
      .eq('id', paymentId)
      .single();

    if (payment) {
      const receiptNumber = `RCP-${Date.now()}-${payment.id.substring(0, 8)}`;
      
      const receiptData = {
        receipt_number: receiptNumber,
        payment_id: paymentId,
        amount: payment.amount,
        currency: payment.currency,
        paid_at: payment.paid_at,
        booking: payment.bookings,
        parking_lot: payment.bookings.parking_lots
      };

      await supabase
        .from('payment_receipts')
        .insert([{
          payment_id: paymentId,
          receipt_number: receiptNumber,
          receipt_data: receiptData
        }]);
    }
  } catch (err) {
    console.error('Generate receipt error:', err);
  }
}
