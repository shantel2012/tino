const { supabase } = require('../supabase');
const websocketService = require('../services/websocketService');

// Get user's own profile
exports.getMyProfile = async (req, res) => {
  try {
    const user_id = req.user.id;

    const { data: profile, error } = await supabase
      .from('user_profile_summary')
      .select('*')
      .eq('id', user_id)
      .single();

    if (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      message: 'Profile retrieved successfully',
      profile: profile
    });
  } catch (err) {
    console.error('Get my profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user's own profile
exports.updateMyProfile = async (req, res) => {
  try {
    const user_id = req.user.id;
    const {
      phone,
      address,
      city,
      state,
      postal_code,
      country,
      date_of_birth,
      profile_picture_url,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      preferences
    } = req.body;

    // Validate phone format if provided
    if (phone && !/^[+]?[0-9\s\-\(\)]+$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Validate date of birth if provided
    if (date_of_birth) {
      const birthDate = new Date(date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 16 || age > 120) {
        return res.status(400).json({ error: 'Invalid date of birth' });
      }
    }

    // Prepare update data
    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Only include fields that are provided
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (postal_code !== undefined) updateData.postal_code = postal_code;
    if (country !== undefined) updateData.country = country;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;
    if (profile_picture_url !== undefined) updateData.profile_picture_url = profile_picture_url;
    if (emergency_contact_name !== undefined) updateData.emergency_contact_name = emergency_contact_name;
    if (emergency_contact_phone !== undefined) updateData.emergency_contact_phone = emergency_contact_phone;
    if (emergency_contact_relationship !== undefined) updateData.emergency_contact_relationship = emergency_contact_relationship;
    if (preferences !== undefined) updateData.preferences = preferences;

    const { data: updatedProfile, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    // Get complete profile data with user info
    const { data: completeProfile, error: fetchError } = await supabase
      .from('user_profile_summary')
      .select('*')
      .eq('id', user_id)
      .single();

    if (fetchError) {
      console.error('Fetch updated profile error:', fetchError);
    }

    // Broadcast profile update for real-time features
    try {
      websocketService.broadcastNotification(user_id, {
        type: 'profile_updated',
        title: 'Profile Updated',
        message: 'Your profile has been successfully updated',
        data: { profile_updated: true }
      });
    } catch (wsError) {
      console.error('Failed to broadcast profile update:', wsError);
    }

    res.json({
      message: 'Profile updated successfully',
      profile: completeProfile || updatedProfile
    });
  } catch (err) {
    console.error('Update my profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user preferences
exports.updatePreferences = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'Valid preferences object is required' });
    }

    // Get current preferences
    const { data: currentProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('user_id', user_id)
      .single();

    if (fetchError) {
      console.error('Fetch current preferences error:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch current preferences' });
    }

    // Merge with existing preferences
    const mergedPreferences = {
      ...currentProfile.preferences,
      ...preferences
    };

    const { data: updatedProfile, error } = await supabase
      .from('user_profiles')
      .update({ 
        preferences: mergedPreferences,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .select('preferences')
      .single();

    if (error) {
      console.error('Update preferences error:', error);
      return res.status(500).json({ error: 'Failed to update preferences' });
    }

    res.json({
      message: 'Preferences updated successfully',
      preferences: updatedProfile.preferences
    });
  } catch (err) {
    console.error('Update preferences error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user preference by path
exports.getPreference = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { path } = req.params;

    if (!path) {
      return res.status(400).json({ error: 'Preference path is required' });
    }

    const { data: result, error } = await supabase
      .rpc('get_user_preference', {
        user_uuid: user_id,
        preference_path: path
      });

    if (error) {
      console.error('Get preference error:', error);
      return res.status(500).json({ error: 'Failed to get preference' });
    }

    res.json({
      path: path,
      value: result
    });
  } catch (err) {
    console.error('Get preference error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update specific user preference by path
exports.updatePreference = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { path } = req.params;
    const { value } = req.body;

    if (!path) {
      return res.status(400).json({ error: 'Preference path is required' });
    }

    if (value === undefined) {
      return res.status(400).json({ error: 'Preference value is required' });
    }

    const { data: result, error } = await supabase
      .rpc('update_user_preference', {
        user_uuid: user_id,
        preference_path: path,
        new_value: String(value)
      });

    if (error) {
      console.error('Update preference error:', error);
      return res.status(500).json({ error: 'Failed to update preference' });
    }

    if (!result) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json({
      message: 'Preference updated successfully',
      path: path,
      value: value
    });
  } catch (err) {
    console.error('Update preference error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify user profile (admin only or self-verification)
exports.verifyProfile = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { verification_method } = req.body;
    const requester_id = req.user.id;
    const requester_role = req.user.role;

    // Check if user can verify this profile
    if (requester_role !== 'admin' && requester_id !== user_id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (!verification_method || !['email', 'phone', 'document'].includes(verification_method)) {
      return res.status(400).json({ error: 'Valid verification method is required (email, phone, document)' });
    }

    const { data: updatedProfile, error } = await supabase
      .from('user_profiles')
      .update({
        is_verified: true,
        verification_method: verification_method,
        verification_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) {
      console.error('Verify profile error:', error);
      return res.status(500).json({ error: 'Failed to verify profile' });
    }

    // Broadcast verification notification
    try {
      websocketService.broadcastNotification(user_id, {
        type: 'profile_verified',
        title: 'Profile Verified',
        message: `Your profile has been verified via ${verification_method}`,
        data: { verification_method: verification_method }
      });
    } catch (wsError) {
      console.error('Failed to broadcast verification notification:', wsError);
    }

    res.json({
      message: 'Profile verified successfully',
      profile: updatedProfile
    });
  } catch (err) {
    console.error('Verify profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all user profiles (admin only)
exports.getAllProfiles = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, verified, city } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('user_profile_summary')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    if (verified !== undefined) {
      query = query.eq('is_verified', verified === 'true');
    }

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    // Apply pagination
    query = query
      .range(offset, offset + limit - 1)
      .order('profile_created_at', { ascending: false });

    const { data: profiles, error, count } = await query;

    if (error) {
      console.error('Get all profiles error:', error);
      return res.status(500).json({ error: 'Failed to fetch profiles' });
    }

    res.json({
      message: 'Profiles retrieved successfully',
      profiles: profiles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error('Get all profiles error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get specific user profile (admin only)
exports.getUserProfile = async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data: profile, error } = await supabase
      .from('user_profile_summary')
      .select('*')
      .eq('id', user_id)
      .single();

    if (error) {
      console.error('Get user profile error:', error);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json({
      message: 'User profile retrieved successfully',
      profile: profile
    });
  } catch (err) {
    console.error('Get user profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete user profile (admin only - soft delete by setting fields to null)
exports.deleteUserProfile = async (req, res) => {
  try {
    const { user_id } = req.params;

    // Soft delete by clearing profile data but keeping the record
    const { data: deletedProfile, error } = await supabase
      .from('user_profiles')
      .update({
        phone: null,
        address: null,
        city: null,
        state: null,
        postal_code: null,
        date_of_birth: null,
        profile_picture_url: null,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        emergency_contact_relationship: null,
        is_verified: false,
        verification_method: null,
        verification_date: null,
        preferences: {
          notifications: { email: true, sms: true, push: true },
          parking: { preferred_payment_method: 'card', auto_extend_booking: false, reminder_minutes: 30 },
          privacy: { show_profile: false, share_location: false }
        },
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) {
      console.error('Delete user profile error:', error);
      return res.status(500).json({ error: 'Failed to delete user profile' });
    }

    res.json({
      message: 'User profile deleted successfully',
      profile: deletedProfile
    });
  } catch (err) {
    console.error('Delete user profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get profile statistics (admin only)
exports.getProfileStatistics = async (req, res) => {
  try {
    // Get various profile statistics
    const [
      totalProfiles,
      verifiedProfiles,
      profilesWithPhone,
      profilesWithAddress,
      completeProfiles,
      recentProfiles
    ] = await Promise.all([
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('is_verified', true),
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }).not('phone', 'is', null),
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }).not('address', 'is', null),
      supabase.from('user_profile_summary').select('id', { count: 'exact', head: true }).eq('profile_complete', true),
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    ]);

    const stats = {
      total_profiles: totalProfiles.count || 0,
      verified_profiles: verifiedProfiles.count || 0,
      profiles_with_phone: profilesWithPhone.count || 0,
      profiles_with_address: profilesWithAddress.count || 0,
      complete_profiles: completeProfiles.count || 0,
      recent_profiles_7_days: recentProfiles.count || 0,
      verification_rate: totalProfiles.count > 0 ? Math.round((verifiedProfiles.count / totalProfiles.count) * 100) : 0,
      completion_rate: totalProfiles.count > 0 ? Math.round((completeProfiles.count / totalProfiles.count) * 100) : 0
    };

    res.json({
      message: 'Profile statistics retrieved successfully',
      statistics: stats,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Get profile statistics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
