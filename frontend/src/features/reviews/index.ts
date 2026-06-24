/** Barrel for the reviews feature (ADR-0001 §3.2 features/<x>). */
export {
  buildAdminReviewsQuery,
  buildReviewsQuery,
  createCompanyReview,
  deleteAdminReview,
  deleteAdminReviewReply,
  deleteReviewReply,
  getAdminReviews,
  listCompanyReviews,
  replyToReview,
} from "./service";
export type {
  AdminReviewListItem,
  AdminReviewListParams,
  CompanyReview,
  CreateReviewInput,
  Paginated,
  Rating,
  RatingDistribution,
  ReviewReply,
} from "./types";
export {
  adminReviewsListKey,
  companyReviewsKey,
  companyReviewsRootKey,
  REVIEWS_ROOT_KEY,
} from "./queryKeys";
export { reviewSchema } from "./schemas";
export type { ReviewValues } from "./schemas";
export { formatReviewDate } from "./format";
export { RatingInput, StarRating } from "./components/StarRating";
export type { RatingInputProps, StarRatingProps } from "./components/StarRating";
export { ReviewSummary } from "./components/ReviewSummary";
export type { ReviewSummaryProps } from "./components/ReviewSummary";
export { ReviewList } from "./components/ReviewList";
export type { ReviewListProps } from "./components/ReviewList";
export { ReviewForm } from "./components/ReviewForm";
export type { ReviewFormProps } from "./components/ReviewForm";
export { ReviewReplyEditor } from "./components/ReviewReplyEditor";
export type { ReviewReplyEditorProps } from "./components/ReviewReplyEditor";
export { ReviewsSection } from "./components/ReviewsSection";
export type { ReviewsSectionProps } from "./components/ReviewsSection";
