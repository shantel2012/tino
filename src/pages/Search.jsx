import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Adjust path if needed

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [parkingLots, setParkingLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchParkingLots = async (query) => {
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('parking_lots') // ✅ use your correct table name
      .select('*')
      .ilike('location', `%${query}%`);

    if (error) {
      console.error('Error fetching parking lots:', error);
      setError('Failed to load parking lots.');
    } else {
      setParkingLots(data);
    }

    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim() !== '') {
      fetchParkingLots(searchQuery);
    }
  };

  useEffect(() => {
    // Load all active parking lots initially
    fetchParkingLots('');
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Search for Parking Lots</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Enter location (e.g. Harare, Airport)"
          className="flex-1 border border-gray-300 rounded-md p-2"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      {loading && <p>Loading parking lots...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {parkingLots.map((lot) => (
          <div
            key={lot.id}
            className="border p-4 rounded-md shadow hover:shadow-lg transition"
          >
            <h2 className="text-lg font-semibold text-blue-700">{lot.name}</h2>
            <p className="text-gray-600">{lot.location}</p>
            <p className="text-sm mt-1">{lot.description}</p>
            <p className="mt-2 font-semibold">
              ${lot.price_per_hour} / hour
            </p>
            <p className="text-sm text-gray-500">
              Available Spaces: {lot.available_spaces} / {lot.total_spaces}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Search;
