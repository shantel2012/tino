// src/components/RoleRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const RoleRoute = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    // Not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  const role = user.user_metadata?.role || "user";

  if (!allowedRoles.includes(role)) {
    // Role not allowed, redirect to home or unauthorized page
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RoleRoute;
