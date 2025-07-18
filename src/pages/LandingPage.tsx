import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Shield, Clock, Star, ArrowRight } from 'lucide-react';

interface ParkingSpace {
  id: number;
  title: string;
  location: string;
  price: string;
  rating?: number;
  image: string;
  features: string[];
}

const LandingPage: React.FC = () => {
  const [searchLocation, setSearchLocation] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [featuredSpaces, setFeaturedSpaces] = useState<ParkingSpace[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:5000/parking-lots')
      .then((res) => res.json())
      .then((data) => setFeaturedSpaces(data))
      .catch((error) => {
        console.error('Error fetching parking lots:', error);
      });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(
      `/search?location=${encodeURIComponent(
        searchLocation
      )}&date=${encodeURIComponent(searchDate)}`
    );
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Find Parking <span className="text-blue-200">Anywhere</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Rent parking spaces by the hour, day, or month from local hosts
            </p>

            {/* Search Form */}
            <form
              onSubmit={handleSearch}
              className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 flex flex-col md:flex-row gap-4"
            >
              <div className="flex-1">
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Where do you need parking?"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    required
                  />
                </div>
              </div>
              <div className="flex-1">
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Search className="h-5 w-5" />
                <span>Search</span>
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose ParkSpace?
            </h2>
            <p className="text-xl text-gray-600">
              The smartest way to find and rent parking spaces
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Search className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy to Find</h3>
              <p className="text-gray-600">
                Search thousands of parking spaces in your area with real-time
                availability
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Safe & Secure</h3>
              <p className="text-gray-600">
                All spaces are verified and insured for your peace of mind
              </p>
            </div>

            <div className="text-center">
              <div className="bg-orange-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Flexible Booking</h3>
              <p className="text-gray-600">
                Book for hours, days, or months - cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Spaces */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Featured Parking Spaces
            </h2>
            <p className="text-xl text-gray-600">Popular spaces in your area</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {featuredSpaces.length === 0 && <p>Loading parking spaces...</p>}

            {featuredSpaces.map((space) => (
              <div
                key={space.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <img
                  src={space.image}
                  alt={space.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold">{space.title}</h3>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">
                        {space.rating ?? 'N/A'}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-3">{space.location}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {space.features?.map((feature) => (
                      <span
                        key={feature}
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-blue-600">
                      {space.price}
                    </span>
                    <Link
                      to={`/parking/${space.id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-1"
                    >
                      <span>View Details</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Got a Parking Space?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Earn money by renting out your unused parking space
          </p>
          <Link
            to="/signup"
            className="bg-white text-blue-600 px-8 py-3 rounded-md hover:bg-gray-100 transition-colors font-semibold inline-flex items-center space-x-2"
          >
            <span>List Your Space</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
