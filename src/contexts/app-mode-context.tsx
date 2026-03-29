"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

type AppMode = "demo" | "no-auth" | "auth";

interface AppModeContextType {
  mode: AppMode;
  isLoading: boolean;
  isAuthenticated: boolean;
  user: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>("demo");
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<string | null>(null);

  // Загрузка информации о режиме и авторизации
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      
      setMode(data.appMode || "demo");
      setIsAuthenticated(data.authenticated || false);
      setUser(data.user || null);
    } catch (e) {
      console.error("Failed to check auth:", e);
      setMode("demo");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setUser(data.user);
        return true;
      }
      
      return false;
    } catch (e) {
      console.error("Login failed:", e);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  return (
    <AppModeContext.Provider
      value={{
        mode,
        isLoading,
        isAuthenticated,
        user,
        login,
        logout,
        refreshAuth: checkAuth,
      }}
    >
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const context = useContext(AppModeContext);
  if (context === undefined) {
    throw new Error("useAppMode must be used within an AppModeProvider");
  }
  return context;
}
