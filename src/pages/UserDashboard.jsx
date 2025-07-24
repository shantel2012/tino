import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  Star,
  Heart,
  Car,
} from "lucide-react";

/* ---------- Data (mock) ---------- */
const PARKING_SPACES = [
  {
    id: 1,
    title: "Downtown Parking Garage",
    location: "Downtown Seattle, WA",
    price: 15,
    rating: 4.8,
    reviews: 127,
    image:
      "https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg?auto=compress&cs=tinysrgb&w=400",
    features: ["Covered", "Security Camera", "24/7 Access", "EV Charging"],
    distance: "0.2 miles",
    availability: "Available now",
  },
  {
    id: 2,
    title: "Airport Long-term Parking",
    location: "Near SEA Airport",
    price: 12,
    rating: 4.6,
    reviews: 89,
    image:
      "https://images.pexels.com/photos/753876/pexels-photo-753876.jpeg?auto=compress&cs=tinysrgb&w=400",
    features: ["Shuttle Service", "Covered", "Long-term Rates"],
    distance: "1.5 miles",
    availability: "Available from 2 PM",
  },
  {
    id: 3,
    title: "Residential Driveway",
    location: "Capitol Hill",
    price: 8,
    rating: 4.9,
    reviews: 45,
    image:
      "https://images.pexels.com/photos/1546168/pexels-photo-1546168.jpeg?auto=compress&cs=tinysrgb&w=400",
    features: ["Private", "Safe Neighborhood", "Easy Access"],
    distance: "0.8 miles",
    availability: "Available now",
  },
];

const MY_BOOKINGS = [
  {
    id: 1,
    space: "Downtown Parking Garage",
    date: "2024-01-15",
    time: "9:00 AM - 6:00 PM",
    status: "active",
    price: 15,
    spaceId: 1,
  },
  {
    id: 2,
    space: "Airport Long-term Parking",
    date: "2024-01-10",
    time: "6:00 AM - 10:00 PM",
    status: "completed",
    price: 12,
    spaceId: 2,
  },
];

/* ---------- Main Component ---------- */
const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState("search");

  // Search filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("");

  // Favorites (store IDs)
  const [favorites, setFavorites] = useState([1, 3]);

  /* ----- Helpers ----- */
  const toggleFavorite = (id) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    );
  };

  const isFavorited = (id) => favorites.includes(id);

  const filteredSpaces = useMemo(() => {
    let spaces = [...PARKING_SPACES];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      spaces = spaces.filter(
        (s) =>
          s.title.toLowerCase().includes(q) || s.location.toLowerCase().includes(q)
      );
    }

    if (priceFilter) {
      spaces = spaces.filter((s) => {
        if (priceFilter === "0-10") return s.price >= 0 && s.price <= 10;
        if (priceFilter === "10-20") return s.price > 10 && s.price <= 20;
        if (priceFilter === "20+") return s.price > 20;
        return true;
      });
    }

    // Date filter placeholder: no-op for now
    return spaces;
  }, [searchQuery, priceFilter]);

  /* ----- Render ----- */
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Find Parking</h1>
          <p className="text-gray-600 mt-2">Discover available parking spaces in your area</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <TabButton
              label="Search Parking"
              active={activeTab === "search"}
              onClick={() => setActiveTab("search")}
            />
            <TabButton
              label="My Bookings"
              active={activeTab === "bookings"}
              onClick={() => setActiveTab("bookings")}
            />
            <TabButton
              label="Favorites"
              active={activeTab === "favorites"}
              onClick={() => setActiveTab("favorites")}
            />
          </nav>
        </div>

        {/* Content */}
        {activeTab === "search" && (
          <SearchTab
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            priceFilter={priceFilter}
            setPriceFilter={setPriceFilter}
            spaces={filteredSpaces}
            toggleFavorite={toggleFavorite}
            isFavorited={isFavorited}
          />
        )}

        {activeTab === "bookings" && <BookingsTab bookings={MY_BOOKINGS} />}

        {activeTab === "favorites" && (
          <FavoritesTab
            favorites={favorites}
            spaces={PARKING_SPACES}
            toggleFavorite={toggleFavorite}
          />
        )}
      </div>
    </div>
  );
};

/* ---------- Subcomponents ---------- */

const TabButton = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`py-2 px-1 border-b-2 font-medium text-sm ${
      active
        ? "border-blue-500 text-blue-600"
        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
    }`}
  >
    {label}
  </button>
);

const SearchTab = ({
  searchQuery,
  setSearchQuery,
  dateFilter,
  setDateFilter,
  priceFilter,
  setPriceFilter,
  spaces,
  toggleFavorite,
  isFavorited,
}) => {
  const handleSearch = (e) => {
    e.preventDefault();
    // Filtering happens reactively; no extra work needed here.
  };

  return (
    <div>
      {/* Search & Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Prices</option>
              <option value="0-10">$0 - $10</option>
              <option value="10-20">$10 - $20</option>
              <option value="20+">$20+</option>
            </select>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Search className="h-5 w-5" />
              <span>Search</span>
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      <div className="grid gap-6">
        {spaces.map((space) => (
          <ParkingSpaceCard
            key={space.id}
            space={space}
            isFavorited={isFavorited(space.id)}
            onToggleFavorite={() => toggleFavorite(space.id)}
          />
        ))}
        {spaces.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            No spaces match your search.
          </div>
        )}
      </div>
    </div>
  );
};

const ParkingSpaceCard = ({ space, isFavorited, onToggleFavorite }) => (
  <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
    <div className="flex flex-col md:flex-row">
      <div className="md:w-1/3">
        <img
          src={space.image}
          alt={space.title}
          className="w-full h-48 md:h-full object-cover"
        />
      </div>
      <div className="md:w-2/3 p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{space.title}</h3>
            <div className="flex items-center text-gray-600 mt-1">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{space.location}</span>
              <span className="mx-2">•</span>
              <span>{space.distance}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
            className={`transition-colors ${
              isFavorited ? "text-red-500" : "text-gray-400 hover:text-red-500"
            }`}
          >
            <Heart className={`h-6 w-6 ${isFavorited ? "fill-current" : ""}`} />
          </button>
        </div>

        <div className="flex items-center mb-3">
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="ml-1 text-sm font-medium">{space.rating}</span>
            <span className="ml-1 text-sm text-gray-500">
              ({space.reviews} reviews)
            </span>
          </div>
          <span className="mx-3 text-gray-300">•</span>
          <span className="text-sm text-green-600 font-medium">
            {space.availability}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {space.features.map((feature) => (
            <span
              key={feature}
              className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"
            >
              {feature}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-blue-600">
            ${space.price}/day
          </div>
          <div className="flex space-x-3">
            <Link
              to={`/parking/${space.id}`}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
            >
              View Details
            </Link>
            <Link
              to={`/booking/${space.id}`}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Book Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const BookingsTab = ({ bookings }) => (
  <div className="bg-white rounded-lg shadow-sm">
    <div className="p-6 border-b border-gray-200">
      <h2 className="text-lg font-semibold">My Bookings</h2>
    </div>
    <div className="divide-y divide-gray-200">
      {bookings.map((booking) => (
        <div key={booking.id} className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Car className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="font-medium">{booking.space}</h3>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{booking.date}</span>
                <span className="mx-2">•</span>
                <Clock className="h-4 w-4 mr-1" />
                <span>{booking.time}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-lg font-semibold">${booking.price}</span>
            <span
              className={`px-2 py-1 rounded text-sm ${
                booking.status === "active"
                  ? "bg-green-100 text-green-800"
                  : booking.status === "completed"
                  ? "bg-gray-100 text-gray-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {booking.status}
            </span>
          </div>
        </div>
      ))}
      {bookings.length === 0 && (
        <div className="p-6 text-center text-gray-500">No bookings yet.</div>
      )}
    </div>
  </div>
);

const FavoritesTab = ({ favorites, spaces, toggleFavorite }) => {
  const favSpaces = spaces.filter((s) => favorites.includes(s.id));

  return (
    <div>
      {favSpaces.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          No favorites yet. Add some from Search.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favSpaces.map((space) => (
            <div key={space.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold">{space.title}</h3>
                <button
                  className="text-red-500 hover:text-red-600 transition-colors"
                  onClick={() => toggleFavorite(space.id)}
                  aria-label="Remove from favorites"
                >
                  <Heart className="h-5 w-5 fill-current" />
                </button>
              </div>
              <div className="flex items-center text-gray-600 mb-3">
                <MapPin className="h-4 w-4 mr-1" />
                <span className="text-sm">{space.location}</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="ml-1 text-sm font-medium">{space.rating}</span>
                  <span className="ml-1 text-sm text-gray-500">
                    ({space.reviews})
                  </span>
                </div>
                <span className="text-lg font-bold text-blue-600">
                  ${space.price}/day
                </span>
              </div>
              <div className="flex space-x-3">
                <Link
                  to={`/parking/${space.id}`}
                  className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors text-sm"
                >
                  Details
                </Link>
                <Link
                  to={`/booking/${space.id}`}
                  className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Book
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
