/** Barrel for the candidates feature (ADR-0001 §3.2 features/<x>). */
export {
  deleteResume,
  getDashboard,
  getProfile,
  resumeDownloadUrl,
  updateProfile,
  uploadResume,
} from "./service";
export type {
  CandidateDashboard,
  CandidateProfile,
  CandidateProfileUpdate,
  DashboardApplications,
  DashboardRecentApplication,
  ProfileCompletion,
  ProfileCompletionItem,
  ResumeMetadata,
  ResumeParsingStatus,
} from "./types";
export {
  CANDIDATE_PROFILE_FIELDS,
  candidateProfileSchema,
  PREFERRED_EMPLOYMENT_TYPE_OPTIONS,
} from "./schemas";
export type { CandidateProfileValues } from "./schemas";
export {
  precheckResumeFile,
  RESUME_ACCEPT,
  RESUME_ALLOWED_EXTENSIONS,
  RESUME_MAX_BYTES,
} from "./resumeFile";
export type { ResumePrecheckError, ResumePrecheckResult } from "./resumeFile";
export {
  NEXT_ACTION_ROUTE,
  selectNextAction,
} from "./nextAction";
export type { CandidateNextAction } from "./nextAction";
export { CANDIDATE_DASHBOARD_KEY, CANDIDATE_PROFILE_KEY } from "./queryKeys";
export { CandidateDashboardView } from "./components/CandidateDashboardView";
export { CandidateProfileView } from "./components/CandidateProfileView";
export { ResumeManager } from "./components/ResumeManager";
