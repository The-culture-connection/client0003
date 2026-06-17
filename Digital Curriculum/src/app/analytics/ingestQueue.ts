/**
 * Serializes ingestWebAnalytics calls so bursts do not exhaust browser connection slots
 * (net::ERR_INSUFFICIENT_RESOURCES). Dedupes identical payloads within a short window.
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import type { IngestWebAnalyticsRequest } from "@mortar/analytics-contract/mortarAnalyticsContract";
import { prepareIngestWebAnalyticsRequest } from "./prepareIngestPayload";

const ingestFn = httpsCallable(functions, "ingestWebAnalytics");

const MAX_IN_FLIGHT = 3;
const DEDUPE_WINDOW_MS = 2000;
// Retry transient ingest failures (network blips, exhausted connection slots) so analytics
// events aren't silently dropped — which would make reports under-count. Bounded so a hard
// outage can't grow the queue unboundedly.
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 1000;

let inFlight = 0;
const queue: Array<() => Promise<void>> = [];
const recentKeys = new Map<string, number>();

function dedupeKey(body: IngestWebAnalyticsRequest): string {
  const dk = body.dedupe_key ?? "";
  return `${body.event_name}|${dk}|${body.route_path ?? ""}|${body.screen_session_id ?? ""}`;
}

function shouldSkipDuplicate(body: IngestWebAnalyticsRequest): boolean {
  const key = dedupeKey(body);
  const now = Date.now();
  const last = recentKeys.get(key);
  if (last != null && now - last < DEDUPE_WINDOW_MS) return true;
  recentKeys.set(key, now);
  if (recentKeys.size > 200) {
    for (const [k, t] of recentKeys) {
      if (now - t > DEDUPE_WINDOW_MS) recentKeys.delete(k);
    }
  }
  return false;
}

function drain(): void {
  while (inFlight < MAX_IN_FLIGHT && queue.length > 0) {
    const job = queue.shift();
    if (!job) break;
    inFlight += 1;
    void job().finally(() => {
      inFlight -= 1;
      drain();
    });
  }
}

/**
 * Enqueue a prepared ingest request. Never throws to callers.
 */
export function enqueueIngestWebAnalytics(body: IngestWebAnalyticsRequest): void {
  if (shouldSkipDuplicate(body)) return;

  queue.push(async () => {
    const payload = prepareIngestWebAnalyticsRequest(body);
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await ingestFn(payload);
        return;
      } catch (e) {
        if (attempt === MAX_RETRIES) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn("[mortar:analytics:ingest_failed]", body.event_name, e);
          }
          return;
        }
        // Linear backoff before retrying the transient failure.
        await new Promise((resolve) => setTimeout(resolve, RETRY_BASE_MS * (attempt + 1)));
      }
    }
  });
  drain();
}
