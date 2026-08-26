// src/pages/Register.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Field = ({
  name,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
}) => (
  <div>
    <label className="block text-sm font-medium text-primary mb-1.5">
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required
      placeholder={placeholder}
      className={`w-full border rounded-xl px-4 py-2.5 text-sm bg-surface
                  focus:outline-none focus:ring-2 focus:border-transparent transition
                  placeholder:text-muted/60
                  ${error ? "border-red-400 focus:ring-red-300" : "border-border focus:ring-accent"}`}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    const result = await register(form);
    setLoading(false);
    if (result.success) {
      navigate("/login", { state: { registered: true } });
    } else {
      setErrors(result.errors);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #D9770620 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/landing" className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl">🏠</span>
            <span className="text-2xl font-bold text-primary tracking-tight">
              RoomFinder
            </span>
          </Link>
          <p className="text-muted text-sm">Create your free account</p>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-8 space-y-5">
          <h2 className="text-xl font-semibold text-primary">Create account</h2>

          {errors.non_field_errors && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {errors.non_field_errors[0]}
            </div>
          )}

          <Field
            name="username"
            label="Username"
            placeholder="your_username"
            value={form.username}
            onChange={handleChange}
            error={errors.username?.[0]}
          />
          <Field
            name="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            error={errors.email?.[0]}
          />
          <Field
            name="password"
            label="Password"
            type="password"
            placeholder="Min. 8 characters"
            value={form.password}
            onChange={handleChange}
            error={errors.password?.[0]}
          />
          <Field
            name="password2"
            label="Confirm Password"
            type="password"
            placeholder="Repeat password"
            value={form.password2}
            onChange={handleChange}
            error={errors.password2?.[0]}
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover disabled:bg-border
                       text-white font-semibold rounded-xl py-2.5 text-sm
                       transition-all duration-200 shadow-sm"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="text-center text-sm text-muted">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-accent font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
