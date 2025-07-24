import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../supabaseClient';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  CreditCard,
  Shield,
  Star
} from 'lucide-react';

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function ParkingDetails() {
  const { id } = useParams();

  // State
  const [parking, setParking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking modal state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingStartTime, setBookingStartTime] = useState('');
  const [bookingEndTime, setBookingEndTime] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');

  // Nearby parkings
  const [nearbyParkings, setNearbyParkings] = useState([]);

  // Ratings & Reviews
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Fetch parking details on mount
  useEffect(() => {
    async function fetchParking() {
      setLoading(true);
      const { data, error } = await supabase
        .from('parking_lots')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        setError('Failed to load parking details.');
      } else {
        setParking(data);
        fetchNearbyParkings(data.latitude, data.longitude, data.id);
        fetchReviews(data.id);
      }
      setLoading(false);
    }

    fetchParking();
  }, [id]);

  // Fetch nearby parkings within 5km radius (approx)
  async function fetchNearbyParkings(lat, lng, currentId) {
    // Very rough radius in degrees (~5km)
    const radius = 0.045;

    const { data, error } = await supabase
      .from('parking_lots')
      .select('*')
      .neq('id', currentId)
      .gte('latitude', lat - radius)
      .lte('latitude', lat + radius)
      .gte('longitude', lng - radius)
      .lte('longitude', lng + radius)
      .limit(3);

    if (!error) setNearbyParkings(data);
  }

  // Fetch reviews for this parking lot
  async function fetchReviews(parkingId) {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, user:users(username)')
      .eq('parking_lot_id', parkingId)
      .order('created_at', { ascending: false });

    if (!error) setReviews(data);
  }

  // Submit a new review
  async function submitReview() {
    if (!newReview) return alert('Please enter a review comment.');
    setReviewSubmitting(true);

    const { error } = await supabase.from('reviews').insert({
      parking_lot_id: parking.id,
      rating: newRating,
      comment: newReview,
      created_at: new Date()
    });

    if (error) {
      alert('Error submitting review.');
      console.error(error);
    } else {
      setNewReview('');
      setNewRating(5);
      fetchReviews(parking.id);
    }

    setReviewSubmitting(false);
  }

  // Handle booking submission (very basic demo)
  async function handleBookingSubmit() {
    if (!bookingDate || !bookingStartTime || !bookingEndTime) {
      setBookingMessage('Please fill all booking fields.');
      return;
    }

    // TODO: You should create a bookings table and insert here properly.
    setBookingMessage('Booking submitted! (This is a demo message)');
    setTimeout(() => {
      setIsBookingOpen(false);
      setBookingMessage('');
    }, 2000);
  }

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!parking) return null;

  // Calculate average rating
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Link to="/search" className="text-blue-600 flex items-center mb-4">
        <ArrowLeft className="mr-2" /> Back to Search
      </Link>

      <div className="bg-white shadow rounded p-6">
        {/* Image */}
        <img
          src={parking.image_url || 'https://nappy.co/wp-content/uploads/2020/07/parking-lot-black-driver.jpg'}
          alt={parking.name}
          className="w-full h-64 object-cover rounded mb-4"
        />

        {/* Title & Location */}
        <h1 className="text-3xl font-bold mb-1">{parking.name}</h1>
        <p className="text-gray-600 mb-3 flex items-center">
          <MapPin className="mr-1" /> {parking.location}
        </p>

        {/* Description */}
        <p className="mb-4">{parking.description}</p>

        {/* Info */}
        <div className="flex flex-wrap gap-6 mb-4 text-gray-700">
          <div className="flex items-center gap-1">
            <Calendar />
            <span>{parking.available_spaces} available / {parking.total_spaces} total</span>
          </div>
          <div className="flex items-center gap-1">
            <CreditCard />
            <span>${parking.price_per_hour} per hour</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield />
            <span>Secure Parking</span>
          </div>
          {avgRating && (
            <div className="flex items-center gap-1">
              <Star className="text-yellow-500" />
              <span>{avgRating} / 5 ({reviews.length} reviews)</span>
            </div>
          )}
        </div>

        {/* Leaflet Map */}
        {parking.latitude && parking.longitude && (
          <div className="mb-6 rounded overflow-hidden">
            <MapContainer
              center={[parking.latitude, parking.longitude]}
              zoom={16}
              scrollWheelZoom={false}
              style={{ height: 300, width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[parking.latitude, parking.longitude]} icon={customIcon}>
                <Popup>{parking.name}</Popup>
              </Marker>
            </MapContainer>
          </div>
        )}

        {/* Book Now Button */}
        <button
          onClick={() => setIsBookingOpen(true)}
          className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
        >
          Book Now
        </button>

        {/* Nearby Parking Suggestions */}
        {nearbyParkings.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold mb-2">Nearby Parking Spots</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {nearbyParkings.map((p) => (
                <Link
                  to={`/parking/${p.id}`}
                  key={p.id}
                  className="border rounded p-3 hover:shadow-md transition"
                >
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-sm text-gray-600">{p.location}</p>
                  <p className="text-sm font-medium mt-1">${p.price_per_hour} / hour</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Booking Modal */}
        {isBookingOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded p-6 w-full max-w-md relative">
              <button
                onClick={() => setIsBookingOpen(false)}
                className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 font-bold text-xl"
                aria-label="Close booking modal"
              >
                &times;
              </button>
              <h2 className="text-2xl mb-4 font-semibold">Book {parking.name}</h2>

              <label className="block mb-2">
                Date
                <input
                  type="date"
                  className="border rounded px-3 py-2 w-full mt-1"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                />
              </label>

              <label className="block mb-2">
                Start Time
                <input
                  type="time"
                  className="border rounded px-3 py-2 w-full mt-1"
                  value={bookingStartTime}
                  onChange={(e) => setBookingStartTime(e.target.value)}
                />
              </label>

              <label className="block mb-4">
                End Time
                <input
                  type="time"
                  className="border rounded px-3 py-2 w-full mt-1"
                  value={bookingEndTime}
                  onChange={(e) => setBookingEndTime(e.target.value)}
                />
              </label>

              {bookingMessage && (
                <p className="mb-2 text-sm text-red-600">{bookingMessage}</p>
              )}

              <button
                onClick={handleBookingSubmit}
                className="bg-blue-600 text-white py-2 px-4 rounded w-full hover:bg-blue-700"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Reviews</h2>

          {reviews.length === 0 && <p>No reviews yet.</p>}

          {reviews.length > 0 && (
            <ul className="space-y-4 mb-6 max-h-72 overflow-y-auto">
              {reviews.map((r) => (
                <li key={r.id} className="border p-3 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold">{r.user?.username || 'Anonymous'}</span>
                    <span className="flex items-center text-yellow-500">
                      {[...Array(r.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4" />
                      ))}
                    </span>
                  </div>
                  <p>{r.comment}</p>
                  <small className="text-gray-500">{new Date(r.created_at).toLocaleDateString()}</small>
                </li>
              ))}
            </ul>
          )}

          <div className="border p-4 rounded">
            <h3 className="mb-2 font-semibold">Leave a Review</h3>

            <label className="block mb-2">
              Rating:
              <select
                value={newRating}
                onChange={(e) => setNewRating(Number(e.target.value))}
                className="ml-2 border rounded px-2 py-1"
              >
                {[5,4,3,2,1].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>

            <label className="block mb-4">
              Comment:
              <textarea
                value={newReview}
                onChange={(e) => setNewReview(e.target.value)}
                rows="3"
                className="w-full border rounded p-2 mt-1"
              ></textarea>
            </label>

            <button
              onClick={submitReview}
              disabled={reviewSubmitting}
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
