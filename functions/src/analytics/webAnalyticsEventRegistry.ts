/**
 * Approved Digital Curriculum (Vite) web analytics event names — snake_case wire values.
 * Add new events here only; keep Zod (`inboundWebAnalyticsPayload.ts`) in sync.
 */

export const WEB_ANALYTICS_EVENTS = {
  SCREEN_SESSION_STARTED: "screen_session_started",
  SCREEN_SESSION_ENDED: "screen_session_ended",
  LOGIN_SUBMIT_ATTEMPTED: "login_submit_attempted",
  LOGIN_SIGN_IN_SUCCEEDED: "login_sign_in_succeeded",
  LOGIN_SIGN_IN_FAILED: "login_sign_in_failed",
  LOGIN_SIGN_UP_SUCCEEDED: "login_sign_up_succeeded",
  LOGIN_PASSWORD_RESET_SUBMITTED: "login_password_reset_submitted",
  LOGIN_PASSWORD_RESET_SUCCEEDED: "login_password_reset_succeeded",
  ONBOARDING_STEP_VIEWED: "onboarding_step_viewed",
  ONBOARDING_PARTIAL_SAVE_SUCCEEDED: "onboarding_partial_save_succeeded",
  ONBOARDING_SKIP_CLICKED: "onboarding_skip_clicked",
  ONBOARDING_FINAL_SAVE_SUCCEEDED: "onboarding_final_save_succeeded",
  ONBOARDING_COMPLETION_VIEWED: "onboarding_completion_viewed",
  NAV_LINK_CLICKED: "nav_link_clicked",
  DASHBOARD_CONTINUE_LEARNING_CLICKED: "dashboard_continue_learning_clicked",
  CURRICULUM_COURSE_CARD_CLICKED: "curriculum_course_card_clicked",
  COURSE_DETAIL_START_LESSON_CLICKED: "course_detail_start_lesson_clicked",
  LESSON_PLAYER_MISSING_QUERY_PARAMS: "lesson_player_missing_query_params",
  LESSON_SLIDE_NEXT_CLICKED: "lesson_slide_next_clicked",
  LESSON_SLIDE_PREVIOUS_CLICKED: "lesson_slide_previous_clicked",
  LESSON_CLOSE_CLICKED: "lesson_close_clicked",
  LESSON_QUIZ_VIEW_OPENED: "lesson_quiz_view_opened",
  LESSON_QUIZ_SUBMIT_CLICKED: "lesson_quiz_submit_clicked",
  LESSON_QUIZ_PASSED: "lesson_quiz_passed",
  LESSON_QUIZ_FAILED: "lesson_quiz_failed",
  LESSON_QUIZ_TRY_AGAIN_CLICKED: "lesson_quiz_try_again_clicked",
  LESSON_QUIZ_EXHAUSTED_VIEWED: "lesson_quiz_exhausted_viewed",
  LESSON_SURVEY_SUBMIT_CLICKED: "lesson_survey_submit_clicked",
  LESSON_COURSE_COMPLETED: "lesson_course_completed",
  LESSON_CERTIFICATE_CREATED: "lesson_certificate_created",
  LESSON_PLAYER_LOAD_FAILED: "lesson_player_load_failed",
  LESSON_PLAYER_EMPTY_CONTENT_VIEWED: "lesson_player_empty_content_viewed",
  AUTH_GUARD_REDIRECT_UNAUTHENTICATED: "auth_guard_redirect_unauthenticated",
  ONBOARDING_GATE_REDIRECT_INCOMPLETE_PROFILE: "onboarding_gate_redirect_incomplete_profile",
  ROLE_GATE_REDIRECT_DENIED: "role_gate_redirect_denied",
  DASHBOARD_CONTINUE_URL_INVALID: "dashboard_continue_url_invalid",
  SHOP_FILTER_CHANGED: "shop_filter_changed",
  SHOP_SIZE_CHANGED: "shop_size_changed",
  SHOP_ADD_TO_CART_CLICKED: "shop_add_to_cart_clicked",
  SHOP_ADD_TO_CART_FAILED: "shop_add_to_cart_failed",
  CART_DROPDOWN_TOGGLED: "cart_dropdown_toggled",
  CART_LINE_REMOVE_CLICKED: "cart_line_remove_clicked",
  CART_CONTINUE_TO_SHOP_CLICKED: "cart_continue_to_shop_clicked",
  COMMUNITY_DISCUSSION_PREVIEW_CLICKED: "community_discussion_preview_clicked",
  COMMUNITY_START_DISCUSSION_CLICKED: "community_start_discussion_clicked",
  DISCUSSION_CREATE_SUBMIT_CLICKED: "discussion_create_submit_clicked",
  DISCUSSION_REPLY_SUBMIT_CLICKED: "discussion_reply_submit_clicked",
  DISCUSSION_LIKE_TOGGLED: "discussion_like_toggled",
  DISCUSSION_CREATE_FAILED: "discussion_create_failed",
  MORTAR_DM_MESSAGE_SENT: "mortar_dm_message_sent",
  GROUP_MESSAGE_SEND_CLICKED: "group_message_send_clicked",
  GROUP_JOIN_CLICKED: "group_join_clicked",
  GROUP_JOIN_FAILED: "group_join_failed",
  EVENT_REGISTER_FAILED: "event_register_failed",
} as const;

export type WebAnalyticsEventName = (typeof WEB_ANALYTICS_EVENTS)[keyof typeof WEB_ANALYTICS_EVENTS];

export const ALL_WEB_ANALYTICS_EVENT_NAMES: readonly WebAnalyticsEventName[] = Object.values(
  WEB_ANALYTICS_EVENTS
) as WebAnalyticsEventName[];

const webEventNameSet = new Set<string>(ALL_WEB_ANALYTICS_EVENT_NAMES);

export function isWebAnalyticsEventName(name: string): name is WebAnalyticsEventName {
  return webEventNameSet.has(name);
}

/** Callable allowed without Firebase Auth (pre-sign-in funnel + screen boundaries). */
export const ANONYMOUS_WEB_ANALYTICS_EVENT_NAMES = [
  WEB_ANALYTICS_EVENTS.SCREEN_SESSION_STARTED,
  WEB_ANALYTICS_EVENTS.SCREEN_SESSION_ENDED,
  WEB_ANALYTICS_EVENTS.LOGIN_SUBMIT_ATTEMPTED,
  WEB_ANALYTICS_EVENTS.LOGIN_SIGN_IN_FAILED,
  WEB_ANALYTICS_EVENTS.LOGIN_PASSWORD_RESET_SUBMITTED,
  WEB_ANALYTICS_EVENTS.LOGIN_PASSWORD_RESET_SUCCEEDED,
] as const;

export type AnonymousWebAnalyticsEventName = (typeof ANONYMOUS_WEB_ANALYTICS_EVENT_NAMES)[number];

const anonymousSet = new Set<string>(ANONYMOUS_WEB_ANALYTICS_EVENT_NAMES);

export function isAnonymousWebAnalyticsEventName(name: string): name is AnonymousWebAnalyticsEventName {
  return anonymousSet.has(name);
}
