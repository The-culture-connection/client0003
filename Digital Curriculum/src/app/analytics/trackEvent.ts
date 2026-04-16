/**
 * Reusable web analytics: default metadata, dev logging, failures never throw to callers.
 */

import { httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import { functions } from "../lib/firebase";
import type { IngestWebAnalyticsRequest } from "@mortar/analytics-contract/mortarAnalyticsContract";
import type { WebAnalyticsEventName } from "@mortar/analytics-contract/mortarAnalyticsContract";
import { getOrCreateAnalyticsSessionId } from "./session";
import { getActiveScreenName, getActiveScreenSessionId } from "./screenSession";
import { prepareIngestWebAnalyticsRequest } from "./prepareIngestPayload";

const ingestFn = httpsCallable(functions, "ingestWebAnalytics");

export type TrackEventProperties = Record<string, string | number | boolean | null>;

export interface TrackEventOptions {
  /** Override auto-detected screen name (defaults to active screen session label). */
  screen_name?: string | null;
  /** Do not attach the active `screen_session_id` (used internally for session lifecycle events). */
  omit_screen_session?: boolean;
  /** Force this screen session id (rare; prefer screen session hook). */
  screen_session_id?: string | null;
  dedupe_key?: string;
}

function devLog(payload: unknown) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[mortar:analytics:trackEvent]", payload);
  }
}

/**
 * Send an approved web analytics event with default metadata:
 * `user_id` (server from Auth), `route_path`, `screen_name`, `client_timestamp_ms`, `session_id`,
 * and `screen_session_id` when a screen session is active.
 */
export function trackEvent(
  event_name: WebAnalyticsEventName,
  properties?: TrackEventProperties,
  options?: TrackEventOptions
): void {
  const auth = getAuth();
  const uid = auth.currentUser?.uid ?? null;
  const route_path =
    typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : null;
  const screen_name = options?.screen_name ?? getActiveScreenName();
  const screen_session_id =
    options?.omit_screen_session === true
      ? null
      : (options?.screen_session_id ?? getActiveScreenSessionId());

  const mergedProps: TrackEventProperties = {
    ...(properties ?? {}),
  };

  const body: IngestWebAnalyticsRequest = {
    event_name,
    properties: mergedProps,
    client: {
      platform: "web",
      locale: typeof navigator !== "undefined" ? navigator.language : undefined,
    },
    session_id: getOrCreateAnalyticsSessionId(),
    screen_session_id,
    route_path,
    screen_name: screen_name ?? null,
    client_timestamp_ms: Date.now(),
    dedupe_key: options?.dedupe_key,
  };

  devLog({ ...body, client_user_hint: uid });

  void (async () => {
    try {
      await ingestFn(prepareIngestWebAnalyticsRequest(body));
    } catch (e) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn("[mortar:analytics:trackEvent_failed]", event_name, e);
      }
    }
  })();
}
