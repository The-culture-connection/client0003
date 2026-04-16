/**
 * Phase 4 — materialize `user_analytics_summary`, `daily_metrics`, course/community summaries
 * from normalized web `analytics_events` (Admin + triggers only; never from UI state).
 */

import { FieldValue, Firestore, Timestamp } from "firebase-admin/firestore";
import { ANALYTICS_COLLECTIONS, ANALYTICS_WEB_SCHEMA_VERSION } from "../mortarAnalyticsContract";
import { WEB_ANALYTICS_EVENTS } from "../webAnalyticsEventRegistry";

export function utcYyyyMmDd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function previousUtcYyyyMmDd(day: string): string {
  const [y, mo, da] = day.split("-").map((n) => parseInt(n, 10));
  const d = new Date(Date.UTC(y, mo - 1, da));
  d.setUTCDate(d.getUTCDate() - 1);
  return utcYyyyMmDd(d);
}

interface RollupDelta {
  /** Incremented on `user_analytics_summary` counts (authenticated users only). */
  userCounter: string | null;
  dailyCounter: string | null;
  communityCounter: string | null;
  courseCounter: "lessons_started" | "lessons_completed" | "quizzes_passed" | "quizzes_failed" | null;
  /** Also bump `cart_add_to_cart` for dashboards that predate `shop_add_to_cart_clicked`. */
  alsoLegacyCartAdd?: boolean;
}

function rollupDeltaForEventName(eventName: string): RollupDelta | null {
  switch (eventName) {
  case WEB_ANALYTICS_EVENTS.COURSE_DETAIL_START_LESSON_CLICKED:
  case WEB_ANALYTICS_EVENTS.CURRICULUM_CONTINUE_CLICKED:
  case WEB_ANALYTICS_EVENTS.DASHBOARD_CONTINUE_LEARNING_CLICKED:
    return {
      userCounter: "lessons_started",
      dailyCounter: "lessons_started",
      communityCounter: null,
      courseCounter: "lessons_started",
    };
  case WEB_ANALYTICS_EVENTS.CURRICULUM_COURSE_CARD_CLICKED:
    return {
      userCounter: "curriculum_course_card_clicks",
      dailyCounter: "curriculum_course_card_clicks",
      communityCounter: null,
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.COMMUNITY_DISCUSSION_PREVIEW_CLICKED:
    return {
      userCounter: "community_discussion_preview_clicked",
      dailyCounter: "community_discussion_preview_clicked",
      communityCounter: "community_discussion_preview_clicked",
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.COMMUNITY_START_DISCUSSION_CLICKED:
    return {
      userCounter: "community_start_discussion_clicked",
      dailyCounter: "community_start_discussion_clicked",
      communityCounter: "community_start_discussion_clicked",
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.COMMUNITY_HERO_RSVP_CLICKED:
    return {
      userCounter: "community_hero_rsvp_clicked",
      dailyCounter: "community_hero_rsvp_clicked",
      communityCounter: "community_hero_rsvp_clicked",
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.LESSON_COURSE_COMPLETED:
    return {
      userCounter: "lessons_completed",
      dailyCounter: "lessons_completed",
      communityCounter: null,
      courseCounter: "lessons_completed",
    };
  case WEB_ANALYTICS_EVENTS.LESSON_QUIZ_PASSED:
    return {
      userCounter: "quizzes_passed",
      dailyCounter: "quizzes_passed",
      communityCounter: null,
      courseCounter: "quizzes_passed",
    };
  case WEB_ANALYTICS_EVENTS.LESSON_QUIZ_FAILED:
    return {
      userCounter: "quizzes_failed",
      dailyCounter: "quizzes_failed",
      communityCounter: null,
      courseCounter: "quizzes_failed",
    };
  case WEB_ANALYTICS_EVENTS.DISCUSSION_CREATE_SUBMIT_CLICKED:
    return {
      userCounter: "discussions_created",
      dailyCounter: "discussions_created",
      communityCounter: "discussions_created",
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.DISCUSSION_REPLY_SUBMIT_CLICKED:
    return {
      userCounter: "discussion_replies",
      dailyCounter: "discussion_replies",
      communityCounter: "discussion_replies",
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.MORTAR_DM_MESSAGE_SENT:
    return {
      userCounter: "dms_sent",
      dailyCounter: "dms_sent",
      communityCounter: "dms_sent",
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.GROUP_JOIN_CLICKED:
    return {
      userCounter: "groups_joined",
      dailyCounter: "groups_joined",
      communityCounter: "groups_joined",
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.EVENT_REGISTER_CLICKED:
    return {
      userCounter: "event_registrations",
      dailyCounter: "event_registrations",
      communityCounter: "event_registrations",
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.EVENT_UNREGISTER_CLICKED:
    return {
      userCounter: "event_unregistrations",
      dailyCounter: "event_unregistrations",
      communityCounter: "event_unregistrations",
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.SHOP_ADD_TO_CART_CLICKED:
    return {
      userCounter: "shop_add_to_cart_clicked",
      dailyCounter: "shop_add_to_cart_clicked",
      communityCounter: null,
      courseCounter: null,
      alsoLegacyCartAdd: true,
    };
  case WEB_ANALYTICS_EVENTS.CART_LINE_REMOVE_CLICKED:
    return {
      userCounter: "cart_line_remove",
      dailyCounter: "cart_line_remove",
      communityCounter: null,
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.NOTIFICATION_ITEM_CLICKED:
    return {
      userCounter: "notification_item_clicked",
      dailyCounter: "notification_item_clicked",
      communityCounter: null,
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.NOTIFICATION_MARK_READ_BACKEND:
    return {
      userCounter: "notification_mark_read_backend",
      dailyCounter: "notification_mark_read_backend",
      communityCounter: null,
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.ONBOARDING_NUDGE_SENT:
    return {
      userCounter: "onboarding_nudges_sent",
      dailyCounter: "onboarding_nudges_sent",
      communityCounter: null,
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.ADMIN_COURSE_BUILDER_SAVE_CLICKED:
    return {
      userCounter: "admin_course_builder_save_clicked",
      dailyCounter: "admin_course_builder_save_clicked",
      communityCounter: null,
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.ADMIN_LESSON_DECK_PUBLISH_CLICKED:
    return {
      userCounter: "admin_lesson_deck_publish_clicked",
      dailyCounter: "admin_lesson_deck_publish_clicked",
      communityCounter: null,
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.ADMIN_EVENT_CREATE_SUBMITTED:
    return {
      userCounter: "admin_event_create_submitted",
      dailyCounter: "admin_event_create_submitted",
      communityCounter: null,
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.ADMIN_SHOP_ITEM_CREATED:
    return {
      userCounter: "admin_shop_item_created",
      dailyCounter: "admin_shop_item_created",
      communityCounter: null,
      courseCounter: null,
    };

  // --- Goal-oriented rollups (B1 shop, B2 community depth, B3/B4 learning, B5 friction, B6 auth/onboarding) ---
  case WEB_ANALYTICS_EVENTS.SHOP_FILTER_CHANGED:
    return { userCounter: "shop_filter_changed", dailyCounter: "shop_filter_changed", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.SHOP_SIZE_CHANGED:
    return { userCounter: "shop_size_changed", dailyCounter: "shop_size_changed", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.SHOP_ADD_TO_CART_FAILED:
    return { userCounter: "shop_add_to_cart_failed", dailyCounter: "shop_add_to_cart_failed", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.CART_DROPDOWN_TOGGLED:
    return { userCounter: "cart_dropdown_toggled", dailyCounter: "cart_dropdown_toggled", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.CART_CONTINUE_TO_SHOP_CLICKED:
    return { userCounter: "cart_continue_to_shop_clicked", dailyCounter: "cart_continue_to_shop_clicked", communityCounter: null, courseCounter: null };

  case WEB_ANALYTICS_EVENTS.DISCUSSION_LIKE_TOGGLED:
    return {
      userCounter: "discussion_like_toggled",
      dailyCounter: "discussion_like_toggled",
      communityCounter: "discussion_like_toggled",
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.GROUP_MESSAGE_SEND_CLICKED:
    return {
      userCounter: "group_message_send_clicked",
      dailyCounter: "group_message_send_clicked",
      communityCounter: "group_message_send_clicked",
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.DISCUSSION_CATEGORY_SELECTED:
    return {
      userCounter: "discussion_category_selected",
      dailyCounter: "discussion_category_selected",
      communityCounter: "discussion_category_selected",
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.DISCUSSION_DRAFT_NEXT_CLICKED:
    return {
      userCounter: "discussion_draft_next_clicked",
      dailyCounter: "discussion_draft_next_clicked",
      communityCounter: "discussion_draft_next_clicked",
      courseCounter: null,
    };
  case WEB_ANALYTICS_EVENTS.MORTAR_DM_REPLY_THREAD_SELECTED:
    return {
      userCounter: "mortar_dm_reply_thread_selected",
      dailyCounter: "mortar_dm_reply_thread_selected",
      communityCounter: "mortar_dm_reply_thread_selected",
      courseCounter: null,
    };

  case WEB_ANALYTICS_EVENTS.LESSON_SLIDE_NEXT_CLICKED:
    return { userCounter: "lesson_slide_next_clicked", dailyCounter: "lesson_slide_next_clicked", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.LESSON_SLIDE_PREVIOUS_CLICKED:
    return { userCounter: "lesson_slide_previous_clicked", dailyCounter: "lesson_slide_previous_clicked", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.LESSON_QUIZ_VIEW_OPENED:
    return { userCounter: "lesson_quiz_view_opened", dailyCounter: "lesson_quiz_view_opened", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.LESSON_QUIZ_SUBMIT_CLICKED:
    return { userCounter: "lesson_quiz_submit_clicked", dailyCounter: "lesson_quiz_submit_clicked", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.LESSON_QUIZ_TRY_AGAIN_CLICKED:
    return { userCounter: "lesson_quiz_try_again_clicked", dailyCounter: "lesson_quiz_try_again_clicked", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.LESSON_QUIZ_EXHAUSTED_VIEWED:
    return { userCounter: "lesson_quiz_exhausted_viewed", dailyCounter: "lesson_quiz_exhausted_viewed", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.LESSON_QUIZ_ANSWER_SELECTED:
    return { userCounter: "lesson_quiz_answer_selected", dailyCounter: "lesson_quiz_answer_selected", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.LESSON_SURVEY_FIELD_CHANGED:
    return { userCounter: "lesson_survey_field_changed", dailyCounter: "lesson_survey_field_changed", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.LESSON_SURVEY_SUBMIT_CLICKED:
    return { userCounter: "lesson_survey_submit_clicked", dailyCounter: "lesson_survey_submit_clicked", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.LESSON_CLOSE_CLICKED:
    return { userCounter: "lesson_close_clicked", dailyCounter: "lesson_close_clicked", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.LESSON_CERTIFICATE_CREATED:
    return { userCounter: "lesson_certificate_created", dailyCounter: "lesson_certificate_created", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.COURSE_DETAIL_MODULE_EXPAND_TOGGLED:
    return { userCounter: "course_detail_module_expand_toggled", dailyCounter: "course_detail_module_expand_toggled", communityCounter: null, courseCounter: null };

  case WEB_ANALYTICS_EVENTS.AUTH_GUARD_REDIRECT_UNAUTHENTICATED:
    return { userCounter: "auth_guard_redirect_unauthenticated", dailyCounter: "auth_guard_redirect_unauthenticated", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.ONBOARDING_GATE_REDIRECT_INCOMPLETE_PROFILE:
    return { userCounter: "onboarding_gate_redirect_incomplete_profile", dailyCounter: "onboarding_gate_redirect_incomplete_profile", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.ROLE_GATE_REDIRECT_DENIED:
    return { userCounter: "role_gate_redirect_denied", dailyCounter: "role_gate_redirect_denied", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.DASHBOARD_CONTINUE_URL_INVALID:
    return { userCounter: "dashboard_continue_url_invalid", dailyCounter: "dashboard_continue_url_invalid", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.LESSON_PLAYER_MISSING_QUERY_PARAMS:
    return { userCounter: "lesson_player_missing_query_params", dailyCounter: "lesson_player_missing_query_params", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.LESSON_PLAYER_LOAD_FAILED:
    return { userCounter: "lesson_player_load_failed", dailyCounter: "lesson_player_load_failed", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.LESSON_PLAYER_EMPTY_CONTENT_VIEWED:
    return { userCounter: "lesson_player_empty_content_viewed", dailyCounter: "lesson_player_empty_content_viewed", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.DISCUSSION_CREATE_FAILED:
    return { userCounter: "discussion_create_failed", dailyCounter: "discussion_create_failed", communityCounter: "discussion_create_failed", courseCounter: null };
  case WEB_ANALYTICS_EVENTS.GROUP_JOIN_FAILED:
    return { userCounter: "group_join_failed", dailyCounter: "group_join_failed", communityCounter: "group_join_failed", courseCounter: null };
  case WEB_ANALYTICS_EVENTS.EVENT_REGISTER_FAILED:
    return { userCounter: "event_register_failed", dailyCounter: "event_register_failed", communityCounter: "event_register_failed", courseCounter: null };

  case WEB_ANALYTICS_EVENTS.LOGIN_SUBMIT_ATTEMPTED:
    return { userCounter: "login_submit_attempted", dailyCounter: "login_submit_attempted", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.LOGIN_SIGN_IN_FAILED:
    return { userCounter: "login_sign_in_failed", dailyCounter: "login_sign_in_failed", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.ONBOARDING_STEP_VIEWED:
    return { userCounter: "onboarding_step_viewed", dailyCounter: "onboarding_step_viewed", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.ONBOARDING_PARTIAL_SAVE_SUCCEEDED:
    return { userCounter: "onboarding_partial_save_succeeded", dailyCounter: "onboarding_partial_save_succeeded", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.ONBOARDING_SKIP_CLICKED:
    return { userCounter: "onboarding_skip_clicked", dailyCounter: "onboarding_skip_clicked", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.ONBOARDING_COMPLETION_VIEWED:
    return { userCounter: "onboarding_completion_viewed", dailyCounter: "onboarding_completion_viewed", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.NAV_LINK_CLICKED:
    return { userCounter: "nav_link_clicked", dailyCounter: "nav_link_clicked", communityCounter: null, courseCounter: null };

  case WEB_ANALYTICS_EVENTS.SCREEN_SESSION_STARTED:
    return { userCounter: "screen_session_started", dailyCounter: "screen_session_started", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.SCREEN_SESSION_ENDED:
    return { userCounter: "screen_session_ended", dailyCounter: "screen_session_ended", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.DASHBOARD_PASSIVE_TIME_ON_SCREEN:
    return { userCounter: "dashboard_passive_time_on_screen", dailyCounter: "dashboard_passive_time_on_screen", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.DATA_ROOM_FILE_SEARCH_CHANGED:
    return { userCounter: "data_room_file_search_changed", dailyCounter: "data_room_file_search_changed", communityCounter: null, courseCounter: null };
  case WEB_ANALYTICS_EVENTS.DISCUSSIONS_SEARCH_CHANGED:
    return { userCounter: "discussions_search_changed", dailyCounter: "discussions_search_changed", communityCounter: null, courseCounter: null };

  default:
    return null;
  }
}

function readCourseId(properties: Record<string, unknown> | undefined): string | null {
  const v = properties?.course_id;
  return typeof v === "string" && v.length > 0 ? v : null;
}

function addIncrementCount(target: Record<string, unknown>, key: string): void {
  const prevCounts =
    target.counts && typeof target.counts === "object" && !Array.isArray(target.counts)
      ? (target.counts as Record<string, unknown>)
      : {};
  target.counts = {
    ...prevCounts,
    [key]: FieldValue.increment(1),
  };
}

/**
 * Apply rollups for one new `analytics_events` document (normalized web schema v2).
 */
export async function applyPhase4RollupsForWebEvent(
  db: Firestore,
  data: Record<string, unknown>
): Promise<void> {
  if (data.schema_version !== ANALYTICS_WEB_SCHEMA_VERSION) return;
  const uid = typeof data.user_id === "string" && data.user_id.length > 0 ? data.user_id : null;
  if (!uid) return;

  const eventName = typeof data.event_name === "string" ? data.event_name : "";
  const delta = rollupDeltaForEventName(eventName);
  const properties =
    data.properties && typeof data.properties === "object" && !Array.isArray(data.properties)
      ? (data.properties as Record<string, unknown>)
      : undefined;
  const courseId = readCourseId(properties);

  const now = new Date();
  const todayKey = utcYyyyMmDd(now);
  const yesterdayKey = previousUtcYyyyMmDd(todayKey);

  const userRef = db.collection(ANALYTICS_COLLECTIONS.USER_ANALYTICS_SUMMARY).doc(uid);
  const dailyRef = db.collection(ANALYTICS_COLLECTIONS.DAILY_METRICS).doc(todayKey);
  const communityRef = db.collection(ANALYTICS_COLLECTIONS.COMMUNITY_ANALYTICS_SUMMARY).doc("global");

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const prev = snap.exists ? (snap.data() as Record<string, unknown>) : {};

    const lastAct = typeof prev.last_activity_utc_date === "string" ? prev.last_activity_utc_date : undefined;
    const firstTouchToday = lastAct !== todayKey;

    const patch: Record<string, unknown> = {
      schema_version: 1,
      user_id: uid,
      updated_at: FieldValue.serverTimestamp(),
      last_active_at: FieldValue.serverTimestamp(),
    };

    if (firstTouchToday) {
      const prevStreak = typeof prev.streak_days === "number" ? prev.streak_days : 0;
      const prevBest = typeof prev.best_streak_days === "number" ? prev.best_streak_days : 0;
      const newStreak = lastAct === yesterdayKey ? prevStreak + 1 : 1;
      const newBest = Math.max(prevBest, newStreak);
      patch.last_activity_utc_date = todayKey;
      patch.streak_days = newStreak;
      patch.best_streak_days = newBest;
    }

    if (delta?.userCounter) addIncrementCount(patch, delta.userCounter);
    if (delta?.alsoLegacyCartAdd) {
      addIncrementCount(patch, "cart_add_to_cart");
    }

    const dailyPatch: Record<string, unknown> = {
      schema_version: 1,
      date_utc: todayKey,
      updated_at: FieldValue.serverTimestamp(),
      total_web_events: FieldValue.increment(1),
    };

    if (firstTouchToday) {
      dailyPatch.dau = FieldValue.increment(1);
    }

    if (eventName === WEB_ANALYTICS_EVENTS.LOGIN_SIGN_UP_SUCCEEDED) {
      if (!prev.signup_counted_at) {
        patch.signup_counted_at = FieldValue.serverTimestamp();
        addIncrementCount(patch, "signups");
        addIncrementCount(dailyPatch, "signups");
      }
    } else if (eventName === WEB_ANALYTICS_EVENTS.LOGIN_SIGN_IN_SUCCEEDED) {
      addIncrementCount(patch, "login_sign_ins");
      addIncrementCount(dailyPatch, "login_sign_ins");
    } else if (eventName === WEB_ANALYTICS_EVENTS.ONBOARDING_FINAL_SAVE_SUCCEEDED) {
      if (!prev.onboarding_completed_at) {
        patch.onboarding_completed_at = FieldValue.serverTimestamp();
        addIncrementCount(patch, "onboarding_completions");
        addIncrementCount(dailyPatch, "onboarding_completions");
      }
    } else if (delta?.dailyCounter) {
      addIncrementCount(dailyPatch, delta.dailyCounter);
    }

    if (delta?.alsoLegacyCartAdd) {
      addIncrementCount(dailyPatch, "cart_add_to_cart");
    }

    tx.set(userRef, patch, { merge: true });
    tx.set(dailyRef, dailyPatch, { merge: true });

    if (delta?.communityCounter) {
      const cPatch: Record<string, unknown> = {
        schema_version: 1,
        updated_at: FieldValue.serverTimestamp(),
      };
      addIncrementCount(cPatch, delta.communityCounter);
      tx.set(communityRef, cPatch, { merge: true });
    }

    if (courseId && delta?.courseCounter) {
      const courseRef = db.collection(ANALYTICS_COLLECTIONS.COURSE_ANALYTICS_SUMMARY).doc(courseId);
      const coPatch: Record<string, unknown> = {
        schema_version: 1,
        course_id: courseId,
        updated_at: FieldValue.serverTimestamp(),
      };
      addIncrementCount(coPatch, delta.courseCounter);
      tx.set(courseRef, coPatch, { merge: true });
    }
  });
}

/**
 * Finalize derived metrics on `daily_metrics/{date}` after the UTC day is complete.
 */
export async function writePhase4DerivedMetricsForDay(
  db: Firestore,
  dateUtc: string
): Promise<void> {
  const ref = db.collection(ANALYTICS_COLLECTIONS.DAILY_METRICS).doc(dateUtc);
  const snap = await ref.get();
  if (!snap.exists) return;

  const d = snap.data() as Record<string, unknown>;
  const counts = (d.counts && typeof d.counts === "object" ? d.counts : {}) as Record<string, unknown>;
  const qp = typeof counts.quizzes_passed === "number" ? counts.quizzes_passed : 0;
  const qf = typeof counts.quizzes_failed === "number" ? counts.quizzes_failed : 0;
  const denom = qp + qf;
  const quizPassRate = denom > 0 ? qp / denom : null;

  const dau = typeof d.dau === "number" ? d.dau : 0;

  await ref.set(
    {
      updated_at: FieldValue.serverTimestamp(),
      derived: {
        derived_daily_active_user: dau,
        derived_quiz_pass_rate: quizPassRate,
        derived_course_progress_pct: null,
        derived_lesson_completion_latency_ms: null,
        derived_cart_abandonment_24h: null,
        derived_computed_at: Timestamp.now(),
      },
    },
    { merge: true }
  );
}
