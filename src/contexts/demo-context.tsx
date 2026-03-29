"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface KeeneticCredentials {
  host: string;
  login: string;
  password: string;
}

interface DemoContextType {
  credentials: KeeneticCredentials | null;
  setCredentials: (creds: KeeneticCredentials | null) => void;
  clearCredentials: () => void;
  isConfigured: boolean;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

const STORAGE_KEY = "keenetic-dns-demo-credentials";

export function DemoProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentialsState] = useState<KeeneticCredentials | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Загрузка из sessionStorage при монтировании
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCredentialsState(parsed);
      }
    } catch (e) {
      console.error("Failed to load credentials from storage:", e);
    }
    setIsLoaded(true);
  }, []);

  const setCredentials = (creds: KeeneticCredentials | null) => {
    setCredentialsState(creds);
    if (creds) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  const clearCredentials = () => {
    setCredentialsState(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  // Не рендерим до загрузки из storage
  if (!isLoaded) {
    return null;
  }

  return (
    <DemoContext.Provider
      value={{
        credentials,
        setCredentials,
        clearCredentials,
        isConfigured: !!credentials,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoCredentials() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error("useDemoCredentials must be used within a DemoProvider");
  }
  return context;
}

/**
 * Получить заголовки для API запросов в demo режиме
 */
export function getDemoHeaders(credentials: KeeneticCredentials | null): HeadersInit {
  if (!credentials) {
    return {};
  }
  
  return {
    "X-Keenetic-Host": credentials.host,
    "X-Keenetic-Login": credentials.login,
    "X-Keenetic-Password": credentials.password,
  };
}
