import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

import type { AuthSession } from "@/types";
import { api } from "@/lib/api";
import {
  authExpiredEventName,
  clearStoredAuthSession,
  getStoredAuthSession,
  setStoredAuthSession,
} from "@/lib/auth";

type AuthContextValue = {
  isInitializing: boolean;
  session: AuthSession | null;
  login: (session: AuthSession) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const storedSession = getStoredAuthSession();
      if (!storedSession) {
        setIsInitializing(false);
        return;
      }

      setSession(storedSession);

      try {
        const user = await api.getCurrentUser();
        const nextSession = {
          token: storedSession.token,
          user,
        };
        setStoredAuthSession(nextSession);
        setSession(nextSession);
      } catch {
        clearStoredAuthSession();
        setSession(null);
      } finally {
        setIsInitializing(false);
      }
    };

    void restoreSession();
  }, []);

  useEffect(() => {
    const handleExpired = () => {
      clearStoredAuthSession();
      setSession(null);
    };

    window.addEventListener(authExpiredEventName, handleExpired);
    return () => {
      window.removeEventListener(authExpiredEventName, handleExpired);
    };
  }, []);

  const value: AuthContextValue = {
    isInitializing,
    session,
    login: (nextSession) => {
      setStoredAuthSession(nextSession);
      setSession(nextSession);
    },
    logout: () => {
      clearStoredAuthSession();
      setSession(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return value;
}
