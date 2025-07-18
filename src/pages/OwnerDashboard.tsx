import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  Star,
  Calendar,
  Car,
} from "lucide-react";

interface Listing {
  id: number;
  title: string;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  bookings: number;
  earnings: number;
  image: string;
  status: string;
}

const OwnerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddModal, setShowAddModal] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch listings on mount and after updates
  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/spaces");
      if (!res.ok) throw new Error("Failed to fetch listings");
      const data = await res.json();
      setListings(data);
    } catch (error) {
      alert(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  // Add listing
  const addListing = async (newListing: Omit<Listing, "id">) => {
    try {
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newListing),
      });
      if (!res.ok) throw new Error("Failed to add listing");
      await fetchListings();
    } catch (error) {
      alert(error);
    }
  };

  // Delete listing
  const deleteListing = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    try {
      const res = await fetch(`/api/spaces/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete listing");
      await fetchListings();
    } catch (error) {
      alert(error);
    }
  };

  // Toggle listing status (active/inactive)
  const toggleStatus = async (id: number) => {
    try {
      // Find listing
      const listing = listings.find((l) => l.id === id);
      if (!listing) return;

      // New status opposite to current
      const newStatus = listing.status === "active" ? "inactive" : "active";

      const res = await fetch(`/api/spaces/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...listing, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await fetchListings();
    } catch (error) {
      alert(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your parking spaces and bookings</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add New Space</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {["overview", "listings"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {activeTab === "overview" && (
              <OverviewTab listings={listings} />
            )}
            {activeTab === "listings" && (
              <ListingsTab
                listings={listings}
                deleteListing={deleteListing}
                toggleStatus={toggleStatus}
              />
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showAddModal && (
        <AddSpaceModal
          setShowAddModal={setShowAddModal}
          addListing={addListing}
        />
      )}
    </div>
  );
};

const OverviewTab = ({ listings }: { listings: Listing[] }) => {
  // Calculate stats from listings
  const totalEarnings = listings.reduce((acc, l) => acc + l.earnings, 0);
  const activeListings = listings.filter((l) => l.status === "active").length;
  const totalBookings = listings.reduce((acc, l) => acc + l.bookings, 0);
  const avgRating =
    listings.length === 0
      ? 0
      : listings.reduce((acc, l) => acc + l.rating, 0) / listings.length;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard name="Total Earnings" value={`$${totalEarnings}`} />
        <StatCard name="Active Listings" value={activeListings.toString()} />
        <StatCard name="Total Bookings" value={totalBookings.toString()} />
        <StatCard name="Average Rating" value={avgRating.toFixed(2)} />
      </div>

      <h2 className="text-lg font-semibold mb-4">Top Listings</h2>
      <div>
        {listings.map((l) => (
          <div key={l.id} className="border p-4 rounded mb-3 flex justify-between">
            <div>
              <h3 className="font-semibold">{l.title}</h3>
              <p className="text-sm text-gray-600">{l.location}</p>
            </div>
            <div>
              <p>${l.earnings} earnings</p>
              <p>{l.bookings} bookings</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatCard = ({ name, value }: { name: string; value: string }) => (
  <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
    <p className="text-sm text-gray-500">{name}</p>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

const ListingsTab = ({
  listings,
  deleteListing,
  toggleStatus,
}: {
  listings: Listing[];
  deleteListing: (id: number) => void;
  toggleStatus: (id: number) => void;
}) => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-semibold mb-4">My Listings</h2>
    <table className="min-w-full divide-y divide-gray-200">
      <thead>
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {listings.map((listing) => (
          <tr key={listing.id}>
            <td className="px-6 py-4 whitespace-nowrap">{listing.title}</td>
            <td className="px-6 py-4 whitespace-nowrap">{listing.location}</td>
            <td className="px-6 py-4 whitespace-nowrap">${listing.price}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span
                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  listing.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {listing.status}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap space-x-2">
              <button
                onClick={() => toggleStatus(listing.id)}
                className="text-blue-600 hover:text-blue-900"
                title="Toggle Status"
              >
                <Edit className="inline-block h-5 w-5" />
              </button>
              <button
                onClick={() => deleteListing(listing.id)}
                className="text-red-600 hover:text-red-900"
                title="Delete Listing"
              >
                <Trash2 className="inline-block h-5 w-5" />
              </button>
              <Link to={`/listing/${listing.id}`} className="text-gray-600 hover:text-gray-900" title="View Listing">
                <Eye className="inline-block h-5 w-5" />
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const AddSpaceModal = ({
  setShowAddModal,
  addListing,
}: {
  setShowAddModal: React.Dispatch<React.SetStateAction<boolean>>;
  addListing: (newListing: Omit<Listing, "id">) => Promise<void>;
}) => {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !location || !price) {
      alert("Please fill all fields");
      return;
    }

    await addListing({
      title,
      location,
      price: Number(price),
      rating: 0,
      reviews: 0,
      bookings: 0,
      earnings: 0,
      image: "", // You can add a field to upload image later
      status: "active",
    });
    setShowAddModal(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4">Add New Parking Space</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Price (per day)</label>
            <input
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-md bg-gray-300 hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              Add Space
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OwnerDashboard;
