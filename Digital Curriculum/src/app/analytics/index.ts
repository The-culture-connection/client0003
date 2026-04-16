/**
 * Public analytics API for the Digital Curriculum (Vite) app.
 * Use `mortarWebAnalytics` for typed intents; avoid raw `event_name` strings in feature code.
 */

export {
  ANALYTICS_EVENTS,
  WEB_ANALYTICS_EVENTS,
  ANALYTICS_COLLECTIONS,
  ANALYTICS_SCHEMA_VERSION,
  type AnalyticsEventName,
  type WebAnalyticsEventName,
  type ClientIngestibleEventName,
  type LogAnalyticsEventRequest,
  type AnalyticsRawEventDocument,
} from "@mortar/analytics-contract/mortarAnalyticsContract";

export { trackClientAnalyticsEvent } from "./client";
export { getOrCreateAnalyticsSessionId } from "./session";
export { mortarWebAnalytics } from "./intents";
export { trackEvent, type TrackEventProperties, type TrackEventOptions } from "./trackEvent";
export { useScreenAnalytics } from "./useScreenAnalytics";
export {
  beginScreenSessionForAnalytics,
  endScreenSessionForAnalytics,
  getActiveScreenSessionId,
  getActiveScreenName,
} from "./screenSession";
