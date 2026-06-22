/** Barrel for the session/auth layer (ADR-0001 §3.2 lib/auth, §4). */
export { AuthProvider, useAuth, ME_QUERY_KEY } from "./AuthProvider";
export type { AuthContextValue } from "./AuthProvider";
export { RouteGuard } from "./RouteGuard";
export type { RouteGuardProps } from "./RouteGuard";
export { EmployerWorkspaceGuard } from "./EmployerWorkspaceGuard";
export {
  destinationForUser,
  isApprovedEmployer,
  hasRole,
  userDisplayName,
} from "./redirects";
