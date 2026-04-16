/**
 * logAnalyticsEvent — authenticated client → canonical `analytics_raw_events` stream.
 * Validates with Zod; rejects malformed payloads. No raw event_name strings server-side — use shared contract in clients.
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {callableCorsAllowlist} from "../callableCorsAllowlist";
import {logAnalyticsEventInboundSchema} from "../analytics/inboundAnalyticsPayload";
import {writeRawAnalyticsEvent} from "../analytics/writeRawAnalyticsEvent";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

export const logAnalyticsEvent = onCall(
  {region: "us-central1", cors: callableCorsAllowlist},
  async (request) => {
    const callerUid = request.auth?.uid;

    if (!callerUid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const validationResult = logAnalyticsEventInboundSchema.safeParse(request.data);
    if (!validationResult.success) {
      throw new HttpsError(
        "invalid-argument",
        `Invalid analytics payload: ${validationResult.error.message}`
      );
    }

    const body = validationResult.data;

    try {
      const eventId = await writeRawAnalyticsEvent({
        db,
        event_name: body.event_name,
        user_id: callerUid,
        client: body.client,
        properties: body.properties ?? {},
        session_id: body.session_id ?? null,
        dedupe_key: body.dedupe_key ?? null,
        ingested_via: "callable_log_analytics_event",
      });

      logger.info(`Analytics raw event: ${body.event_name} user=${callerUid} id=${eventId}`);

      return {
        success: true,
        event_id: eventId,
        event_name: body.event_name,
      };
    } catch (error) {
      logger.error("Error logging analytics event:", error);
      throw new HttpsError(
        "internal",
        `Failed to log event: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);
