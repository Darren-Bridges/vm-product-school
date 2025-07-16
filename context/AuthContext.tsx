"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { clearAllDataCache } from "../utils/dataCache";

interface Role {
  displayName: string;
}

interface User {
  email: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  userReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userReady, setUserReady] = useState(false);

  useEffect(() => {
    // Optionally, load user/token from localStorage or cookies here
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("auth_user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setUserReady(true);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("https://vmos3.vmos.io/user/v1/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-requested-from": "tenants-management",
      },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Login failed");
    const data = await res.json();
    const { token, user } = data.payload;
    setToken(token.value);
    setUser(user);
    localStorage.setItem("auth_token", token.value);
    localStorage.setItem("auth_user", JSON.stringify(user));
    // Set cookie for middleware (1 hour expiry)
    document.cookie = `auth_token=${token.value}; path=/; max-age=3600; samesite=lax`;
    clearAllDataCache(); // Invalidate cache on login
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    // Remove cookie
    document.cookie = "auth_token=; path=/; max-age=0; samesite=lax";
    clearAllDataCache(); // Invalidate cache on logout
    window.location.assign("/"); // Force redirect to home
  };

  const isSuperAdmin = user?.role.displayName === "Super Admin";

  // Clear cache when user role changes
  useEffect(() => {
    clearAllDataCache();
  }, [user?.role?.displayName]);

  return (
    <AuthContext.Provider value={{ user, token, isSuperAdmin, login, logout, userReady }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}; 