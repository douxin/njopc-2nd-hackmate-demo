import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api, getStoredToken, storeToken } from "@/lib/api";
import type { AuthResponse, Dashboard, User } from "@/types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  dashboard: Dashboard | null;
  loading: boolean;
  pendingReviewCount: number;
  completeAuth: (payload: AuthResponse) => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshDashboard: () => Promise<Dashboard | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    storeToken(null);
    setToken(null);
    setUser(null);
    setDashboard(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken = token ?? getStoredToken();
    if (!currentToken) return;
    try {
      const nextUser = await api.me(currentToken);
      setUser(nextUser);
    } catch {
      clearSession();
    }
  }, [clearSession, token]);

  const refreshDashboard = useCallback(async (): Promise<Dashboard | null> => {
    const currentToken = token ?? getStoredToken();
    if (!currentToken) {
      setDashboard(null);
      return null;
    }
    try {
      const nextDashboard = await api.dashboard(currentToken);
      setDashboard(nextDashboard);
      return nextDashboard;
    } catch {
      return null;
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const nextUser = await api.me(storedToken);
        if (cancelled) return;
        setUser(nextUser);
        try {
          const nextDashboard = await api.dashboard(storedToken);
          if (!cancelled) setDashboard(nextDashboard);
        } catch {
          if (!cancelled) setDashboard(null);
        }
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const completeAuth = useCallback(async (payload: AuthResponse) => {
    storeToken(payload.token);
    setToken(payload.token);
    setUser(payload.user);
    try {
      const nextDashboard = await api.dashboard(payload.token);
      setDashboard(nextDashboard);
    } catch {
      setDashboard(null);
    }
  }, []);

  const logout = useCallback(async () => {
    const currentToken = token ?? getStoredToken();
    if (currentToken) {
      try {
        await api.logout(currentToken);
      } catch {
        // The local session is cleared even when the API cannot be reached.
      }
    }
    clearSession();
  }, [clearSession, token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      dashboard,
      loading,
      pendingReviewCount: dashboard?.pending_review_count ?? 0,
      completeAuth,
      refreshUser,
      refreshDashboard,
      logout,
    }),
    [completeAuth, dashboard, loading, logout, refreshDashboard, refreshUser, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
