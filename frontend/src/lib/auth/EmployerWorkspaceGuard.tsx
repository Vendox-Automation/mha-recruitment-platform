"use client";

import type { ReactNode } from "react";

import { RouteGuard } from "./RouteGuard";

/**
 * Guard for approved-employer-only workspace routes (spec §8.3). A PENDING /
 * REJECTED / SUSPENDED employer reaching the dashboard, jobs, analytics, etc.
 * is redirected to `/employer/pending`. Apply this on workspace pages, NOT on
 * the employer layout (the pending screen itself must stay reachable).
 */
export function EmployerWorkspaceGuard({ children }: { children: ReactNode }) {
  return (
    <RouteGuard requireRole="EMPLOYER" requireApprovedEmployer>
      {children}
    </RouteGuard>
  );
}
