"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser, AuthStatus } from "@/types/auth";
import { AuthContext } from "@/components/auth/AuthContext";
import { API_BASE_URL } from "@/lib/api";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/token";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider(props: AuthProviderProps) {
  const { children } = props;

  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const fetchMeWithToken = useCallback(
    async (token: string): Promise<AuthUser | null> => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me/`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          clearAccessToken();
          return null;
        }

        if (!res.ok) {
          return null;
        }

        const data = (await res.json()) as AuthUser;
        return data;
      } catch {
        return null;
      }
    },
    [],
  );

  // Initial bootstrapping – resolve existing token (if any)
  useEffect(() => {
    let cancelled = false;

    async function init(): Promise<void> {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setStatus("unauthenticated");
        }
        return;
      }

      const me = await fetchMeWithToken(token);
      if (cancelled) return;

      if (me) {
        setUser(me);
        setStatus("authenticated");
      } else {
        setUser(null);
        setStatus("unauthenticated");
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [fetchMeWithToken]);

  // React to global 401 events from apiFetch
  useEffect(() => {
    function handleUnauthorised(): void {
      clearAccessToken();
      setUser(null);
      setStatus("unauthenticated");
    }

    if (typeof window !== "undefined") {
      window.addEventListener("auth:unauthorised", handleUnauthorised);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("auth:unauthorised", handleUnauthorised);
      }
    };
  }, []);

  // Login helper: store token then fetch /auth/me
  const login = useCallback(
    async (token: string): Promise<void> => {
      setAccessToken(token);
      const me = await fetchMeWithToken(token);
      if (me) {
        setUser(me);
        setStatus("authenticated");
      } else {
        clearAccessToken();
        setUser(null);
        setStatus("unauthenticated");
      }
    },
    [fetchMeWithToken],
  );

  // Logout helper
  const logout = useCallback((): void => {
    clearAccessToken();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      login,
      logout,
    }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
