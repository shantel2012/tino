const { supabase } = require('../supabase');

// Middleware to check if user has admin role
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user role from database
    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(403).json({ error: 'Access denied: User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admin privileges required' });
    }

    req.user.role = user.role;
    next();
  } catch (err) {
    console.error('Admin check error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to check if user has specific permission
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      
      // First check if user is admin (admins have all permissions)
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return res.status(403).json({ error: 'Access denied: User not found' });
      }

      // Admins have all permissions
      if (user.role === 'admin') {
        req.user.role = user.role;
        return next();
      }

      // Check specific permission for non-admin users
      const { data: permissions, error: permError } = await supabase
        .from('admin_permissions')
        .select('permission')
        .eq('user_id', userId)
        .eq('permission', permission);

      if (permError || !permissions || permissions.length === 0) {
        return res.status(403).json({ 
          error: `Access denied: ${permission} permission required` 
        });
      }

      req.user.role = user.role;
      next();
    } catch (err) {
      console.error('Permission check error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Middleware to check if user can access resource (own data or admin)
const requireOwnershipOrAdmin = (resourceUserIdField = 'user_id') => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      
      // Get user role
      const { data: user, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return res.status(403).json({ error: 'Access denied: User not found' });
      }

      req.user.role = user.role;

      // Admins can access any resource
      if (user.role === 'admin') {
        return next();
      }

      // For non-admins, check if they own the resource
      const resourceUserId = req.body[resourceUserIdField] || req.params[resourceUserIdField];
      
      if (resourceUserId && resourceUserId !== userId) {
        return res.status(403).json({ 
          error: 'Access denied: You can only access your own resources' 
        });
      }

      next();
    } catch (err) {
      console.error('Ownership check error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Middleware to add user role to request object
const addUserRole = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !user) {
      req.user.role = 'user'; // Default role
    } else {
      req.user.role = user.role;
    }

    next();
  } catch (err) {
    console.error('Add user role error:', err);
    req.user.role = 'user'; // Default role on error
    next();
  }
};

module.exports = {
  requireAdmin,
  requirePermission,
  requireOwnershipOrAdmin,
  addUserRole
};
