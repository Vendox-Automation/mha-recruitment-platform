"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";

import { AuthProvider } from "@/lib/auth";
import { createQueryClient } from "@/lib/queryClient";

/**
 * Client-side providers mounted by the (server) root layout. Holds the single
 * shared TanStack Query client (created once per browser session via lazy
 * `useState`) and the session-backed {@link AuthProvider}. Keeping this in a
 * dedicated `"use client"` component lets `app/[locale]/layout.tsx` stay a
 * server component (ADR-0001 §1.2).
 *
 * This also seeds the data layer for later phases (jobs, applications, …).
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
