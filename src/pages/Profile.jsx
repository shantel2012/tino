// src/pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

const Profile = () => {
  const { user, isAuthenticated } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setAvatar(user.avatar || '');
    }
  }, [user]);

  if (!isAuthenticated) {
    return <div className="p-8 text-center">Please log in to view your profile.</div>;
  }

  const handleUpdate = async () => {
    if (!user) return;
    setLoading(true);
    setMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({ name, avatar })
      .eq('id', user.id);

    if (error) {
      setMessage('Failed to update profile.');
    } else {
      setMessage('Profile updated successfully!');
    }

    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-6 text-center">Your Profile</h1>

      <div className="flex flex-col items-center mb-6">
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="w-24 h-24 rounded-full object-cover mb-2"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-300 mb-2 flex items-center justify-center text-gray-600">
            No Image
          </div>
        )}
      </div>

      <label className="block mb-2 font-medium text-gray-700" htmlFor="name">
        Full Name
      </label>
      <input
        id="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full mb-4 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <label className="block mb-2 font-medium text-gray-700" htmlFor="avatar">
        Avatar URL
      </label>
      <input
        id="avatar"
        type="text"
        value={avatar}
        onChange={(e) => setAvatar(e.target.value)}
        className="w-full mb-4 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="https://example.com/avatar.jpg"
      />

      <button
        onClick={handleUpdate}
        disabled={loading}
        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Updating...' : 'Update Profile'}
      </button>

      {message && <p className="mt-4 text-center text-gray-700">{message}</p>}
    </div>
  );
};

export default Profile;
