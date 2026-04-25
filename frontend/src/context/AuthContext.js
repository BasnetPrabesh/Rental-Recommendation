// src/context/AuthContext.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

// ─── axios base URL ────────────────────────────────────────────────────────
axios.defaults.baseURL = "http://localhost:8000";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // decoded JWT payload
  const [loading, setLoading] = useState(true); // true while we check localStorage

  // ── helpers ──────────────────────────────────────────────────────────────

  /** Attach (or remove) the Authorization header on all future axios calls. */
  const setAxiosToken = useCallback((token) => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, []);

  /** Decode the access token and store user info in state. */
  const applyToken = useCallback(
    (accessToken) => {
      setAxiosToken(accessToken);
      try {
        const decoded = jwtDecode(accessToken);
        setUser(decoded); // { user_id, username, exp, … }
      } catch {
        setUser(null);
      }
    },
    [setAxiosToken],
  );

  // ── boot: restore session from localStorage ───────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Check expiry (exp is in seconds)
        if (decoded.exp * 1000 > Date.now()) {
          applyToken(token);
        } else {
          // Token expired – try a silent refresh
          silentRefresh();
        }
      } catch {
        logout();
      }
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── silent token refresh ──────────────────────────────────────────────────
  const silentRefresh = async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) {
      logout();
      return;
    }
    try {
      const { data } = await axios.post("/api/auth/token/refresh/", {
        refresh,
      });
      localStorage.setItem("access_token", data.access);
      applyToken(data.access);
    } catch {
      logout();
    }
  };

  // ── public API ────────────────────────────────────────────────────────────

  /**
   * Login with username + password.
   * Returns { success: true } or { success: false, error: "…" }
   */
  const login = async (username, password) => {
    try {
      const { data } = await axios.post("/api/auth/token/", {
        username,
        password,
      });
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      applyToken(data.access);
      return { success: true };
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        "Login failed. Check your credentials.";
      return { success: false, error: msg };
    }
  };

  /**
   * Register a new account.
   * userData = { username, email, password, password2 }
   * Returns { success: true } or { success: false, errors: { field: [msg] } }
   */
  const register = async (userData) => {
    try {
      await axios.post("/api/auth/register/", userData);
      return { success: true };
    } catch (err) {
      const errors = err.response?.data || {
        non_field_errors: ["Registration failed."],
      };
      return { success: false, errors };
    }
  };

  /** Clear everything and redirect to /login. */
  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setAxiosToken(null);
    setUser(null);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{ user, loading, isAuthenticated, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Convenience hook */
export const useAuth = () => useContext(AuthContext);
