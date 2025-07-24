const { supabase } = require('../supabase');
const websocketService = require('../services/websocketService');

// Get all parking owners (admin only)
exports.getAllOwners = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, business_type, is_verified, city } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('parking_owners')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (business_type) {
      query = query.eq('business_type', business_type);
    }

    if (is_verified !== undefined) {
      query = query.eq('is_verified', is_verified === 'true');
    }

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    // Apply pagination and ordering
    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const { data: owners, error, count } = await query;

    if (error) {
      console.error('Get all owners error:', error);
      return res.status(500).json({ error: 'Failed to fetch owners' });
    }

    res.json({
      message: 'Owners retrieved successfully',
      owners: owners,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error('Get all owners error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get specific owner by ID (admin only)
exports.getOwner = async (req, res) => {
  try {
    const { owner_id } = req.params;

    const { data: owner, error } = await supabase
      .from('parking_owners')
      .select('*')
      .eq('id', owner_id)
      .single();

    if (error) {
      console.error('Get owner error:', error);
      return res.status(500).json({ error: 'Failed to fetch owner' });
    }

    if (!owner) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    res.json({
      message: 'Owner retrieved successfully',
      owner: owner
    });
  } catch (err) {
    console.error('Get owner error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new parking owner (admin only)
exports.createOwner = async (req, res) => {
  try {
    const {
      name,
      company_name,
      registration_number,
      email,
      phone,
      alternative_phone,
      address,
      city,
      state,
      postal_code,
      country = 'Zimbabwe',
      business_type = 'individual',
      tax_number,
      bank_account_name,
      bank_account_number,
      bank_name,
      bank_branch,
      commission_rate = 10.00,
      payment_terms = 'monthly',
      bio,
      website,
      social_media = {},
      notification_preferences
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate business type
    const validBusinessTypes = ['individual', 'company', 'government', 'organization'];
    if (!validBusinessTypes.includes(business_type)) {
      return res.status(400).json({ error: 'Invalid business type' });
    }

    // Validate commission rate
    if (commission_rate < 0 || commission_rate > 100) {
      return res.status(400).json({ error: 'Commission rate must be between 0 and 100' });
    }

    const { data: newOwner, error } = await supabase
      .from('parking_owners')
      .insert([{
        name,
        company_name,
        registration_number,
        email,
        phone,
        alternative_phone,
        address,
        city,
        state,
        postal_code,
        country,
        business_type,
        tax_number,
        bank_account_name,
        bank_account_number,
        bank_name,
        bank_branch,
        commission_rate,
        payment_terms,
        bio,
        website,
        social_media,
        notification_preferences
      }])
      .select()
      .single();

    if (error) {
      console.error('Create owner error:', error);
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: 'Failed to create owner' });
    }

    res.status(201).json({
      message: 'Owner created successfully',
      owner: newOwner
    });
  } catch (err) {
    console.error('Create owner error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update parking owner (admin only)
exports.updateOwner = async (req, res) => {
  try {
    const { owner_id } = req.params;
    const updateData = { ...req.body };

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.verification_date;

    // Validate email if provided
    if (updateData.email) {
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(updateData.email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    // Validate business type if provided
    if (updateData.business_type) {
      const validBusinessTypes = ['individual', 'company', 'government', 'organization'];
      if (!validBusinessTypes.includes(updateData.business_type)) {
        return res.status(400).json({ error: 'Invalid business type' });
      }
    }

    // Validate commission rate if provided
    if (updateData.commission_rate !== undefined) {
      if (updateData.commission_rate < 0 || updateData.commission_rate > 100) {
        return res.status(400).json({ error: 'Commission rate must be between 0 and 100' });
      }
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updatedOwner, error } = await supabase
      .from('parking_owners')
      .update(updateData)
      .eq('id', owner_id)
      .select()
      .single();

    if (error) {
      console.error('Update owner error:', error);
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: 'Failed to update owner' });
    }

    if (!updatedOwner) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    res.json({
      message: 'Owner updated successfully',
      owner: updatedOwner
    });
  } catch (err) {
    console.error('Update owner error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify parking owner (admin only)
exports.verifyOwner = async (req, res) => {
  try {
    const { owner_id } = req.params;
    const { verification_documents = [] } = req.body;

    const { data: verifiedOwner, error } = await supabase
      .from('parking_owners')
      .update({
        is_verified: true,
        verification_date: new Date().toISOString(),
        verification_documents: verification_documents,
        updated_at: new Date().toISOString()
      })
      .eq('id', owner_id)
      .select()
      .single();

    if (error) {
      console.error('Verify owner error:', error);
      return res.status(500).json({ error: 'Failed to verify owner' });
    }

    if (!verifiedOwner) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    res.json({
      message: 'Owner verified successfully',
      owner: verifiedOwner
    });
  } catch (err) {
    console.error('Verify owner error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete parking owner (admin only)
exports.deleteOwner = async (req, res) => {
  try {
    const { owner_id } = req.params;

    // Check if owner has parking lots
    const { data: parkingLots, error: lotsError } = await supabase
      .from('parking_lots')
      .select('id, name')
      .eq('owner_id', owner_id);

    if (lotsError) {
      console.error('Check parking lots error:', lotsError);
      return res.status(500).json({ error: 'Failed to check owner dependencies' });
    }

    if (parkingLots && parkingLots.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete owner with active parking lots',
        parking_lots: parkingLots.map(lot => lot.name)
      });
    }

    const { data: deletedOwner, error } = await supabase
      .from('parking_owners')
      .delete()
      .eq('id', owner_id)
      .select()
      .single();

    if (error) {
      console.error('Delete owner error:', error);
      return res.status(500).json({ error: 'Failed to delete owner' });
    }

    if (!deletedOwner) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    res.json({
      message: 'Owner deleted successfully',
      owner: deletedOwner
    });
  } catch (err) {
    console.error('Delete owner error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get owner's parking lots
exports.getOwnerParkingLots = async (req, res) => {
  try {
    const { owner_id } = req.params;

    const { data: parkingLots, error } = await supabase
      .from('parking_lots_with_owners')
      .select('*')
      .eq('owner_id', owner_id)
      .order('parking_lot_name');

    if (error) {
      console.error('Get owner parking lots error:', error);
      return res.status(500).json({ error: 'Failed to fetch owner parking lots' });
    }

    res.json({
      message: 'Owner parking lots retrieved successfully',
      parking_lots: parkingLots
    });
  } catch (err) {
    console.error('Get owner parking lots error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get owner revenue report
exports.getOwnerRevenue = async (req, res) => {
  try {
    const { owner_id } = req.params;
    const { start_date, end_date } = req.query;

    // Set default date range (last 30 days)
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    const { data: revenueData, error } = await supabase
      .rpc('calculate_owner_revenue', {
        owner_uuid: owner_id,
        start_date: startDate,
        end_date: endDate
      });

    if (error) {
      console.error('Get owner revenue error:', error);
      return res.status(500).json({ error: 'Failed to calculate owner revenue' });
    }

    // Get owner information
    const { data: owner, error: ownerError } = await supabase
      .from('parking_owners')
      .select('name, company_name, commission_rate, payment_terms')
      .eq('id', owner_id)
      .single();

    if (ownerError) {
      console.error('Get owner info error:', ownerError);
      return res.status(500).json({ error: 'Failed to fetch owner information' });
    }

    const revenue = revenueData[0] || {
      total_revenue: 0,
      owner_commission: 0,
      platform_commission: 0,
      total_bookings: 0
    };

    res.json({
      message: 'Owner revenue report generated successfully',
      owner: owner,
      period: {
        start_date: startDate,
        end_date: endDate
      },
      revenue: revenue
    });
  } catch (err) {
    console.error('Get owner revenue error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get owner statistics (admin only)
exports.getOwnerStatistics = async (req, res) => {
  try {
    const [
      totalOwners,
      verifiedOwners,
      activeOwners,
      companiesCount,
      individualsCount,
      governmentCount,
      organizationsCount
    ] = await Promise.all([
      supabase.from('parking_owners').select('id', { count: 'exact', head: true }),
      supabase.from('parking_owners').select('id', { count: 'exact', head: true }).eq('is_verified', true),
      supabase.from('parking_owners').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('parking_owners').select('id', { count: 'exact', head: true }).eq('business_type', 'company'),
      supabase.from('parking_owners').select('id', { count: 'exact', head: true }).eq('business_type', 'individual'),
      supabase.from('parking_owners').select('id', { count: 'exact', head: true }).eq('business_type', 'government'),
      supabase.from('parking_owners').select('id', { count: 'exact', head: true }).eq('business_type', 'organization')
    ]);

    const stats = {
      total_owners: totalOwners.count || 0,
      verified_owners: verifiedOwners.count || 0,
      active_owners: activeOwners.count || 0,
      business_types: {
        companies: companiesCount.count || 0,
        individuals: individualsCount.count || 0,
        government: governmentCount.count || 0,
        organizations: organizationsCount.count || 0
      },
      verification_rate: totalOwners.count > 0 ? 
        Math.round((verifiedOwners.count / totalOwners.count) * 100) : 0
    };

    res.json({
      message: 'Owner statistics retrieved successfully',
      statistics: stats,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Get owner statistics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update owner notification preferences
exports.updateOwnerNotifications = async (req, res) => {
  try {
    const { owner_id } = req.params;
    const { notification_preferences } = req.body;

    if (!notification_preferences || typeof notification_preferences !== 'object') {
      return res.status(400).json({ error: 'Valid notification preferences object is required' });
    }

    const { data: updatedOwner, error } = await supabase
      .from('parking_owners')
      .update({
        notification_preferences: notification_preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', owner_id)
      .select('notification_preferences')
      .single();

    if (error) {
      console.error('Update owner notifications error:', error);
      return res.status(500).json({ error: 'Failed to update notification preferences' });
    }

    if (!updatedOwner) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    res.json({
      message: 'Notification preferences updated successfully',
      notification_preferences: updatedOwner.notification_preferences
    });
  } catch (err) {
    console.error('Update owner notifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
