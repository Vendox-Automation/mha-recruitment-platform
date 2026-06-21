"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { createContext, useCallback, useContext, useMemo } from "react";
import type { ReactNode } from "react";

import { ApiRequestError } from "@/lib/api/client";
import { getMe, logout as logoutRequest } from "@/lib/api/auth";
import type { User, UserRole, UserStatus } from "@/features/auth/types";

/** Stable query key for the session/me query (consumed across the app). */
export const ME_QUERY_KEY = ["me"] as const;

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  status: UserStatus | null;
  /** Re-run the `/auth/me/` query (e.g. after a profile change). */
  refetch: () => Promise<void>;
  /** Optimistically set the cached session (used right after login/register). */
  setUser: (user: User) => void;
  /** Clear the session server-side and drop the cached `me` data. */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Session-backed auth context (ADR-0001 §4.1). The `["me"]` query calls
 * `/auth/me/` which is the single source of truth for session/role/status.
 *
 * No token is persisted anywhere: the only credential is Django's HttpOnly
 * session cookie, sent automatically by the central client (`credentials:
 * "include"`). A 401 from `/auth/me/` simply means "anonymous" and is treated
 * as `user = null` rather than an error to surface.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const queryClient = useQueryClient();

  const query = useQuery<User | null>({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      try {
        return await getMe(locale);
      } catch (error) {
        // Anonymous session — not an error condition for the UI.
        if (error instanceof ApiRequestError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
  });

  const refetch = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const setUser = useCallback(
    (user: User) => {
      queryClient.setQueryData(ME_QUERY_KEY, user);
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest(locale);
    } finally {
      // Drop the session regardless of the network result so the UI can never
      // present a stale authenticated state after a sign-out attempt.
      queryClient.setQueryData(ME_QUERY_KEY, null);
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    }
  }, [locale, queryClient]);

  const user = query.data ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: query.isLoading,
      isAuthenticated: user !== null,
      role: user?.role ?? null,
      status: user?.status ?? null,
      refetch,
      setUser,
      logout,
    }),
    [user, query.isLoading, refetch, setUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access the auth context. Must be used under {@link AuthProvider}. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
