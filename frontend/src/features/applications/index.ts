/** Barrel for the applications feature (ADR-0001 §3.2 features/<x>). */
export {
  apply,
  getApplication,
  getJobApplicationStatus,
  getMyApplications,
} from "./service";
export type {
  ApplicationAnswer,
  ApplicationDetail,
  ApplicationJobSummary,
  ApplicationListItem,
  ApplicationStatus,
  ApplicationStatusHistoryEntry,
  ApplyPayload,
  Paginated,
  ScreeningQuestionType,
  StatusSource,
} from "./types";
export {
  buildAnswersPayload,
  buildAnswerValue,
} from "./answers";
export type { AnswerableQuestion, RawAnswers } from "./answers";
export {
  ALL_STATUSES,
  isTerminalStatus,
  PIPELINE_STAGES,
  statusLabelKey,
  statusMeaningKey,
  statusNextActionKey,
  statusTone,
} from "./status";
export {
  APPLICATIONS_LIST_KEY,
  applicationDetailKey,
  jobApplicationStatusKey,
} from "./queryKeys";
export { formatDate, formatDateTime } from "./format";
export { ApplyView } from "./components/ApplyView";
export { ApplicationsListView } from "./components/ApplicationsListView";
export { ApplicationDetailView } from "./components/ApplicationDetailView";
export { ApplicationStatusBadge } from "./components/ApplicationStatusBadge";
