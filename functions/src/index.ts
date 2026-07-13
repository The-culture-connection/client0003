/**
 * Mortar Cloud Functions — expansion invites + curriculum, matching, analytics, etc.
 * `firebaseGlobalOptions` must load first (side effect) for v2 defaults.
 */
import "./firebaseGlobalOptions";

export * from "./expansionInvite";
export {
  generateConferenceTicketCode,
  bulkAddConferenceTicketBuyers,
  revokeConferenceTicketCode,
  redeemConferenceTicketCode,
  registerFreeConferenceTicket,
  checkInToConference,
  validateConferenceTicketCode,
} from "./conferenceTickets";
export {
  ensureNetworkingProfile,
  setNetworkingEnabled,
  recordConferenceSwipe,
  undoConferenceSwipe,
} from "./conferenceNetworking";

export { onUserCreated } from "./triggers/onUserCreated";
export { syncRolesToClaims } from "./triggers/syncRolesToClaims";
export { onUserReportCreated } from "./triggers/onUserReportCreated";
export { onMatchProfileWrite } from "./triggers/onMatchProfileWrite";
export { scheduledNudgeIncompleteProfiles } from "./triggers/scheduledNudgeIncompleteProfiles";
export { onGraduationApplicationEmail } from "./triggers/onGraduationApplicationEmail";
export { onUserAlumniAdmittedEmail } from "./triggers/onUserAlumniAdmittedEmail";
export { onUserOnboardingWelcomeEmail } from "./triggers/onUserOnboardingWelcomeEmail";
export { scheduledCourseInactiveEmailNudges } from "./triggers/scheduledCourseInactiveEmailNudges";
export {
  onUserBadgeEarnedPush,
  onBadgeDefinitionCreatedPush,
  onDirectMessageCreatedPush,
  onMobileGroupThreadPush,
  onMobileGroupCommentPush,
  onGraduationApplicationCreatedAdminPush,
  onUserReportedAdminPush,
  onEventNeedsApprovalAdminPush,
  onDigitalStudentDmCreatedAdminPush,
  onDigitalStudentDmReplyAdminPush,
  onShopOrderCreatedAdminPush,
  scheduledEventReminderPushes,
  adminSendPushNotification,
  getPushNotificationActivity,
} from "./pushNotifications";

export { setUserRole } from "./callables/setUserRole";
export { setAdminOnly } from "./callables/setAdminOnly";
export { logAnalyticsEvent } from "./callables/logAnalyticsEvent";
export { ingestWebAnalytics } from "./callables/ingestWebAnalytics";
export { getMyWeeklyActivity } from "./callables/getMyWeeklyActivity";
export { markNotificationReadBackend } from "./callables/markNotificationReadBackend";
export { getPhase5DashboardMetrics } from "./callables/getPhase5DashboardMetrics";
export { queryAdminWebAnalyticsEvents } from "./callables/queryAdminWebAnalyticsEvents";
export { queryAdminAnalyticsEventsDateRange } from "./callables/queryAdminAnalyticsEventsDateRange";
export { getAdminMobileAnalyticsDashboard } from "./callables/getAdminMobileAnalyticsDashboard";
export { getAdminMobileAnalyticsRangeSummaries } from "./callables/getAdminMobileAnalyticsRangeSummaries";
export { getAdminUserAnalyticsSummary } from "./callables/getAdminUserAnalyticsSummary";
export { batchGetUserAnalyticsSummaries } from "./callables/batchGetUserAnalyticsSummaries";
export { adminRunDerivedMetricsForUtcRange } from "./callables/adminRunDerivedMetricsForUtcRange";
export { queryAdminExpansionAnalyticsEvents } from "./callables/queryAdminExpansionAnalyticsEvents";
export { onAnalyticsRawEventCreated } from "./analytics/triggers/onAnalyticsRawEventCreated";
export { onExpansionAnalyticsEventCreated } from "./analytics/triggers/onExpansionAnalyticsEventCreated";
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
export { awardCourseModuleBadges } from "./callables/awardCourseModuleBadges";
export { importPptxDeck } from "./callables/importPptxDeck";
export { analyzeLessonSurvey } from "./callables/analyzeLessonSurvey";
export { writeSurveyResponse } from "./callables/writeSurveyResponse";
export { getSurveyIntelligenceReport } from "./callables/getSurveyIntelligenceReport";
export { joinGroup, leaveGroup, deleteMobileGroup } from "./callables/groupMembership";
export {
  adminCreateMobileGroup,
  adminUpdateMobileGroup,
  adminModifyMobileGroupMembers,
  getUserModerationSnapshot,
  moderateUserAccount,
} from "./callables/adminMobileModeration";
export {adminSendTestBrevoEmail} from "./callables/adminSendTestBrevoEmail";
export {
  adminSendTestTransactionalEmail,
  adminListTestEmailTemplates,
} from "./callables/adminSendTestTransactionalEmail";
export {adminSendEventRegistrantEmail} from "./callables/adminSendEventRegistrantEmail";
export {adminSendCustomAnnouncementEmail} from "./callables/adminSendCustomAnnouncementEmail";
export {createStripeCheckoutSession} from "./callables/createStripeCheckoutSession";
export {adminUpdateShopOrderFulfillment} from "./callables/adminUpdateShopOrderFulfillment";
export {stripeWebhook} from "./http/stripeWebhook";
export {mobilePaymentReturn} from "./http/mobilePaymentReturn";

export { onSurveyResponseCreated } from "./analytics/triggers/onSurveyResponseCreated";

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
