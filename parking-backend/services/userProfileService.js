const { supabase } = require('../supabase');

class UserProfileService {
  // Validate profile data
  static validateProfileData(data) {
    const errors = [];

    // Phone validation
    if (data.phone && !/^[+]?[0-9\s\-\(\)]+$/.test(data.phone)) {
      errors.push('Invalid phone number format');
    }

    // Email validation (if updating email through profile)
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }

    // Date of birth validation
    if (data.date_of_birth) {
      const birthDate = new Date(data.date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (isNaN(birthDate.getTime()) || age < 16 || age > 120) {
        errors.push('Invalid date of birth');
      }
    }

    // Postal code validation
    if (data.postal_code && !/^[0-9A-Za-z\s\-]+$/.test(data.postal_code)) {
      errors.push('Invalid postal code format');
    }

    // Emergency contact phone validation
    if (data.emergency_contact_phone && !/^[+]?[0-9\s\-\(\)]+$/.test(data.emergency_contact_phone)) {
      errors.push('Invalid emergency contact phone format');
    }

    return errors;
  }

  // Check if profile is complete
  static async checkProfileCompleteness(userId) {
    try {
      const { data: profile, error } = await supabase
        .from('user_profile_summary')
        .select('profile_complete, phone, address, city')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      return {
        isComplete: profile.profile_complete,
        missingFields: {
          phone: !profile.phone,
          address: !profile.address,
          city: !profile.city
        }
      };
    } catch (error) {
      console.error('Check profile completeness error:', error);
      throw error;
    }
  }

  // Get user profile with additional computed fields
  static async getEnhancedProfile(userId) {
    try {
      const { data: profile, error } = await supabase
        .from('user_profile_summary')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      // Add computed fields
      const enhancedProfile = {
        ...profile,
        profile_completion_percentage: this.calculateCompletionPercentage(profile),
        account_age_days: this.calculateAccountAge(profile.user_created_at),
        last_updated_days_ago: this.calculateDaysAgo(profile.profile_updated_at)
      };

      return enhancedProfile;
    } catch (error) {
      console.error('Get enhanced profile error:', error);
      throw error;
    }
  }

  // Calculate profile completion percentage
  static calculateCompletionPercentage(profile) {
    const fields = [
      'phone', 'address', 'city', 'state', 'country',
      'date_of_birth', 'emergency_contact_name', 'emergency_contact_phone'
    ];

    const completedFields = fields.filter(field => profile[field] && profile[field].trim() !== '');
    return Math.round((completedFields.length / fields.length) * 100);
  }

  // Calculate account age in days
  static calculateAccountAge(createdAt) {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    const now = new Date();
    return Math.floor((now - created) / (1000 * 60 * 60 * 24));
  }

  // Calculate days since last update
  static calculateDaysAgo(updatedAt) {
    if (!updatedAt) return null;
    const updated = new Date(updatedAt);
    const now = new Date();
    return Math.floor((now - updated) / (1000 * 60 * 60 * 24));
  }

  // Merge preferences safely
  static mergePreferences(currentPreferences, newPreferences) {
    const defaultPreferences = {
      notifications: {
        email: true,
        sms: true,
        push: true
      },
      parking: {
        preferred_payment_method: 'card',
        auto_extend_booking: false,
        reminder_minutes: 30
      },
      privacy: {
        show_profile: false,
        share_location: false
      }
    };

    // Deep merge function
    const deepMerge = (target, source) => {
      const result = { ...target };
      
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
      
      return result;
    };

    return deepMerge(deepMerge(defaultPreferences, currentPreferences || {}), newPreferences);
  }

  // Get users by location
  static async getUsersByLocation(city, state = null, limit = 50) {
    try {
      let query = supabase
        .from('user_profile_summary')
        .select('id, name, email, city, state, country, is_verified')
        .ilike('city', `%${city}%`)
        .limit(limit);

      if (state) {
        query = query.ilike('state', `%${state}%`);
      }

      const { data: users, error } = await query;

      if (error) {
        throw error;
      }

      return users;
    } catch (error) {
      console.error('Get users by location error:', error);
      throw error;
    }
  }

  // Get profile analytics
  static async getProfileAnalytics(timeframe = '30d') {
    try {
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const [
        totalProfiles,
        newProfiles,
        verifiedProfiles,
        completeProfiles,
        activeProfiles,
        topCities
      ] = await Promise.all([
        // Total profiles
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        
        // New profiles in timeframe
        supabase.from('user_profiles').select('id', { count: 'exact', head: true })
          .gte('created_at', startDate),
        
        // Verified profiles
        supabase.from('user_profiles').select('id', { count: 'exact', head: true })
          .eq('is_verified', true),
        
        // Complete profiles
        supabase.from('user_profile_summary').select('id', { count: 'exact', head: true })
          .eq('profile_complete', true),
        
        // Active profiles (updated in timeframe)
        supabase.from('user_profiles').select('id', { count: 'exact', head: true })
          .gte('updated_at', startDate),
        
        // Top cities
        supabase.from('user_profiles')
          .select('city')
          .not('city', 'is', null)
          .then(({ data }) => {
            if (!data) return [];
            const cityCounts = {};
            data.forEach(profile => {
              cityCounts[profile.city] = (cityCounts[profile.city] || 0) + 1;
            });
            return Object.entries(cityCounts)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 10)
              .map(([city, count]) => ({ city, count }));
          })
      ]);

      return {
        timeframe: timeframe,
        total_profiles: totalProfiles.count || 0,
        new_profiles: newProfiles.count || 0,
        verified_profiles: verifiedProfiles.count || 0,
        complete_profiles: completeProfiles.count || 0,
        active_profiles: activeProfiles.count || 0,
        verification_rate: totalProfiles.count > 0 ? 
          Math.round((verifiedProfiles.count / totalProfiles.count) * 100) : 0,
        completion_rate: totalProfiles.count > 0 ? 
          Math.round((completeProfiles.count / totalProfiles.count) * 100) : 0,
        top_cities: topCities
      };
    } catch (error) {
      console.error('Get profile analytics error:', error);
      throw error;
    }
  }

  // Bulk update profiles (admin only)
  static async bulkUpdateProfiles(userIds, updateData) {
    try {
      const { data: updatedProfiles, error } = await supabase
        .from('user_profiles')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .in('user_id', userIds)
        .select();

      if (error) {
        throw error;
      }

      return updatedProfiles;
    } catch (error) {
      console.error('Bulk update profiles error:', error);
      throw error;
    }
  }

  // Search profiles with advanced filters
  static async searchProfiles(filters = {}) {
    try {
      const {
        search,
        city,
        state,
        country,
        verified,
        age_min,
        age_max,
        has_phone,
        has_address,
        created_after,
        created_before,
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = filters;

      const offset = (page - 1) * limit;

      let query = supabase
        .from('user_profile_summary')
        .select('*', { count: 'exact' });

      // Apply filters
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      if (city) {
        query = query.ilike('city', `%${city}%`);
      }

      if (state) {
        query = query.ilike('state', `%${state}%`);
      }

      if (country) {
        query = query.ilike('country', `%${country}%`);
      }

      if (verified !== undefined) {
        query = query.eq('is_verified', verified);
      }

      if (age_min || age_max) {
        if (age_min) query = query.gte('age', age_min);
        if (age_max) query = query.lte('age', age_max);
      }

      if (has_phone !== undefined) {
        if (has_phone) {
          query = query.not('phone', 'is', null);
        } else {
          query = query.is('phone', null);
        }
      }

      if (has_address !== undefined) {
        if (has_address) {
          query = query.not('address', 'is', null);
        } else {
          query = query.is('address', null);
        }
      }

      if (created_after) {
        query = query.gte('user_created_at', created_after);
      }

      if (created_before) {
        query = query.lte('user_created_at', created_before);
      }

      // Apply sorting and pagination
      query = query
        .order(sort_by, { ascending: sort_order === 'asc' })
        .range(offset, offset + limit - 1);

      const { data: profiles, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        profiles: profiles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('Search profiles error:', error);
      throw error;
    }
  }

  // Export profiles data (admin only)
  static async exportProfiles(format = 'json', filters = {}) {
    try {
      const { profiles } = await this.searchProfiles({
        ...filters,
        limit: 10000, // Large limit for export
        page: 1
      });

      if (format === 'csv') {
        return this.convertToCSV(profiles);
      }

      return profiles;
    } catch (error) {
      console.error('Export profiles error:', error);
      throw error;
    }
  }

  // Convert profiles to CSV format
  static convertToCSV(profiles) {
    if (!profiles || profiles.length === 0) {
      return '';
    }

    const headers = [
      'id', 'name', 'email', 'phone', 'address', 'city', 'state', 'country',
      'date_of_birth', 'age', 'is_verified', 'verification_method',
      'profile_complete', 'user_created_at', 'profile_updated_at'
    ];

    const csvRows = [
      headers.join(','),
      ...profiles.map(profile => 
        headers.map(header => {
          const value = profile[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  }
}

module.exports = UserProfileService;
