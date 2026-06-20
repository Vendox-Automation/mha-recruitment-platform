import { apiFetch } from "./client";

export interface HealthStatus {
  status: string;
  service: string;
  database: string;
}

/** Phase 0 connectivity probe against the backend health endpoint. */
export function getHealth(): Promise<HealthStatus> {
  return apiFetch<HealthStatus>("/health/");
}
