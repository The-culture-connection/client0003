/**
 * Per-screen analytics session: correlates child events until the screen unmounts or another begins.
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";
import type { IngestWebAnalyticsRequest } from "@mortar/analytics-contract/mortarAnalyticsContract";
import { getOrCreateAnalyticsSessionId } from "./session";
import { prepareIngestWebAnalyticsRequest } from "./prepareIngestPayload";

const ingestFn = httpsCallable(functions, "ingestWebAnalytics");

function newScreenSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

let activeScreenSessionId: string | null = null;
let activeScreenName: string | null = null;

export function getActiveScreenSessionId(): string | null {
  return activeScreenSessionId;
}

export function getActiveScreenName(): string | null {
  return activeScreenName;
}

function devLog(label: string, payload: unknown) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug(`[mortar:analytics:${label}]`, payload);
  }
}

async function sendIngestSafe(body: IngestWebAnalyticsRequest): Promise<void> {
  try {
    await ingestFn(prepareIngestWebAnalyticsRequest(body));
  } catch (e) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[mortar:analytics:ingest_failed]", e);
    }
  }
}

function baseEnvelope(): Pick<IngestWebAnalyticsRequest, "client" | "session_id" | "route_path" | "client_timestamp_ms"> {
  const locale = typeof navigator !== "undefined" ? navigator.language : undefined;
  const route_path =
    typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : null;
  return {
    client: { platform: "web", locale },
    session_id: getOrCreateAnalyticsSessionId(),
    route_path,
    client_timestamp_ms: Date.now(),
  };
}

/** Fire `screen_session_ended` for the current session (if any) and clear state. */
export function endScreenSessionForAnalytics(): void {
  const sid = activeScreenSessionId;
  const name = activeScreenName;
  activeScreenSessionId = null;
  activeScreenName = null;
  if (!sid) return;

  const payload: IngestWebAnalyticsRequest = {
    ...baseEnvelope(),
    event_name: WEB_ANALYTICS_EVENTS.SCREEN_SESSION_ENDED,
    screen_session_id: sid,
    screen_name: name,
    properties: { screen_name: name ?? null },
  };
  devLog("screen_session_ended", payload);
  void sendIngestSafe(payload);
}

/** End any previous screen session, then start a new one and emit `screen_session_started`. */
export function beginScreenSessionForAnalytics(screenName: string): void {
  endScreenSessionForAnalytics();
  const sid = newScreenSessionId();
  activeScreenSessionId = sid;
  activeScreenName = screenName;

  const payload: IngestWebAnalyticsRequest = {
    ...baseEnvelope(),
    event_name: WEB_ANALYTICS_EVENTS.SCREEN_SESSION_STARTED,
    screen_session_id: sid,
    screen_name: screenName,
    properties: { screen_name: screenName },
  };
  devLog("screen_session_started", payload);
  void sendIngestSafe(payload);
}
