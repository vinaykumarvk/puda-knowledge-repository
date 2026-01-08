import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";

interface User {
  id: string;
  username: string;
  fullName: string;
  team: string;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Clear any old bypass user from localStorage
      localStorage.removeItem("bypass_user");

      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        try {
          const data = await response.json();
          setUser(data.user);
        } catch (jsonError) {
          console.error("Failed to parse user data:", jsonError);
          // RBAC postponed - use default user when auth fails
          setUser({
            id: "default",
            username: "user",
            fullName: "Default User",
            team: "admin",
            email: null,
            isActive: true,
            createdAt: new Date().toISOString(),
            lastLogin: null,
          });
        }
      } else {
        // RBAC postponed - use default user when not authenticated
        setUser({
          id: "default",
          username: "user",
          fullName: "Default User",
          team: "admin",
          email: null,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: null,
        });
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      // RBAC postponed - use default user on error
      setUser({
        id: "default",
        username: "user",
        fullName: "Default User",
        team: "admin",
        email: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include",
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Login failed");
    }

    const data = await response.json();
    setUser(data.user);
    setLocation("/");
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Clear bypass user from localStorage
      localStorage.removeItem("bypass_user");
      setUser(null);
      setLocation("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
