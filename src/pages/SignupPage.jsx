// src/pages/Signup.jsx
import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("user"); // default role
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role }, // store role in user_metadata
      },
    });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Signup successful! Please check your email to confirm.");
      // Optional: Redirect after a short delay
      setTimeout(() => navigate("/login"), 1500);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
        color: "#333",
        padding: "1rem",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: "#f9f9f9",
          padding: "2rem",
          borderRadius: "10px",
          width: "350px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <h2 style={{ textAlign: "center", color: "#1e3c72" }}>Sign Up</h2>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: "0.6rem",
            borderRadius: "4px",
            border: "1px solid #ccc",
            fontSize: "1rem",
          }}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            padding: "0.6rem",
            borderRadius: "4px",
            border: "1px solid #ccc",
            fontSize: "1rem",
          }}
        />

        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          style={{
            padding: "0.6rem",
            borderRadius: "4px",
            border: "1px solid #ccc",
            fontSize: "1rem",
          }}
        />

        <label htmlFor="role">Select Role</label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{
            padding: "0.6rem",
            borderRadius: "4px",
            border: "1px solid #ccc",
            fontSize: "1rem",
            backgroundColor: "#fff",
          }}
        >
          <option value="user">User</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
        </select>

        {error && (
          <div
            style={{
              backgroundColor: "#ff4d4f",
              padding: "0.5rem",
              borderRadius: "4px",
              textAlign: "center",
              color: "#fff",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              backgroundColor: "#52c41a",
              padding: "0.5rem",
              borderRadius: "4px",
              textAlign: "center",
              color: "#fff",
            }}
          >
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.75rem",
            borderRadius: "4px",
            border: "none",
            backgroundColor: "#1e3c72",
            color: "#fff",
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>
      </form>
    </div>
  );
}
