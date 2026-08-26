// src/pages/Login.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(form.username, form.password);
    setLoading(false);
    if (result.success) {
      navigate("/");
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      {/* Background subtle pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #D9770620 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/landing" className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl">🏠</span>
            <span className="text-2xl font-bold text-primary tracking-tight">
              RoomFinder
            </span>
          </Link>
          <p className="text-muted text-sm">
            Sign in to browse available rooms
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-8 space-y-5">
          <h2 className="text-xl font-semibold text-primary">Welcome back</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              autoFocus
              placeholder="your_username"
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-surface
                         focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                         transition placeholder:text-muted/60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-surface
                         focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                         transition placeholder:text-muted/60"
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover disabled:bg-border
                       text-white font-semibold rounded-xl py-2.5 text-sm
                       transition-all duration-200 shadow-sm"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-center text-sm text-muted">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-accent font-semibold hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
