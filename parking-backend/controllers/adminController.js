const { supabase } = require('../supabase');
const bcrypt = require('bcrypt');

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('id, name, email, role, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by role if specified
    if (role && ['admin', 'user'].includes(role)) {
      query = query.eq('role', role);
    }

    // Search by name or email
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Get all users error:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user role (admin only)
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const adminId = req.user.id;

    // Validate role
    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "admin" or "user"' });
    }

    // Prevent admin from demoting themselves
    if (userId === adminId && role === 'user') {
      return res.status(400).json({ error: 'Cannot demote yourself from admin role' });
    }

    // Update user role
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select('id, name, email, role, created_at')
      .single();

    if (error) {
      console.error('Update user role error:', error);
      return res.status(500).json({ error: 'Failed to update user role' });
    }

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If promoting to admin, grant all permissions
    if (role === 'admin') {
      const permissions = [
        'manage_parking_lots',
        'view_all_bookings',
        'manage_users',
        'view_analytics',
        'system_settings'
      ];

      for (const permission of permissions) {
        await supabase
          .from('admin_permissions')
          .insert({
            user_id: userId,
            permission,
            granted_by: adminId
          })
          .on('conflict', 'do_nothing');
      }
    } else if (role === 'user') {
      // Remove all admin permissions when demoting to user
      await supabase
        .from('admin_permissions')
        .delete()
        .eq('user_id', userId);
    }

    res.json(updatedUser);
  } catch (err) {
    console.error('Update user role error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    // Prevent admin from deleting themselves
    if (userId === adminId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user exists
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user (cascading deletes will handle related records)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('Delete user error:', deleteError);
      return res.status(500).json({ error: 'Failed to delete user' });
    }

    res.json({ message: 'User deleted successfully', deletedUser: user });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get system statistics (admin only)
exports.getSystemStats = async (req, res) => {
  try {
    // Get user statistics
    const { data: userStats } = await supabase
      .from('users')
      .select('role')
      .then(({ data }) => {
        const stats = { total: data?.length || 0, admin: 0, user: 0 };
        data?.forEach(user => {
          stats[user.role] = (stats[user.role] || 0) + 1;
        });
        return { data: stats };
      });

    // Get parking lot statistics
    const { data: parkingLotStats } = await supabase
      .from('parking_lots')
      .select('total_spaces, available_spaces')
      .then(({ data }) => {
        const stats = {
          total_lots: data?.length || 0,
          total_spaces: data?.reduce((sum, lot) => sum + lot.total_spaces, 0) || 0,
          available_spaces: data?.reduce((sum, lot) => sum + lot.available_spaces, 0) || 0
        };
        stats.occupied_spaces = stats.total_spaces - stats.available_spaces;
        return { data: stats };
      });

    // Get booking statistics
    const { data: bookingStats } = await supabase
      .from('bookings')
      .select('status, total_cost')
      .then(({ data }) => {
        const stats = {
          total_bookings: data?.length || 0,
          active: 0,
          completed: 0,
          cancelled: 0,
          total_revenue: 0
        };
        data?.forEach(booking => {
          stats[booking.status] = (stats[booking.status] || 0) + 1;
          if (booking.status === 'completed') {
            stats.total_revenue += parseFloat(booking.total_cost || 0);
          }
        });
        return { data: stats };
      });

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentBookings } = await supabase
      .from('bookings')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .then(({ data }) => ({ data: data?.length || 0 }));

    const { data: recentUsers } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .then(({ data }) => ({ data: data?.length || 0 }));

    res.json({
      users: userStats,
      parking_lots: parkingLotStats,
      bookings: bookingStats,
      recent_activity: {
        new_bookings_30d: recentBookings,
        new_users_30d: recentUsers
      },
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Get system stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create admin user (super admin only - for initial setup)
exports.createAdminUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const { data: newAdmin, error } = await supabase
      .from('users')
      .insert([{
        name,
        email,
        password: hashedPassword,
        role: 'admin'
      }])
      .select('id, name, email, role, created_at')
      .single();

    if (error) {
      console.error('Create admin user error:', error);
      return res.status(500).json({ error: 'Failed to create admin user' });
    }

    // Grant all permissions to new admin
    const permissions = [
      'manage_parking_lots',
      'view_all_bookings',
      'manage_users',
      'view_analytics',
      'system_settings'
    ];

    for (const permission of permissions) {
      await supabase
        .from('admin_permissions')
        .insert({
          user_id: newAdmin.id,
          permission,
          granted_by: req.user.id
        });
    }

    res.status(201).json({
      message: 'Admin user created successfully',
      user: newAdmin
    });
  } catch (err) {
    console.error('Create admin user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user permissions (admin only)
exports.getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: permissions, error: permError } = await supabase
      .from('admin_permissions')
      .select('permission, granted_at, granted_by')
      .eq('user_id', userId);

    if (permError) {
      console.error('Get user permissions error:', permError);
      return res.status(500).json({ error: 'Failed to fetch user permissions' });
    }

    res.json({
      user,
      permissions: permissions || []
    });
  } catch (err) {
    console.error('Get user permissions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
