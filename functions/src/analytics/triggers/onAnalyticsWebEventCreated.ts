/**
 * Phase 4/5 — materialize summary collections when a normalized analytics event is written.
 * Firestore → Functions v2; driven by `analytics_events` docs (not UI state).
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { ANALYTICS_COLLECTIONS, ANALYTICS_WEB_SCHEMA_VERSION } from "../mortarAnalyticsContract";
import { applyPhase4RollupsForWebEvent } from "../summary/phase4WebEventRollup";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

export const onAnalyticsWebEventCreated = onDocumentCreated(
  `${ANALYTICS_COLLECTIONS.LEGACY_EVENTS}/{eventId}`,
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    if (data.schema_version !== ANALYTICS_WEB_SCHEMA_VERSION) return;

    try {
      await applyPhase4RollupsForWebEvent(db, data as Record<string, unknown>);
    } catch (err) {
      logger.error("onAnalyticsWebEventCreated: phase4 rollup failed", {
        err,
        eventId: snap.id,
        event_name: data.event_name,
      });
    }
  }
);
