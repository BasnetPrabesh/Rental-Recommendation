// src/pages/Register.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ← Field must be OUTSIDE Register, not inside it
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
    <label className="block text-sm font-medium text-stone-700 mb-1">
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required
      className={`w-full border rounded-lg px-3 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:border-transparent transition
                  ${
                    error
                      ? "border-red-400 focus:ring-red-300"
                      : "border-stone-300 focus:ring-stone-400"
                  }`}
      placeholder={placeholder}
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
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-800 tracking-tight">
            RoomFinder
          </h1>
          <p className="text-stone-500 mt-1 text-sm">
            Create your free account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 space-y-5"
        >
          <h2 className="text-xl font-semibold text-stone-800">
            Create account
          </h2>

          {errors.non_field_errors && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
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
            type="submit"
            disabled={loading}
            className="w-full bg-stone-800 hover:bg-stone-700 disabled:bg-stone-400
                       text-white font-medium rounded-lg py-2.5 text-sm
                       transition focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-1"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="text-center text-sm text-stone-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-stone-800 font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
