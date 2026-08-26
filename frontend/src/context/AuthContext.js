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

axios.defaults.baseURL = "http://localhost:8000";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // decoded JWT: { user_id, username, role, phone_number, exp, … }
  const [loading, setLoading] = useState(true);

  const setAxiosToken = useCallback((token) => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, []);

  const applyToken = useCallback(
    (accessToken) => {
      setAxiosToken(accessToken);
      try {
        // role + phone_number arrive automatically — the backend's
        // CustomTokenObtainPairSerializer embeds them as JWT claims.
        const decoded = jwtDecode(accessToken);
        setUser(decoded);
      } catch {
        setUser(null);
      }
    },
    [setAxiosToken],
  );

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) {
          applyToken(token);
        } else {
          silentRefresh();
        }
      } catch {
        logout();
      }
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  /** userData = { username, email, password, password2, role, phone_number } */
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

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setAxiosToken(null);
    setUser(null);
  };

  const isAuthenticated = !!user;
  const role = user?.role || null;
  const isSeeker = role === "seeker";
  const isLister = role === "lister";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        role,
        isSeeker,
        isLister,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
