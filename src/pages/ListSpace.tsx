import React, { useState } from 'react';

const sampleSpaces = [
  {
    id: 1,
    name: 'Downtown Lot',
    location: '123 Main St',
    price: 5,
    image: 'https://images.pexels.com/photos/753876/pexels-photo-753876.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 2,
    name: 'City Center Garage',
    location: '456 Market St',
    price: 7,
    image:  'https://images.pexels.com/photos/1546168/pexels-photo-1546168.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 3,
    name: 'Airport Parking',
    location: '789 Airport Rd',
    price: 9,
    image: 'https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
];

export default function ListSpace() {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    price: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Listing submitted:', formData);
    setSubmitted(true);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow mt-8">
      <h1 className="text-3xl font-bold mb-6">List Your Parking Space</h1>

      {submitted ? (
        <div className="text-green-600 font-semibold mb-6">
          Thank you! Your parking space has been listed.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div>
            <label className="block mb-1 font-medium">Space Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full border px-3 py-2 rounded"
              placeholder="e.g. Downtown Lot"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="w-full border px-3 py-2 rounded"
              placeholder="e.g. 123 Main St"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Price per hour ($)</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full border px-3 py-2 rounded"
              placeholder="e.g. 10"
            />
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Submit Listing
          </button>
        </form>
      )}

      <h2 className="text-2xl font-semibold mb-4">Sample Parking Spaces</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {sampleSpaces.map(space => (
          <div
            key={space.id}
            className="border rounded shadow-sm overflow-hidden hover:shadow-lg transition cursor-pointer"
          >
            <img
              src={space.image}
              alt={space.name}
              className="w-full h-40 object-cover"
              loading="lazy"
            />
            <div className="p-4">
              <h3 className="text-xl font-semibold">{space.name}</h3>
              <p className="text-gray-600">{space.location}</p>
              <p className="text-green-700 font-bold mt-2">${space.price} / hr</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
