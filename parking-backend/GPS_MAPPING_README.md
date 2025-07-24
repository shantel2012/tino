# GPS Mapping & Location Services - Parking Management System

## Overview
The GPS mapping system provides comprehensive location-based services for the parking management platform, enabling users to find nearby parking, get directions, and visualize parking availability on interactive maps.

## Features

### 🗺️ **Core Mapping Features**
- **Nearby Parking Search**: Find parking lots within a specified radius
- **Interactive Map Display**: Show all parking lots with real-time availability
- **Turn-by-Turn Directions**: Generate directions to parking lots
- **Location-Based Search**: Search parking by address or coordinates
- **Map Clustering**: Optimize map performance with intelligent clustering
- **Bounds Filtering**: Load only parking lots within map viewport

### 📍 **Location Services**
- **GPS Coordinate Validation**: Ensure valid latitude/longitude inputs
- **Distance Calculations**: Haversine formula for accurate distance measurement
- **Travel Time Estimation**: Calculate estimated driving time
- **Popular Routes Tracking**: Monitor frequently requested directions
- **Location History**: Track user search patterns (optional)

### 🎯 **Smart Features**
- **Availability Status**: Real-time parking space availability
- **Occupancy Indicators**: Visual indicators for lot fullness
- **Operating Hours**: Show open/closed status based on current time
- **Price Comparison**: Display pricing information on map
- **Multi-Platform Directions**: Support for Google Maps, Apple Maps, and Waze

## API Endpoints

### Public Endpoints (No Authentication Required)

#### Get All Parking Lots for Map
```http
GET /map/parking-lots
```
**Query Parameters:**
- `bounds` (optional): JSON string with map bounds `{"north": -17.7, "south": -17.9, "east": 31.1, "west": 30.9}`

**Response:**
```json
{
  "message": "Parking lots for map retrieved successfully",
  "map_markers": [
    {
      "id": "uuid",
      "name": "Harare CBD Parking",
      "location": "Corner First Street & Nelson Mandela Avenue",
      "coordinates": {
        "latitude": -17.8216,
        "longitude": 31.0492
      },
      "availability": {
        "total_spaces": 150,
        "available_spaces": 45,
        "occupancy_percentage": 70.00
      },
      "pricing": {
        "price_per_hour": 2.50
      },
      "owner": {
        "name": "Tendai Mukamuri",
        "company": "Mukamuri Properties"
      },
      "status": "available"
    }
  ],
  "total_locations": 12
}
```

#### Find Nearby Parking Lots
```http
GET /map/nearby?latitude=-17.8216&longitude=31.0492&radius=5
```
**Query Parameters:**
- `latitude` (required): User's latitude
- `longitude` (required): User's longitude  
- `radius` (optional): Search radius in kilometers (default: 5)

**Response:**
```json
{
  "message": "Nearby parking lots retrieved successfully",
  "user_location": {
    "latitude": -17.8216,
    "longitude": 31.0492
  },
  "search_radius_km": 5,
  "parking_lots": [
    {
      "id": "uuid",
      "name": "Harare CBD Parking",
      "location": "Corner First Street & Nelson Mandela Avenue",
      "latitude": -17.8216,
      "longitude": 31.0492,
      "total_spaces": 150,
      "available_spaces": 45,
      "price_per_hour": 2.50,
      "distance_km": 0.5,
      "is_active": true,
      "owner_name": "Tendai Mukamuri",
      "company_name": "Mukamuri Properties",
      "occupancy_percentage": 70.00
    }
  ],
  "total_found": 8
}
```

#### Search Parking by Location
```http
GET /map/search?query=Harare CBD
```
**Query Parameters:**
- `query` (optional): Text search for location/name
- `latitude` (optional): Search by coordinates
- `longitude` (optional): Search by coordinates
- `radius` (optional): Radius for coordinate search (default: 10km)

#### Get Parking Clusters
```http
GET /map/clusters?zoom_level=12&bounds={"north":-17.7,"south":-17.9,"east":31.1,"west":30.9}
```
**Query Parameters:**
- `zoom_level` (optional): Map zoom level for clustering optimization (default: 10)
- `bounds` (optional): Map bounds for filtering

### Protected Endpoints (Authentication Required)

#### Get Directions to Parking Lot
```http
GET /map/directions/:parking_lot_id?from_latitude=-17.8216&from_longitude=31.0492
```
**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "message": "Directions generated successfully",
  "parking_lot": {
    "id": "uuid",
    "name": "Harare CBD Parking",
    "location": "Corner First Street & Nelson Mandela Avenue",
    "coordinates": {
      "latitude": -17.8216,
      "longitude": 31.0492
    },
    "available_spaces": 45
  },
  "from_location": {
    "latitude": -17.8216,
    "longitude": 31.0492
  },
  "distance_km": 2.3,
  "estimated_travel_time_minutes": 5,
  "directions_urls": {
    "google_maps": "https://www.google.com/maps/dir/-17.8216,31.0492/-17.8216,31.0492",
    "apple_maps": "http://maps.apple.com/?saddr=-17.8216,31.0492&daddr=-17.8216,31.0492",
    "waze": "https://waze.com/ul?ll=-17.8216,31.0492&navigate=yes&from=-17.8216,31.0492"
  }
}
```

## Database Functions

### Core Location Functions

#### `calculate_distance(lat1, lng1, lat2, lng2)`
Calculates distance between two GPS coordinates using the Haversine formula.
- **Parameters**: Four DECIMAL coordinates
- **Returns**: Distance in kilometers (DECIMAL)

#### `get_nearby_parking_lots(user_lat, user_lng, radius_km)`
Finds parking lots within specified radius of user location.
- **Parameters**: User coordinates and search radius
- **Returns**: Table with parking lot details and distances

#### `get_closest_parking_lot(user_lat, user_lng, max_radius_km)`
Finds the closest available parking lot to user location.
- **Parameters**: User coordinates and maximum search radius
- **Returns**: Single closest parking lot with availability

#### `get_parking_stats_by_area(center_lat, center_lng, radius_km)`
Gets parking statistics for a specific geographic area.
- **Parameters**: Center coordinates and radius
- **Returns**: Aggregated statistics (total lots, occupancy, pricing)

## Database Tables

### `user_location_history`
Tracks user location searches for analytics and personalization.
```sql
CREATE TABLE user_location_history (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    accuracy_meters INTEGER,
    search_query TEXT,
    search_radius_km DECIMAL,
    results_found INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `popular_routes`
Tracks popular routes and destinations for optimization.
```sql
CREATE TABLE popular_routes (
    id UUID PRIMARY KEY,
    from_latitude DECIMAL(10,8) NOT NULL,
    from_longitude DECIMAL(11,8) NOT NULL,
    to_parking_lot_id UUID REFERENCES parking_lots(id),
    route_requests_count INTEGER DEFAULT 1,
    last_requested_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Database Views

### `parking_lot_map_markers`
Optimized view for map display with all necessary information:
- Parking lot details and coordinates
- Real-time availability and occupancy
- Owner information
- Current operating status (open/closed)
- Availability status indicators

## Zimbabwe Locations

The system includes authentic Zimbabwean parking locations:

### **Harare Locations**
- **Harare CBD**: Corner First Street & Nelson Mandela Avenue
- **Eastgate Shopping Centre**: Eastgate Complex, Borrowdale
- **Borrowdale Residential**: Borrowdale Shopping Centre
- **Airport**: Robert Gabriel Mugabe International Airport
- **Parirenyatwa Hospital**: Medical Campus, Avondale

### **Other Cities**
- **Bulawayo**: City Centre, Fife Street & 9th Avenue
- **Victoria Falls**: Tourism Hub, Park Way
- **Mutare**: Central Business District, Main Street
- **University of Zimbabwe**: Mount Pleasant Campus

## Frontend Integration Examples

### JavaScript/React Integration
```javascript
// Get nearby parking lots
const getNearbyParking = async (latitude, longitude, radius = 5) => {
  try {
    const response = await fetch(
      `/map/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`
    );
    const data = await response.json();
    return data.parking_lots;
  } catch (error) {
    console.error('Error fetching nearby parking:', error);
    return [];
  }
};

// Get directions to parking lot
const getDirections = async (parkingLotId, fromLat, fromLng, token) => {
  try {
    const response = await fetch(
      `/map/directions/${parkingLotId}?from_latitude=${fromLat}&from_longitude=${fromLng}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    const data = await response.json();
    return data.directions_urls;
  } catch (error) {
    console.error('Error getting directions:', error);
    return null;
  }
};

// Load parking lots for map
const loadMapMarkers = async (bounds = null) => {
  try {
    const url = bounds 
      ? `/map/parking-lots?bounds=${encodeURIComponent(JSON.stringify(bounds))}`
      : '/map/parking-lots';
    
    const response = await fetch(url);
    const data = await response.json();
    return data.map_markers;
  } catch (error) {
    console.error('Error loading map markers:', error);
    return [];
  }
};
```

### Map Integration (Google Maps Example)
```javascript
// Initialize Google Map with parking lots
const initializeMap = async () => {
  const map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: { lat: -17.8216, lng: 31.0492 } // Harare center
  });

  // Load parking lot markers
  const markers = await loadMapMarkers();
  
  markers.forEach(parking => {
    const marker = new google.maps.Marker({
      position: {
        lat: parking.coordinates.latitude,
        lng: parking.coordinates.longitude
      },
      map: map,
      title: parking.name,
      icon: getMarkerIcon(parking.status) // Custom icons based on availability
    });

    // Add info window with parking details
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div>
          <h3>${parking.name}</h3>
          <p>${parking.location}</p>
          <p>Available: ${parking.availability.available_spaces}/${parking.availability.total_spaces}</p>
          <p>Price: $${parking.pricing.price_per_hour}/hour</p>
          <button onclick="getDirections('${parking.id}')">Get Directions</button>
        </div>
      `
    });

    marker.addListener('click', () => {
      infoWindow.open(map, marker);
    });
  });
};

// Custom marker icons based on availability
const getMarkerIcon = (status) => {
  const icons = {
    'available': '/icons/green-marker.png',
    'nearly_full': '/icons/yellow-marker.png',
    'full': '/icons/red-marker.png'
  };
  return icons[status] || icons['available'];
};
```

## Security & Performance

### Security Features
- **Input Validation**: All coordinates validated for proper ranges
- **Rate Limiting**: Prevent abuse of location services
- **Authentication**: Protected routes require valid JWT tokens
- **Row Level Security**: User location history protected by RLS policies

### Performance Optimizations
- **Spatial Indexing**: Optimized database indexes for coordinate queries
- **Map Clustering**: Reduce marker count at low zoom levels
- **Bounds Filtering**: Load only visible parking lots
- **Caching**: Cache frequently requested location data
- **Distance Calculations**: Efficient Haversine formula implementation

## Error Handling

### Common Error Responses
```json
{
  "error": "Latitude and longitude are required"
}

{
  "error": "Invalid coordinates"
}

{
  "error": "Parking lot not found"
}

{
  "error": "Parking lot coordinates not available"
}
```

## Testing

### Test Coordinates (Zimbabwe)
- **Harare CBD**: `-17.8216, 31.0492`
- **Bulawayo Centre**: `-20.1594, 28.5906`
- **Victoria Falls**: `-17.9243, 25.8572`
- **Mutare**: `-18.9707, 32.6473`

### Sample API Tests
```bash
# Test nearby parking search
curl "http://localhost:3000/map/nearby?latitude=-17.8216&longitude=31.0492&radius=10"

# Test parking lot search
curl "http://localhost:3000/map/search?query=Harare"

# Test map markers
curl "http://localhost:3000/map/parking-lots"

# Test directions (requires authentication)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3000/map/directions/PARKING_LOT_ID?from_latitude=-17.8216&from_longitude=31.0492"
```

## Deployment Notes

1. **Database Migration**: Run `add_gps_mapping_functions.sql` in Supabase SQL Editor
2. **Environment Variables**: No additional environment variables required
3. **External Services**: Optional integration with Google Maps, Apple Maps, Waze
4. **Mobile Support**: All endpoints support mobile app integration
5. **Offline Support**: Consider caching strategies for offline map functionality

## Future Enhancements

- **Real-time Traffic**: Integration with traffic APIs for better time estimates
- **Route Optimization**: Multi-stop route planning
- **Geofencing**: Automatic check-in when arriving at parking lots
- **AR Navigation**: Augmented reality directions to parking spaces
- **Predictive Analytics**: Predict parking availability based on historical data
- **Voice Navigation**: Voice-guided directions to parking lots

---

🗺️ **Your parking management system now has comprehensive GPS mapping and location services for Zimbabwe!** 🇿🇼
