const { supabase } = require('../supabase');
const notificationService = require('../services/notificationService');
const websocketService = require('../services/websocketService');

// Helper function to check for booking conflicts
const checkBookingConflict = async (parkingLotId, startTime, endTime, excludeBookingId = null) => {
  let query = supabase
    .from('bookings')
    .select('id')
    .eq('parking_lot_id', parkingLotId)
    .eq('status', 'active')
    .or(`start_time.lte.${endTime},end_time.gte.${startTime}`);

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  const { data: conflicts } = await query;
  return conflicts && conflicts.length > 0;
};

// Helper function to calculate booking cost
const calculateBookingCost = async (parkingLotId, startTime, endTime) => {
  const { data: parkingLot } = await supabase
    .from('parking_lots')
    .select('price_per_hour')
    .eq('id', parkingLotId)
    .single();

  if (!parkingLot) return null;

  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationHours = (end - start) / (1000 * 60 * 60); // Convert ms to hours
  
  return Math.ceil(durationHours * parkingLot.price_per_hour * 100) / 100; // Round up to nearest cent
};

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    const { parking_lot_id, start_time, end_time } = req.body;
    const user_id = req.user.id;

    // Validation
    if (!parking_lot_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'Parking lot ID, start time, and end time are required' });
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    const now = new Date();

    // Check if start time is in the future
    if (startDate <= now) {
      return res.status(400).json({ error: 'Start time must be in the future' });
    }

    // Check if end time is after start time
    if (endDate <= startDate) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    // Check if parking lot exists and has available spaces
    const { data: parkingLot, error: lotError } = await supabase
      .from('parking_lots')
      .select('*')
      .eq('id', parking_lot_id)
      .single();

    if (lotError || !parkingLot) {
      return res.status(404).json({ error: 'Parking lot not found' });
    }

    if (parkingLot.available_spaces <= 0) {
      return res.status(400).json({ error: 'No available spaces in this parking lot' });
    }

    // Check for booking conflicts
    const hasConflict = await checkBookingConflict(parking_lot_id, start_time, end_time);
    if (hasConflict) {
      return res.status(409).json({ error: 'Time slot is already booked' });
    }

    // Calculate total cost
    const totalCost = await calculateBookingCost(parking_lot_id, start_time, end_time);
    if (totalCost === null) {
      return res.status(500).json({ error: 'Failed to calculate booking cost' });
    }

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        user_id,
        parking_lot_id,
        start_time,
        end_time,
        total_cost: totalCost
      }])
      .select(`
        *,
        parking_lots (
          name,
          location,
          price_per_hour
        )
      `)
      .single();

    if (bookingError) {
      console.error('Booking creation error:', bookingError);
      return res.status(500).json({ error: 'Failed to create booking' });
    }

    // Update available spaces (decrease by 1)
    const { error: updateError } = await supabase
      .from('parking_lots')
      .update({ available_spaces: parkingLot.available_spaces - 1 })
      .eq('id', parking_lot_id);

    if (updateError) {
      console.error('Failed to update parking lot spaces:', updateError);
      // Note: In a production system, you'd want to implement proper transaction handling
    }

    // Send booking confirmation notification
    try {
      await notificationService.sendBookingConfirmation(user_id, booking.id);
      await notificationService.scheduleBookingReminder(user_id, booking.id);
    } catch (notificationError) {
      console.error('Failed to send booking notifications:', notificationError);
      // Don't fail the booking creation if notifications fail
    }

    // Broadcast real-time updates
    try {
      // Broadcast parking lot availability update
      websocketService.broadcastParkingUpdate(parking_lot_id, {
        available_spaces: parkingLot.available_spaces - 1,
        action: 'booking_created'
      });

      // Broadcast booking creation to user
      websocketService.broadcastBookingUpdate(user_id, booking.id, {
        status: 'created',
        action: 'booking_created',
        booking: booking
      });
    } catch (wsError) {
      console.error('Failed to broadcast real-time updates:', wsError);
    }

    res.status(201).json(booking);
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's bookings
exports.getUserBookings = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { status } = req.query;

    let query = supabase
      .from('bookings')
      .select(`
        *,
        parking_lots (
          name,
          location,
          price_per_hour
        )
      `)
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Get user bookings error:', error);
      return res.status(500).json({ error: 'Failed to fetch bookings' });
    }

    res.json(bookings);
  } catch (err) {
    console.error('Get user bookings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a specific booking
exports.getBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        parking_lots (
          name,
          location,
          price_per_hour
        )
      `)
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (error || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (err) {
    console.error('Get booking error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a booking
exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { start_time, end_time } = req.body;
    const user_id = req.user.id;

    // Get existing booking
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (fetchError || !existingBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (existingBooking.status !== 'active') {
      return res.status(400).json({ error: 'Cannot update completed or cancelled booking' });
    }

    // Check if booking start time has passed
    const now = new Date();
    const bookingStart = new Date(existingBooking.start_time);
    if (bookingStart <= now) {
      return res.status(400).json({ error: 'Cannot update booking that has already started' });
    }

    const updates = {};
    
    if (start_time) {
      const startDate = new Date(start_time);
      if (startDate <= now) {
        return res.status(400).json({ error: 'Start time must be in the future' });
      }
      updates.start_time = start_time;
    }

    if (end_time) {
      updates.end_time = end_time;
    }

    // If times are being updated, validate and recalculate cost
    if (start_time || end_time) {
      const newStartTime = start_time || existingBooking.start_time;
      const newEndTime = end_time || existingBooking.end_time;

      if (new Date(newEndTime) <= new Date(newStartTime)) {
        return res.status(400).json({ error: 'End time must be after start time' });
      }

      // Check for conflicts (excluding current booking)
      const hasConflict = await checkBookingConflict(
        existingBooking.parking_lot_id,
        newStartTime,
        newEndTime,
        id
      );

      if (hasConflict) {
        return res.status(409).json({ error: 'Updated time slot conflicts with another booking' });
      }

      // Recalculate cost
      const newCost = await calculateBookingCost(
        existingBooking.parking_lot_id,
        newStartTime,
        newEndTime
      );

      if (newCost !== null) {
        updates.total_cost = newCost;
      }
    }

    // Update the booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user_id)
      .select(`
        *,
        parking_lots (
          name,
          location,
          price_per_hour
        )
      `)
      .single();

    if (updateError) {
      console.error('Update booking error:', updateError);
      return res.status(500).json({ error: 'Failed to update booking' });
    }

    res.json(updatedBooking);
  } catch (err) {
    console.error('Update booking error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Cancel a booking
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Get existing booking
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (fetchError || !existingBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (existingBooking.status !== 'active') {
      return res.status(400).json({ error: 'Booking is already cancelled or completed' });
    }

    // Update booking status to cancelled
    const { data: cancelledBooking, error: cancelError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('user_id', user_id)
      .select(`
        *,
        parking_lots (
          name,
          location,
          price_per_hour
        )
      `)
      .single();

    if (cancelError) {
      console.error('Cancel booking error:', cancelError);
      return res.status(500).json({ error: 'Failed to cancel booking' });
    }

    // Increase available spaces back
    const { data: parkingLot } = await supabase
      .from('parking_lots')
      .select('available_spaces')
      .eq('id', existingBooking.parking_lot_id)
      .single();

    if (parkingLot) {
      await supabase
        .from('parking_lots')
        .update({ available_spaces: parkingLot.available_spaces + 1 })
        .eq('id', existingBooking.parking_lot_id);
    }

    // Broadcast real-time updates for cancellation
    try {
      // Broadcast parking lot availability update (space released)
      websocketService.broadcastParkingUpdate(existingBooking.parking_lot_id, {
        available_spaces: parkingLot.available_spaces + 1,
        action: 'booking_cancelled'
      });

      // Broadcast booking cancellation to user
      websocketService.broadcastBookingUpdate(user_id, id, {
        status: 'cancelled',
        action: 'booking_cancelled',
        booking: cancelledBooking
      });
    } catch (wsError) {
      console.error('Failed to broadcast cancellation updates:', wsError);
    }

    res.json(cancelledBooking);
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all bookings for a parking lot (admin function)
exports.getParkingLotBookings = async (req, res) => {
  try {
    const { parking_lot_id } = req.params;
    const { status, date } = req.query;

    let query = supabase
      .from('bookings')
      .select(`
        *,
        users (
          name,
          email
        )
      `)
      .eq('parking_lot_id', parking_lot_id)
      .order('start_time', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString());
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Get parking lot bookings error:', error);
      return res.status(500).json({ error: 'Failed to fetch bookings' });
    }

    res.json(bookings);
  } catch (err) {
    console.error('Get parking lot bookings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
