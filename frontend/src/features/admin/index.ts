/** Barrel for the admin feature (ADR-0001 §3.2 features/<x>). */
export {
  approveEmployer,
  buildEmployersQuery,
  getAdminEmployer,
  getAdminEmployers,
  getAdminSummary,
  rejectEmployer,
  restoreEmployer,
  suspendEmployer,
} from "./service";
export type {
  AdminEmployerDetail,
  AdminEmployerListItem,
  AdminEmployerListParams,
  AdminEmployerStatus,
  AdminEmployerStatusFilter,
  AdminSummary,
  Paginated,
} from "./types";
export {
  actionsForStatus,
  ALL_EMPLOYER_STATUSES,
  STATUS_FILTERS,
  statusLabelKey,
  statusTone,
} from "./status";
export type { AdminEmployerAction } from "./status";
export {
  ADMIN_ROOT_KEY,
  ADMIN_SUMMARY_KEY,
  adminEmployerDetailKey,
  adminEmployersListKey,
} from "./queryKeys";
export { formatDate } from "./format";
export { useDebouncedValue } from "./useDebouncedValue";
export { useEmployerAction } from "./useEmployerAction";
export type { EmployerActionVars } from "./useEmployerAction";
export { AdminDashboardView } from "./components/AdminDashboardView";
export { EmployerApprovalQueue } from "./components/EmployerApprovalQueue";
export { RejectEmployerDialog } from "./components/RejectEmployerDialog";
export type { RejectEmployerDialogProps } from "./components/RejectEmployerDialog";
