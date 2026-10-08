import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { API_BASE } from "@/config/api";
import { localStore } from "@/utils/localStore";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = `${API_BASE}/api`;
const TOKEN_KEY = "gymgate_token";
const USER_KEY = "gymgate_user";
const AUTH_CHECK_TIMEOUT_MS = 6_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token and user on mount
  useEffect(() => {
    const loadAuth = async () => {
      const savedToken = localStorage.getItem(TOKEN_KEY);

      if (savedToken) {
        const cachedUserRaw = localStorage.getItem(USER_KEY);
        let cachedUser: User | null = null;
        if (cachedUserRaw) {
          try {
            cachedUser = JSON.parse(cachedUserRaw) as User;
          } catch {
            localStorage.removeItem(USER_KEY);
          }
        }

        // Offline-first: with a cached user the app opens immediately from
        // IndexedDB; the token is verified in the background. Without this a
        // weak connection kept the splash screen up for as long as /auth/me hung.
        if (cachedUser) {
          setToken(savedToken);
          setUser(cachedUser);
          setIsLoading(false);
        }

        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), AUTH_CHECK_TIMEOUT_MS);
        try {
          const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${savedToken}`,
            },
            signal: controller.signal,
          });

          if (response.ok) {
            const result = await response.json();
            setToken(savedToken);
            setUser(result.data);
            localStorage.setItem(USER_KEY, JSON.stringify(result.data));
          } else if (response.status === 401 || response.status === 403) {
            // Only an explicit rejection of the token logs the user out.
            // 5xx / 502 / 503 from a flaky gateway must NOT drop the session.
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setToken(null);
            setUser(null);
          } else if (cachedUser) {
            setToken(savedToken);
            setUser(cachedUser);
          }
        } catch {
          // Network error / timeout: keep the token and the cached user (offline mode)
          if (cachedUser) {
            setToken(savedToken);
            setUser(cachedUser);
          }
        } finally {
          window.clearTimeout(timer);
        }
      }

      setIsLoading(false);
    };

    loadAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Nieprawidłowy email lub hasło");
    }

    const result = await response.json();
    const { token, user } = result.data;

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Błąd rejestracji");
    }

    const result = await response.json();
    const { token, user } = result.data;

    // Auto-login after successful registration
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setToken(token);
    setUser(user);

    return user;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    void Promise.all([
      localStore.clear("workouts"),
      localStore.clear("stats"),
      localStore.clear("activeWorkout"),
      localStore.clear("pendingSync"),
      localStore.clear("metadata"),
    ]);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, register, logout, isLoading }}
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
