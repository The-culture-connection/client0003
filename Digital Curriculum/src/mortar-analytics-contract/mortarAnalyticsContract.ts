/**
 * Canonical Mortar analytics contract (Cloud Functions + Digital Curriculum via Vite alias).
 * Event names are snake_case strings; use ANALYTICS_EVENTS — do not pass raw literals from app code.
 */

import type { WebAnalyticsEventName } from "./webAnalyticsEventRegistry";
export type { WebAnalyticsEventName, AnonymousWebAnalyticsEventName } from "./webAnalyticsEventRegistry";
export {
  WEB_ANALYTICS_EVENTS,
  ALL_WEB_ANALYTICS_EVENT_NAMES,
  ANONYMOUS_WEB_ANALYTICS_EVENT_NAMES,
  isWebAnalyticsEventName,
  isAnonymousWebAnalyticsEventName,
} from "./webAnalyticsEventRegistry";

export const ANALYTICS_SCHEMA_VERSION = 1 as const;

/** Normalized web curriculum events written by `ingestWebAnalytics` */
export const ANALYTICS_WEB_SCHEMA_VERSION = 2 as const;

/** Firestore collection names for the analytics pipeline */
export const ANALYTICS_COLLECTIONS = {
  /** Client + validated server events (canonical pipeline) */
  RAW_EVENTS: "analytics_raw_events",
  /** Aggregated counters / rollups (e.g. daily) — maintained by Functions */
  DAILY_SUMMARIES: "analytics_daily_summaries",
  /** Materialized badge / milestone state per user — maintained by Functions */
  USER_BADGES: "analytics_user_badges",
  /**
   * Normalized web analytics stream (`schema_version` 2) from `ingestWebAnalytics`.
   * Older mixed-shape docs may also live here; query by `schema_version` + `source`.
   */
  LEGACY_EVENTS: "analytics_events",
  /** Phase 4 — per-user rollups (Functions triggers only; not client-writable). */
  USER_ANALYTICS_SUMMARY: "user_analytics_summary",
  /** Phase 4 — global daily aggregates (`{date}` = UTC `YYYY-MM-DD`). */
  DAILY_METRICS: "daily_metrics",
  /** Phase 5 — decision metrics derived from `daily_metrics` only (`{date}` = UTC `YYYY-MM-DD`). */
  DERIVED_METRICS: "derived_metrics",
  /** Phase 4 — per-course aggregates (optional `course_id` on web events). */
  COURSE_ANALYTICS_SUMMARY: "course_analytics_summary",
  /** Phase 4 — single-doc community rollups (`global`). */
  COMMUNITY_ANALYTICS_SUMMARY: "community_analytics_summary",
  /** Expansion mobile raw stream (Flutter `ExpansionAnalytics` → Firestore). */
  EXPANSION_ANALYTICS_EVENTS: "expansion_analytics_events",
  /** Per-group mobile activity (Functions triggers only). */
  COMMUNITY_SUMMARY: "community_summary",
  /** Per-user matching funnel depth (Functions triggers only). */
  MATCHING_SUMMARY: "matching_summary",
  /** Per-job listing engagement (Functions triggers only). */
  JOB_SUMMARY: "job_summary",
  /** Funnel step counters (`auth`, `onboarding`, `matching`, …). */
  FUNNEL_SUMMARY: "funnel_summary",
  /** Friction / error tallies keyed by analytics `event_name`. */
  FRICTION_SUMMARY: "friction_summary",
  /**
   * Phase 6 — awarded badge instances (`user_badges/{uid}/awarded/{badgeId}`).
   * Written only by Cloud Functions.
   */
  USER_BADGE_AWARDS: "user_badges",
  /** Phase 6 — last evaluated progress snapshot per user (Functions only). */
  BADGE_PROGRESS: "badge_progress",
} as const;

/**
 * All first-party event_name values. Keys are SCREAMING_SNAKE (TS); values are snake_case (wire + Firestore).
 * Add new events here only — then extend Zod in `inboundAnalyticsPayload.ts` if client-ingestible.
 */
export const ANALYTICS_EVENTS = {
  PAGE_VIEW: "page_view",
  NAVIGATION_TAB_SELECTED: "navigation_tab_selected",
  CURRICULUM_PAGE_VIEWED: "curriculum_page_viewed",
  LESSON_PLAYER_OPENED: "lesson_player_opened",
  ANALYTICS_DASHBOARD_VIEWED: "analytics_dashboard_viewed",
  COMMUNITY_HUB_VIEWED: "community_hub_viewed",
  DISCUSSIONS_LIST_VIEWED: "discussions_list_viewed",
  DATA_ROOM_VIEWED: "data_room_viewed",
  /** Generic UI interaction when no finer-grained event exists yet */
  UI_INTERACTION: "ui_interaction",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export const ALL_ANALYTICS_EVENT_NAMES: readonly AnalyticsEventName[] =
  Object.values(ANALYTICS_EVENTS) as AnalyticsEventName[];

/** Subset allowed from the authenticated client callable (tight surface). */
export const CLIENT_INGESTIBLE_EVENT_NAMES = [
  ANALYTICS_EVENTS.PAGE_VIEW,
  ANALYTICS_EVENTS.NAVIGATION_TAB_SELECTED,
  ANALYTICS_EVENTS.CURRICULUM_PAGE_VIEWED,
  ANALYTICS_EVENTS.LESSON_PLAYER_OPENED,
  ANALYTICS_EVENTS.ANALYTICS_DASHBOARD_VIEWED,
  ANALYTICS_EVENTS.COMMUNITY_HUB_VIEWED,
  ANALYTICS_EVENTS.DISCUSSIONS_LIST_VIEWED,
  ANALYTICS_EVENTS.DATA_ROOM_VIEWED,
  ANALYTICS_EVENTS.UI_INTERACTION,
] as const;

export type ClientIngestibleEventName = (typeof CLIENT_INGESTIBLE_EVENT_NAMES)[number];

export const SNAKE_CASE_EVENT_NAME_RE = /^[a-z][a-z0-9_]{0,62}$/;

export type AnalyticsPlatform = "web" | "ios" | "android";

/** Sent by the client on each event; normalized server-side */
export interface AnalyticsClientEnvelope {
  platform: AnalyticsPlatform;
  app_version?: string;
  locale?: string;
}

/** Callable request body (no user_id — set from Auth) */
export interface LogAnalyticsEventRequest {
  event_name: ClientIngestibleEventName;
  properties?: Record<string, string | number | boolean | null>;
  client: AnalyticsClientEnvelope;
  session_id?: string;
  dedupe_key?: string;
}

/** Callable `ingestWebAnalytics` — `user_id` is set server-side when authenticated */
export interface IngestWebAnalyticsRequest {
  event_name: WebAnalyticsEventName;
  properties?: Record<string, string | number | boolean | null>;
  client: AnalyticsClientEnvelope;
  session_id?: string;
  screen_session_id?: string | null;
  route_path?: string | null;
  screen_name?: string | null;
  client_timestamp_ms?: number;
  dedupe_key?: string;
}

/** Stored document shape in `analytics_raw_events` */
export interface AnalyticsRawEventDocument {
  schema_version: typeof ANALYTICS_SCHEMA_VERSION;
  event_name: AnalyticsEventName;
  user_id: string;
  created_at: unknown;
  ingested_via: "callable_log_analytics_event" | "system";
  client: AnalyticsClientEnvelope;
  session_id: string | null;
  properties: Record<string, unknown>;
  dedupe_key: string | null;
}

export function isSnakeCaseEventName(name: string): boolean {
  return SNAKE_CASE_EVENT_NAME_RE.test(name);
}

export function isClientIngestibleEventName(name: string): name is ClientIngestibleEventName {
  return (CLIENT_INGESTIBLE_EVENT_NAMES as readonly string[]).includes(name);
}
