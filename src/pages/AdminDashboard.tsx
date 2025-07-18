import React, { useState } from 'react';
import { Plus, Eye, Edit, Trash2, CheckCircle, XCircle, Ban } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'listings' | 'users' | 'bookings'>('listings');

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
  const [modalType, setModalType] = useState<'listing' | 'user' | 'booking' | null>(null);
  const [editData, setEditData] = useState<any>(null);

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

  const handleDelete = (id: number, type: string) => {
    if (type === 'listing') setListings(listings.filter(l => l.id !== id));
    if (type === 'user') setUsers(users.filter(u => u.id !== id));
    if (type === 'booking') setBookings(bookings.filter(b => b.id !== id));
  };

  const handleToggleStatus = (id: number, type: string) => {
    if (type === 'listing') {
      setListings(listings.map(l => l.id === id ? { ...l, status: l.status === 'active' ? 'inactive' : 'active' } : l));
    } else if (type === 'user') {
      setUsers(users.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'blocked' : 'active' } : u));
    } else if (type === 'booking') {
      setBookings(bookings.map(b => b.id === id ? { ...b, status: b.status === 'active' ? 'completed' : 'active' } : b));
    }
  };

  const handleView = (item: any) => alert(JSON.stringify(item, null, 2));

  return (
    <div className="p-6">
      {/* Header */}
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-6 mb-6 border-b">
        {['listings', 'users', 'bookings'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-2 px-4 ${activeTab === tab ? 'border-b-2 border-blue-600 font-bold text-blue-600' : 'text-gray-500'}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {/* Listings */}
        {activeTab === 'listings' && (
          <div>
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold">Listings</h2>
              <button
                onClick={() => { setShowModal(true); setModalType('listing'); setEditData(null); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
              >
                <Plus className="mr-2" /> Add Listing
              </button>
            </div>
            <table className="w-full bg-white shadow rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Title</th>
                  <th className="p-3 text-left">Location</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map(l => (
                  <tr key={l.id} className="border-b">
                    <td className="p-3">{l.title}</td>
                    <td className="p-3">{l.location}</td>
                    <td className="p-3 capitalize">{l.status}</td>
                    <td className="p-3 flex gap-2">
                      <button onClick={() => handleView(l)} className="text-blue-600"><Eye /></button>
                      <button onClick={() => { setEditData(l); setModalType('listing'); setShowModal(true); }} className="text-green-600"><Edit /></button>
                      <button onClick={() => handleDelete(l.id, 'listing')} className="text-red-600"><Trash2 /></button>
                      <button onClick={() => handleToggleStatus(l.id, 'listing')} className="text-yellow-600">
                        {l.status === 'active' ? <XCircle /> : <CheckCircle />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold">Users</h2>
              <button
                onClick={() => { setShowModal(true); setModalType('user'); setEditData(null); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
              >
                <Plus className="mr-2" /> Add User
              </button>
            </div>
            <table className="w-full bg-white shadow rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b">
                    <td className="p-3">{u.name}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3 capitalize">{u.status}</td>
                    <td className="p-3 flex gap-2">
                      <button onClick={() => handleView(u)} className="text-blue-600"><Eye /></button>
                      <button onClick={() => { setEditData(u); setModalType('user'); setShowModal(true); }} className="text-green-600"><Edit /></button>
                      <button onClick={() => handleDelete(u.id, 'user')} className="text-red-600"><Trash2 /></button>
                      <button onClick={() => handleToggleStatus(u.id, 'user')} className="text-yellow-600">
                        <Ban />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bookings */}
        {activeTab === 'bookings' && (
          <div>
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold">Bookings</h2>
              <button
                onClick={() => { setShowModal(true); setModalType('booking'); setEditData(null); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
              >
                <Plus className="mr-2" /> Add Booking
              </button>
            </div>
            <table className="w-full bg-white shadow rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">User</th>
                  <th className="p-3 text-left">Listing</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id} className="border-b">
                    <td className="p-3">{b.user}</td>
                    <td className="p-3">{b.listing}</td>
                    <td className="p-3">{b.date}</td>
                    <td className="p-3 capitalize">{b.status}</td>
                    <td className="p-3 flex gap-2">
                      <button onClick={() => handleView(b)} className="text-blue-600"><Eye /></button>
                      <button onClick={() => { setEditData(b); setModalType('booking'); setShowModal(true); }} className="text-green-600"><Edit /></button>
                      <button onClick={() => handleDelete(b.id, 'booking')} className="text-red-600"><Trash2 /></button>
                      <button onClick={() => handleToggleStatus(b.id, 'booking')} className="text-yellow-600">
                        {b.status === 'active' ? <XCircle /> : <CheckCircle />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md w-96">
            <h2 className="text-lg font-bold mb-4">{editData ? 'Edit' : 'Add'} {modalType}</h2>
            <input
              type="text"
              placeholder="Name or Title"
              value={editData ? editData.title || editData.name : (newData as any).title || ''}
              onChange={(e) =>
                editData
                  ? setEditData({ ...editData, title: editData.title !== undefined ? e.target.value : editData.title, name: editData.name !== undefined ? e.target.value : editData.name })
                  : setNewData({ ...newData, title: e.target.value, name: e.target.value })
              }
              className="w-full mb-3 px-3 py-2 border rounded"
            />
            <input
              type="text"
              placeholder="Location or Email"
              value={editData ? editData.location || editData.email : (newData as any).location || ''}
              onChange={(e) =>
                editData
                  ? setEditData({ ...editData, location: editData.location !== undefined ? e.target.value : editData.location, email: editData.email !== undefined ? e.target.value : editData.email })
                  : setNewData({ ...newData, location: e.target.value, email: e.target.value })
              }
              className="w-full mb-3 px-3 py-2 border rounded"
            />
            {modalType === 'booking' && (
              <input
                type="date"
                value={editData ? editData.date : (newData as any).date || ''}
                onChange={(e) =>
                  editData
                    ? setEditData({ ...editData, date: e.target.value })
                    : setNewData({ ...newData, date: e.target.value })
                }
                className="w-full mb-3 px-3 py-2 border rounded"
              />
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
              <button onClick={handleAddOrUpdate} className="px-4 py-2 bg-blue-600 text-white rounded">
                {editData ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
