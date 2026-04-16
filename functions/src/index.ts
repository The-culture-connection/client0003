/**
 * Mortar Cloud Functions — expansion invites + curriculum, matching, analytics, etc.
 * `firebaseGlobalOptions` must load first (side effect) for v2 defaults.
 */
import "./firebaseGlobalOptions";

export * from "./expansionInvite";

export { onUserCreated } from "./triggers/onUserCreated";
export { onUserReportCreated } from "./triggers/onUserReportCreated";
export { onMatchProfileWrite } from "./triggers/onMatchProfileWrite";
export { scheduledNudgeIncompleteProfiles } from "./triggers/scheduledNudgeIncompleteProfiles";

export { setUserRole } from "./callables/setUserRole";
export { logAnalyticsEvent } from "./callables/logAnalyticsEvent";
export { ingestWebAnalytics } from "./callables/ingestWebAnalytics";
export { markNotificationReadBackend } from "./callables/markNotificationReadBackend";
export { getPhase5DashboardMetrics } from "./callables/getPhase5DashboardMetrics";
export { queryAdminWebAnalyticsEvents } from "./callables/queryAdminWebAnalyticsEvents";
export { onAnalyticsRawEventCreated } from "./analytics/triggers/onAnalyticsRawEventCreated";
export { onAnalyticsWebEventCreated } from "./analytics/triggers/onAnalyticsWebEventCreated";
export { onUserAnalyticsSummaryWritten } from "./analytics/triggers/onUserAnalyticsSummaryWritten";
export { scheduledPhase4DerivedMetrics } from "./analytics/triggers/scheduledPhase4DerivedMetrics";
export { upsertBusinessProfile } from "./callables/upsertBusinessProfile";
export { trackLessonTime } from "./callables/trackLessonTime";
export { markLessonComplete } from "./callables/markLessonComplete";
export { submitQuizAttempt } from "./callables/submitQuizAttempt";
export { getQuizForAttempt } from "./callables/getQuizForAttempt";
export { generateDocumentPDF } from "./callables/generateDocumentPDF";
export { finalizeAssetDocument } from "./callables/finalizeAssetDocument";
export { grantHiddenTrainingVideo } from "./callables/grantHiddenTrainingVideo";
export { proposeMeeting } from "./callables/proposeMeeting";
export { approveMeeting } from "./callables/approveMeeting";
export { adminAnalyticsReport } from "./callables/adminAnalyticsReport";
export { upsertMatchProfile } from "./callables/upsertMatchProfile";
export { setUserBusinessProfile } from "./callables/setUserBusinessProfile";
export { updateOnboardingStatus } from "./callables/updateOnboardingStatus";
export { completeOnboarding } from "./callables/completeOnboarding";
export { buildInitialMatches } from "./callables/buildInitialMatches";
export { runExpansionUserMatching } from "./callables/runExpansionUserMatching";
export { getCourseFile } from "./callables/getCourseFile";
export { importPptxDeck } from "./callables/importPptxDeck";
export { joinGroup, leaveGroup, deleteMobileGroup } from "./callables/groupMembership";
export {
  adminCreateMobileGroup,
  adminUpdateMobileGroup,
  adminModifyMobileGroupMembers,
  getUserModerationSnapshot,
  moderateUserAccount,
} from "./callables/adminMobileModeration";

export {
  onGroupThreadVoteWrite,
  onGroupCommentVoteWrite,
  onGroupThreadCreated,
  onGroupCommentCreated,
  onGroupMemberListChange,
  onMobileGroupThreadVoteWrite,
  onMobileGroupCommentVoteWrite,
  onMobileGroupThreadCreated,
  onMobileGroupCommentCreated,
  onMobileGroupMemberListChange,
} from "./groups/groupThreadTriggers";
