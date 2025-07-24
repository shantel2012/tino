const { supabase } = require('../supabase');

// Get nearby parking lots based on GPS coordinates
exports.getNearbyParkingLots = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query; // radius in kilometers

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusKm = parseFloat(radius);

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // Calculate nearby parking lots using Haversine formula
    const { data: parkingLots, error } = await supabase
      .rpc('get_nearby_parking_lots', {
        user_lat: lat,
        user_lng: lng,
        radius_km: radiusKm
      });

    if (error) {
      console.error('Get nearby parking lots error:', error);
      return res.status(500).json({ error: 'Failed to fetch nearby parking lots' });
    }

    res.json({
      message: 'Nearby parking lots retrieved successfully',
      user_location: {
        latitude: lat,
        longitude: lng
      },
      search_radius_km: radiusKm,
      parking_lots: parkingLots || [],
      total_found: parkingLots ? parkingLots.length : 0
    });
  } catch (err) {
    console.error('Get nearby parking lots error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all parking lots with GPS coordinates for map display
exports.getAllParkingLotsForMap = async (req, res) => {
  try {
    const { bounds } = req.query; // Optional: map bounds to filter results

    let query = supabase
      .from('parking_lots_with_owners')
      .select(`
        id,
        parking_lot_name,
        location,
        latitude,
        longitude,
        total_spaces,
        available_spaces,
        price_per_hour,
        lot_active,
        owner_name,
        company_name,
        occupancy_percentage
      `)
      .eq('lot_active', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    // Apply map bounds filtering if provided
    if (bounds) {
      try {
        const { north, south, east, west } = JSON.parse(bounds);
        query = query
          .gte('latitude', south)
          .lte('latitude', north)
          .gte('longitude', west)
          .lte('longitude', east);
      } catch (boundsError) {
        console.error('Invalid bounds format:', boundsError);
      }
    }

    const { data: parkingLots, error } = await query.order('parking_lot_name');

    if (error) {
      console.error('Get parking lots for map error:', error);
      return res.status(500).json({ error: 'Failed to fetch parking lots for map' });
    }

    // Add map markers data
    const mapMarkers = parkingLots.map(lot => ({
      id: lot.id,
      name: lot.parking_lot_name,
      location: lot.location,
      coordinates: {
        latitude: lot.latitude,
        longitude: lot.longitude
      },
      availability: {
        total_spaces: lot.total_spaces,
        available_spaces: lot.available_spaces,
        occupancy_percentage: lot.occupancy_percentage
      },
      pricing: {
        price_per_hour: lot.price_per_hour
      },
      owner: {
        name: lot.owner_name,
        company: lot.company_name
      },
      status: lot.available_spaces > 0 ? 'available' : 'full'
    }));

    res.json({
      message: 'Parking lots for map retrieved successfully',
      map_markers: mapMarkers,
      total_locations: mapMarkers.length
    });
  } catch (err) {
    console.error('Get parking lots for map error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get directions to a parking lot
exports.getDirections = async (req, res) => {
  try {
    const { parking_lot_id } = req.params;
    const { from_latitude, from_longitude } = req.query;

    if (!from_latitude || !from_longitude) {
      return res.status(400).json({ error: 'Starting coordinates (from_latitude, from_longitude) are required' });
    }

    const fromLat = parseFloat(from_latitude);
    const fromLng = parseFloat(from_longitude);

    // Validate coordinates
    if (isNaN(fromLat) || isNaN(fromLng) || fromLat < -90 || fromLat > 90 || fromLng < -180 || fromLng > 180) {
      return res.status(400).json({ error: 'Invalid starting coordinates' });
    }

    // Get parking lot details
    const { data: parkingLot, error } = await supabase
      .from('parking_lots')
      .select('id, name, location, latitude, longitude, available_spaces')
      .eq('id', parking_lot_id)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Get parking lot for directions error:', error);
      return res.status(500).json({ error: 'Failed to fetch parking lot details' });
    }

    if (!parkingLot) {
      return res.status(404).json({ error: 'Parking lot not found' });
    }

    if (!parkingLot.latitude || !parkingLot.longitude) {
      return res.status(400).json({ error: 'Parking lot coordinates not available' });
    }

    // Calculate distance and estimated travel time
    const distance = calculateDistance(fromLat, fromLng, parkingLot.latitude, parkingLot.longitude);
    const estimatedTravelTime = calculateTravelTime(distance);

    // Generate directions URLs for different map services
    const directionsUrls = {
      google_maps: `https://www.google.com/maps/dir/${fromLat},${fromLng}/${parkingLot.latitude},${parkingLot.longitude}`,
      apple_maps: `http://maps.apple.com/?saddr=${fromLat},${fromLng}&daddr=${parkingLot.latitude},${parkingLot.longitude}`,
      waze: `https://waze.com/ul?ll=${parkingLot.latitude},${parkingLot.longitude}&navigate=yes&from=${fromLat},${fromLng}`
    };

    res.json({
      message: 'Directions generated successfully',
      parking_lot: {
        id: parkingLot.id,
        name: parkingLot.name,
        location: parkingLot.location,
        coordinates: {
          latitude: parkingLot.latitude,
          longitude: parkingLot.longitude
        },
        available_spaces: parkingLot.available_spaces
      },
      from_location: {
        latitude: fromLat,
        longitude: fromLng
      },
      distance_km: distance,
      estimated_travel_time_minutes: estimatedTravelTime,
      directions_urls: directionsUrls
    });
  } catch (err) {
    console.error('Get directions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Search parking lots by location/address
exports.searchParkingByLocation = async (req, res) => {
  try {
    const { query: searchQuery, latitude, longitude, radius = 10 } = req.query;

    if (!searchQuery && (!latitude || !longitude)) {
      return res.status(400).json({ 
        error: 'Either search query or coordinates (latitude, longitude) are required' 
      });
    }

    let parkingLots = [];

    if (latitude && longitude) {
      // Search by coordinates
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radiusKm = parseFloat(radius);

      const { data, error } = await supabase
        .rpc('get_nearby_parking_lots', {
          user_lat: lat,
          user_lng: lng,
          radius_km: radiusKm
        });

      if (error) {
        console.error('Search by coordinates error:', error);
        return res.status(500).json({ error: 'Failed to search by coordinates' });
      }

      parkingLots = data || [];
    } else {
      // Search by text query
      const { data, error } = await supabase
        .from('parking_lots_with_owners')
        .select(`
          id,
          parking_lot_name,
          location,
          latitude,
          longitude,
          total_spaces,
          available_spaces,
          price_per_hour,
          owner_name,
          company_name,
          occupancy_percentage
        `)
        .eq('lot_active', true)
        .or(`parking_lot_name.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`)
        .order('parking_lot_name');

      if (error) {
        console.error('Search by query error:', error);
        return res.status(500).json({ error: 'Failed to search parking lots' });
      }

      parkingLots = data || [];
    }

    res.json({
      message: 'Parking lot search completed',
      search_criteria: {
        query: searchQuery,
        coordinates: latitude && longitude ? { latitude, longitude } : null,
        radius_km: radius
      },
      parking_lots: parkingLots,
      total_found: parkingLots.length
    });
  } catch (err) {
    console.error('Search parking by location error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get parking lot clusters for map optimization
exports.getParkingClusters = async (req, res) => {
  try {
    const { zoom_level = 10, bounds } = req.query;
    const zoom = parseInt(zoom_level);

    // Different clustering strategies based on zoom level
    let clusterSize = 0.01; // Default cluster size in degrees
    if (zoom < 8) clusterSize = 0.1;
    else if (zoom < 12) clusterSize = 0.05;
    else if (zoom < 15) clusterSize = 0.01;
    else clusterSize = 0.005;

    let query = supabase
      .from('parking_lots')
      .select('id, name, latitude, longitude, available_spaces, total_spaces')
      .eq('is_active', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    // Apply bounds if provided
    if (bounds) {
      try {
        const { north, south, east, west } = JSON.parse(bounds);
        query = query
          .gte('latitude', south)
          .lte('latitude', north)
          .gte('longitude', west)
          .lte('longitude', east);
      } catch (boundsError) {
        console.error('Invalid bounds format:', boundsError);
      }
    }

    const { data: parkingLots, error } = await query;

    if (error) {
      console.error('Get parking clusters error:', error);
      return res.status(500).json({ error: 'Failed to fetch parking clusters' });
    }

    // Simple clustering algorithm
    const clusters = [];
    const processed = new Set();

    parkingLots.forEach((lot, index) => {
      if (processed.has(index)) return;

      const cluster = {
        center: {
          latitude: lot.latitude,
          longitude: lot.longitude
        },
        parking_lots: [lot],
        total_spaces: lot.total_spaces,
        available_spaces: lot.available_spaces
      };

      // Find nearby lots to cluster
      parkingLots.forEach((otherLot, otherIndex) => {
        if (index === otherIndex || processed.has(otherIndex)) return;

        const distance = calculateDistance(
          lot.latitude, lot.longitude,
          otherLot.latitude, otherLot.longitude
        );

        if (distance <= clusterSize * 111) { // Convert degrees to km approximately
          cluster.parking_lots.push(otherLot);
          cluster.total_spaces += otherLot.total_spaces;
          cluster.available_spaces += otherLot.available_spaces;
          processed.add(otherIndex);
        }
      });

      // Update cluster center to centroid
      if (cluster.parking_lots.length > 1) {
        const avgLat = cluster.parking_lots.reduce((sum, lot) => sum + lot.latitude, 0) / cluster.parking_lots.length;
        const avgLng = cluster.parking_lots.reduce((sum, lot) => sum + lot.longitude, 0) / cluster.parking_lots.length;
        cluster.center = { latitude: avgLat, longitude: avgLng };
      }

      clusters.push(cluster);
      processed.add(index);
    });

    res.json({
      message: 'Parking clusters generated successfully',
      zoom_level: zoom,
      cluster_size: clusterSize,
      clusters: clusters,
      total_clusters: clusters.length
    });
  } catch (err) {
    console.error('Get parking clusters error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper function to convert degrees to radians
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Helper function to estimate travel time
function calculateTravelTime(distanceKm) {
  // Assume average city driving speed of 30 km/h
  const avgSpeedKmh = 30;
  return Math.round((distanceKm / avgSpeedKmh) * 60); // Convert to minutes
}
