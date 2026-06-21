/** Barrel for the employers feature (ADR-0001 §3.2 features/<x>). */
export {
  getApprovalStatus,
  getEmployerProfile,
  updateEmployerProfile,
} from "./service";
export type {
  EmployerApprovalState,
  EmployerApprovalStatus,
  EmployerProfile,
  EmployerProfileUpdate,
} from "./types";
export {
  employerProfileSchema,
  EMPLOYER_PROFILE_FIELDS,
} from "./schemas";
export type { EmployerProfileValues } from "./schemas";
export { CompanyProfileForm } from "./components/CompanyProfileForm";
export { CompanyProfileView } from "./components/CompanyProfileView";
export { EmployerApprovalView } from "./components/EmployerApprovalView";
