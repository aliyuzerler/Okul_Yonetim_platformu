import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "@/shared/api/client";
import type { MeResponse } from "@/shared/api/types";

interface AuthState {
  me: MeResponse | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<MeResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(getToken()));

  useEffect(() => {
    let cancelled = false;
    if (!getToken()) return;
    api
      .get<MeResponse>("/auth/me")
      .then((res) => {
        if (!cancelled) setMe(res.data);
      })
      .catch(() => {
        if (!cancelled) {
          setToken(null);
          setMe(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ token: string; role: string; email: string; full_name: string; tenant?: MeResponse["tenant"] }>(
      "/auth/login",
      { email, password },
    );
    setToken(res.data.token);
    const profile: MeResponse = {
      id: "",
      email: res.data.email,
      full_name: res.data.full_name,
      role: res.data.role as MeResponse["role"],
      tenant: res.data.tenant,
    };
    // Fill the id from /auth/me right away; the response payload is small.
    try {
      const meRes = await api.get<MeResponse>("/auth/me");
      setMe(meRes.data);
      return meRes.data;
    } catch {
      setMe(profile);
      return profile;
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setMe(null);
  }, []);

  const value = useMemo(() => ({ me, loading, login, logout }), [me, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
