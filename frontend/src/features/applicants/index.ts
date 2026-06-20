/** Barrel for the employer applicant-workspace feature (ADR-0001 §3.2 features/<x>). */
export {
  applicantResumeUrl,
  getApplicant,
  getEmployerDashboard,
  getJobApplicants,
  listApplicants,
  updateApplicantNotes,
  updateApplicantStatus,
} from "./service";
export type {
  ApplicantListParams,
  ApplicationStatus,
  EmployerApplicantDetail,
  EmployerApplicantJob,
  EmployerApplicantListItem,
  EmployerApplicantProfile,
  EmployerDashboard,
  EmployerDashboardAttention,
  EmployerDashboardJob,
  Paginated,
  StatusChangeInput,
} from "./types";
export {
  groupByStatus,
  KANBAN_COLUMNS,
  needsConfirmation,
  statusLabelKey,
} from "./board";
export {
  applicantDetailKey,
  EMPLOYER_DASHBOARD_KEY,
  jobApplicantsKey,
} from "./queryKeys";
export { useStatusMutation } from "./useStatusMutation";
export { ApplicantWorkspace } from "./components/ApplicantWorkspace";
export { EmployerDashboardView } from "./components/EmployerDashboardView";
