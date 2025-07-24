import React, { useState } from 'react';
import { Plus, Eye, Edit, Trash2, CheckCircle, XCircle, Ban } from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('listings');

  // ✅ Listings
  const [listings, setListings] = useState([
    { id: 1, title: 'Downtown Garage', location: 'Seattle, WA', status: 'active' },
    { id: 2, title: 'Capitol Hill Driveway', location: 'Seattle, WA', status: 'pending' }
  ]);

  // ✅ Users
  const [users, setUsers] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'blocked' }
  ]);

  // ✅ Bookings
  const [bookings, setBookings] = useState([
    { id: 1, user: 'John Doe', listing: 'Downtown Garage', date: '2024-01-20', status: 'active' },
    { id: 2, user: 'Jane Smith', listing: 'Capitol Hill Driveway', date: '2024-01-15', status: 'completed' }
  ]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [editData, setEditData] = useState(null);
  const [newData, setNewData] = useState({});

  // ✅ CRUD Handlers
  const handleAddOrUpdate = () => {
    if (editData) {
      // Update existing item
      if (modalType === 'listing') {
        setListings(listings.map(l => (l.id === editData.id ? editData : l)));
      } else if (modalType === 'user') {
        setUsers(users.map(u => (u.id === editData.id ? editData : u)));
      } else if (modalType === 'booking') {
        setBookings(bookings.map(b => (b.id === editData.id ? editData : b)));
      }
    } else {
      // Add new
      if (modalType === 'listing') {
        const newId = listings.length ? listings[listings.length - 1].id + 1 : 1;
        setListings([...listings, { ...newData, id: newId, status: 'pending' }]);
      } else if (modalType === 'user') {
        const newId = users.length ? users[users.length - 1].id + 1 : 1;
        setUsers([...users, { ...newData, id: newId, status: 'active' }]);
      } else if (modalType === 'booking') {
        const newId = bookings.length ? bookings[bookings.length - 1].id + 1 : 1;
        setBookings([...bookings, { ...newData, id: newId, status: 'active' }]);
      }
    }
    setShowModal(false);
    setEditData(null);
    setNewData({});
  };

  const handleDelete = (id, type) => {
    if (type === 'listing') setListings(listings.filter(l => l.id !== id));
    if (type === 'user') setUsers(users.filter(u => u.id !== id));
    if (type === 'booking') setBookings(bookings.filter(b => b.id !== id));
  };

  const handleToggleStatus = (id, type) => {
    if (type === 'listing') {
      setListings(listings.map(l => l.id === id ? { ...l, status: l.status === 'active' ? 'inactive' : 'active' } : l));
    } else if (type === 'user') {
      setUsers(users.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'blocked' : 'active' } : u));
    } else if (type === 'booking') {
      setBookings(bookings.map(b => b.id === id ? { ...b, status: b.status === 'active' ? 'completed' : 'active' } : b));
    }
  };

  const handleView = (item) => alert(JSON.stringify(item, null, 2));

  return (
    <div className="p-6">
      {/* Header */}
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-6 mb-6 border-b">
        {['listings', 'users', 'bookings'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 px-4 ${activeTab === tab ? 'border-b-2 border-blue-600 font-bold text-blue-600' : 'text-gray-500'}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content Sections */}
      {/* The rest of your JSX stays the same */}
    </div>
  );
};

export default AdminDashboard;
