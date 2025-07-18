import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Star, Shield, Car, Clock, Wifi, Camera, Zap, ArrowLeft, Heart, Share2, Calendar } from 'lucide-react';

const ParkingDetails: React.FC = () => {
  const { id } = useParams();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);

  // Mock data - in real app, this would come from an API
  const parkingSpace = {
    id: 1,
    title: 'Downtown Parking Garage',
    location: 'Downtown Seattle, WA',
    price: 5,
    rating: 4.8,
    reviews: 127,
    description: 'Secure parking garage located in the heart of downtown Seattle. Perfect for business meetings, shopping, or events. Easy access to major attractions and public transportation.',
    images: [
      'https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/753876/pexels-photo-753876.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1546168/pexels-photo-1546168.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    features: [
      { icon: Shield, name: 'Security Camera', description: '24/7 surveillance' },
      { icon: Car, name: 'Covered Parking', description: 'Protected from weather' },
      { icon: Clock, name: '24/7 Access', description: 'Available anytime' },
      // { icon: Zap, name: 'EV Charging', description: 'Electric vehicle charging' },
      { icon: Wifi, name: 'Free WiFi', description: 'Complimentary internet' },
      // { icon: Camera, name: 'Well Lit', description: 'Excellent lighting' }
    ],
    owner: {
      name: 'Rude Chingwa',
      rating: 4.9,
      reviews: 234,
      memberSince: '2022',
      avatar: 'https://images.pexels.com/photos/494790/pexels-photo-494790.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    rules: [
      'No smoking in the garage',
      'Maximum height: 7 feet',
      'No overnight parking on weekends',
      'Keep vehicle locked at all times',
      'Report any issues immediately'
    ],
    availability: {
      today: 'Available now',
      tomorrow: 'Available from 8 AM',
      weekend: 'Limited availability'
    }
  };

  const reviews = [
    {
      id: 1,
      user: 'Tapiwa Gondo',
      rating: 5,
      date: '2024-01-10',
      comment: 'Great location and very secure. Easy to access and well-maintained.',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    {
      id: 2,
      user: 'Gamu Murwira',
      rating: 4,
      date: '2024-01-08',
      comment: 'Good parking space, though can be a bit tight for larger vehicles.',
      avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    {
      id: 3,
      user: 'Munashe Muchacha',
      rating: 5,
      date: '2024-01-05',
      comment: 'Perfect for downtown meetings. Owner is very responsive and helpful.',
      avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link 
          to="/dashboard/user" 
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          <span>Back to Search</span>
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Images and Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="aspect-video">
                <img 
                  src={parkingSpace.images[selectedImageIndex]} 
                  alt={parkingSpace.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <div className="flex space-x-2 overflow-x-auto">
                  {parkingSpace.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 ${
                        selectedImageIndex === index ? 'border-blue-500' : 'border-gray-200'
                      }`}
                    >
                      <img src={image} alt={`View ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Title and Basic Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{parkingSpace.title}</h1>
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin className="h-5 w-5 mr-1" />
                    <span>{parkingSpace.location}</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <span className="ml-1 font-medium">{parkingSpace.rating}</span>
                    <span className="ml-1 text-gray-500">({parkingSpace.reviews} reviews)</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setIsFavorited(!isFavorited)}
                    className={`p-2 rounded-full border ${
                      isFavorited ? 'bg-red-50 border-red-200 text-red-500' : 'bg-gray-50 border-gray-200 text-gray-500'
                    } hover:bg-red-50 hover:text-red-500 transition-colors`}
                  >
                    <Heart className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
                  </button>
                  <button className="p-2 rounded-full border bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors">
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <p className="text-gray-600">{parkingSpace.description}</p>
            </div>

            {/* Features */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Features & Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {parkingSpace.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <feature.icon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{feature.name}</p>
                      <p className="text-xs text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rules */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Parking Rules</h2>
              <ul className="space-y-2">
                {parkingSpace.rules.map((rule, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-blue-600 font-medium">•</span>
                    <span className="text-gray-600">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Reviews</h2>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <img 
                        src={review.avatar} 
                        alt={review.user}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium">{review.user}</p>
                        <div className="flex items-center space-x-2">
                          <div className="flex">
                            {[...Array(review.rating)].map((_, i) => (
                              <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">{review.date}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-600 ml-13">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  ${parkingSpace.price}<span className="text-lg text-gray-600">/day</span>
                </div>
                <div className="text-sm text-green-600 font-medium">{parkingSpace.availability.today}</div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>Full Day</option>
                    <option>Half Day (4 hours)</option>
                    <option>Hourly</option>
                  </select>
                </div>
              </div>

              <Link 
                to={`/booking/${parkingSpace.id}`}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium text-center block"
              >
                Book Now
              </Link>

              <div className="mt-4 text-center text-sm text-gray-500">
                You won't be charged yet
              </div>

              {/* Owner Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-semibold mb-3">Hosted by {parkingSpace.owner.name}</h3>
                <div className="flex items-center space-x-3">
                  <img 
                    src={parkingSpace.owner.avatar} 
                    alt={parkingSpace.owner.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="font-medium">{parkingSpace.owner.rating}</span>
                      <span className="text-gray-500">({parkingSpace.owner.reviews} reviews)</span>
                    </div>
                    <p className="text-sm text-gray-600">Member since {parkingSpace.owner.memberSince}</p>
                  </div>
                </div>
                <button className="mt-3 w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors">
                  Contact Host
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParkingDetails;