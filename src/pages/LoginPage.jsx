import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else if (data?.user) {
      // Get user role from metadata
      const role = data.user.user_metadata?.role || "user"; // default to "user"

      if (role === "admin") {
        navigate("/dashboard/admin");
      } else if (role === "owner") {
        navigate("/dashboard/owner");
      } else {
        navigate("/dashboard/user");
      }
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
        <h2 style={{ textAlign: "center", color: "#1e3c72" }}>Login</h2>

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

        {error && (
          <div
            style={{
              backgroundColor: "#ff4d4f",
              padding: "0.5rem",
              borderRadius: "4px",
              color: "#fff",
              textAlign: "center",
            }}
          >
            {error}
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
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>
    </div>
  );
}
