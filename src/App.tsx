import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import UserDashboard from './pages/UserDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ParkingDetails from './pages/ParkingDetails';
import BookingPage from './pages/BookingPage';
import HowItWorks from './pages/Howitworks';
import ListSpace from './pages/ListSpace';
import Search from './pages/Search';
// import ProfilePage from './pages/Profile'; // ✅ Import Profile Page
import { AuthProvider } from './contexts/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            {/* ✅ Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/search" element={<Search />} />

            {/* ✅ Dashboard Routes */}
            <Route path="/dashboard/user" element={<UserDashboard />} />
            <Route path="/dashboard/owner" element={<OwnerDashboard />} />
            <Route path="/dashboard/admin" element={<AdminDashboard />} />

            {/* ✅ Parking & Booking */}
            <Route path="/parking/:id" element={<ParkingDetails />} />
            <Route path="/booking/:id" element={<BookingPage />} />

            {/* ✅ Owner List Space */}
            <Route path="/owner/list-space" element={<ListSpace />} />
            <Route path="/list-space" element={<ListSpace />} />

            {/* ✅ Profile Page */}
            {/* <Route path="/profile" element={<ProfilePage />} /> */}
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
