import { QueryClient } from "@tanstack/react-query";

import { ApiRequestError } from "@/lib/api/client";

/**
 * Factory for the single shared TanStack Query client (ADR-0001 §1.2: "TanStack
 * Query over a single central API client"). A factory (not a module-level
 * singleton) keeps each browser session / test isolated and avoids leaking
 * cached data across requests in any future server-render path.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Auth/session state is read-heavy and should feel live but not chatty.
        staleTime: 30_000,
        retry(failureCount, error) {
          // Never retry auth/permission failures — they are deterministic.
          if (error instanceof ApiRequestError) {
            if (error.status === 401 || error.status === 403) return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
