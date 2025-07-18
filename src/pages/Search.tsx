import React, { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { MapPin, Star } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const useQuery = () => new URLSearchParams(useLocation().search);

const mockResults = [
  {
    id: 1,
    title: "Downtown Garage - Secure",
    location: "Harare CBD",
    price: "$5/day",
    rating: 4.7,
    lat: -17.8292,
    lng: 31.0522,
    image:
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80",
    features: ["Covered", "24/7 Access", "Security"],
  },
  {
    id: 2,
    title: "Residential Parking - Avondale",
    location: "Avondale",
    price: "$4/day",
    rating: 4.5,
    lat: -17.7772,
    lng: 31.0185,
    image:
      "https://images.unsplash.com/photo-1597007258379-1e4e6c8bb631?auto=format&fit=crop&w=800&q=80",
    features: ["Gated", "Private", "Lighting"],
  },
  {
    id: 3,
    title: "Mbare Market Lot",
    location: "Mbare",
    price: "$3/day",
    rating: 4.2,
    lat: -17.845,
    lng: 31.045,
    image:
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80",
    features: ["Busy area", "Accessible", "Open"],
  },
  {
    id: 4,
    title: "Westgate Mall Parking",
    location: "Westgate",
    price: "$6/day",
    rating: 4.8,
    lat: -17.779,
    lng: 30.991,
    image:
      "https://images.unsplash.com/photo-1564518098550-09a9f03dd4d6?auto=format&fit=crop&w=800&q=80",
    features: ["Secure", "CCTV", "Convenient"],
  },
];

const Search = () => {
  const query = useQuery();
  const location = query.get("location") || "";
  const date = query.get("date") || "";

  useEffect(() => {
    const map = L.map("search-map").setView([-17.8252, 31.0335], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors',
    }).addTo(map);

    mockResults.forEach((spot) => {
      L.marker([spot.lat, spot.lng])
        .addTo(map)
        .bindPopup(`<b>${spot.title}</b><br>${spot.location}`);
    });

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Search Results for:{" "}
          <span className="text-blue-600">{location}</span>{" "}
          {date && <span className="text-sm text-gray-500">(on {date})</span>}
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Listings */}
          <div className="md:col-span-2 space-y-6">
            {mockResults.map((spot) => (
              <div
                key={spot.id}
                className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <img
                  src={spot.image}
                  alt={spot.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">{spot.title}</h3>
                    <div className="flex items-center text-yellow-400">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="ml-1 text-sm text-gray-600">
                        {spot.rating}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-600 text-sm mb-2">
                    <MapPin className="w-4 h-4 mr-1" />
                    {spot.location}
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-blue-800 mb-3">
                    {spot.features.map((f) => (
                      <span
                        key={f}
                        className="bg-blue-100 px-2 py-1 rounded-full"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-600 font-bold text-lg">
                      {spot.price}
                    </span>
                    <Link
                      to={`/parking/${spot.id}`}
                      className="text-sm text-white bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Map */}
          <div>
            <div
              id="search-map"
              className="w-full h-[500px] rounded-lg shadow-md"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search;
