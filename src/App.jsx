// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import UserDashboard from "./pages/UserDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ParkingDetails from "./pages/ParkingDetails";
import BookingPage from "./pages/BookingPage";
import HowitWorks from "./pages/Howitworks";
import ListSpace from "./pages/ListSpace";
import Search from "./pages/Search";
import { AuthProvider } from "./contexts/AuthContext";
import RoleRoute from "./components/RoleRoute"; // for role-based route protection

const App = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/how-it-works" element={<HowitWorks />} />
          <Route path="/search" element={<Search />} />

          {/* Dashboard routes with role-based protection */}
          <Route
            path="/dashboard/user"
            element={
              <RoleRoute allowedRoles={["user", "owner", "admin"]}>
                <UserDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/dashboard/owner"
            element={
              <RoleRoute allowedRoles={["owner", "admin"]}>
                <OwnerDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/dashboard/admin"
            element={
              <RoleRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </RoleRoute>
            }
          />

          {/* Parking & booking */}
          <Route path="/parking/:id" element={<ParkingDetails />} />
          <Route path="/booking/:id" element={<BookingPage />} />

          {/* Owner list space */}
          <Route path="/owner/list-space" element={<ListSpace />} />
          <Route path="/list-space" element={<ListSpace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
};

export default App;
