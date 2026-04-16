/**
 * Browser → `logAnalyticsEvent` callable. No React imports — call from hooks or non-UI modules.
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import type { LogAnalyticsEventRequest } from "@mortar/analytics-contract/mortarAnalyticsContract";
import { getOrCreateAnalyticsSessionId } from "./session";

const logFn = httpsCallable(functions, "logAnalyticsEvent");

export interface TrackClientAnalyticsInput
  extends Pick<LogAnalyticsEventRequest, "event_name" | "properties" | "dedupe_key"> {}

export async function trackClientAnalyticsEvent(input: TrackClientAnalyticsInput): Promise<void> {
  const session_id = getOrCreateAnalyticsSessionId();
  const locale = typeof navigator !== "undefined" ? navigator.language : undefined;

  await logFn({
    event_name: input.event_name,
    properties: input.properties ?? {},
    client: {
      platform: "web",
      locale,
    },
    session_id,
    dedupe_key: input.dedupe_key,
  });
}
