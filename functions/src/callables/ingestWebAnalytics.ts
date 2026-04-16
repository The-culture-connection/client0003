/**
 * ingestWebAnalytics — authenticated (or limited anonymous) client → `analytics_events`.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { callableCorsAllowlist } from "../callableCorsAllowlist";
import { ingestWebAnalyticsInboundSchema } from "../analytics/inboundWebAnalyticsPayload";
import { writeWebAnalyticsEvent } from "../analytics/writeWebAnalyticsEvent";
import { isAnonymousWebAnalyticsEventName } from "../analytics/mortarAnalyticsContract";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

function stripClientOverrides(properties: Record<string, unknown>): Record<string, unknown> {
  const next = { ...properties };
  delete next.user_id;
  delete next.server_timestamp;
  return next;
}

export const ingestWebAnalytics = onCall(
  { region: "us-central1", cors: callableCorsAllowlist },
  async (request) => {
    const callerUid = request.auth?.uid ?? null;

    const validationResult = ingestWebAnalyticsInboundSchema.safeParse(request.data);
    if (!validationResult.success) {
      throw new HttpsError(
        "invalid-argument",
        `Invalid analytics payload: ${validationResult.error.message}`
      );
    }

    const body = validationResult.data;

    if (!callerUid && !isAnonymousWebAnalyticsEventName(body.event_name)) {
      throw new HttpsError("unauthenticated", "User must be authenticated for this event");
    }

    const properties = stripClientOverrides(body.properties ?? {});

    try {
      const eventId = await writeWebAnalyticsEvent({
        db,
        event_name: body.event_name,
        user_id: callerUid,
        client: body.client,
        properties,
        session_id: body.session_id ?? null,
        screen_session_id: body.screen_session_id ?? null,
        route_path: body.route_path ?? null,
        screen_name: body.screen_name ?? null,
        client_timestamp_ms: body.client_timestamp_ms ?? null,
        dedupe_key: body.dedupe_key ?? null,
      });

      logger.info(`Web analytics: ${body.event_name} user=${callerUid ?? "anon"} id=${eventId}`);

      return {
        success: true,
        event_id: eventId,
        event_name: body.event_name,
      };
    } catch (error) {
      logger.error("Error ingesting web analytics:", error);
      throw new HttpsError(
        "internal",
        `Failed to ingest event: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);
