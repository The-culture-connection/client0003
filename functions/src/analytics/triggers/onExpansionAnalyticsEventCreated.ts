/**
 * Phase 4 — materialize summary collections when a new Expansion mobile analytics event is written.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { ANALYTICS_COLLECTIONS } from "../mortarAnalyticsContract";
import { applyExpansionMobileRollupsForEvent } from "../summary/expansionMobileEventRollup";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

export const onExpansionAnalyticsEventCreated = onDocumentCreated(
  `${ANALYTICS_COLLECTIONS.EXPANSION_ANALYTICS_EVENTS}/{eventId}`,
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() as Record<string, unknown>;
    try {
      await applyExpansionMobileRollupsForEvent(db, snap.id, data);
    } catch (err) {
      logger.error("onExpansionAnalyticsEventCreated: rollup failed", {
        err,
        eventId: snap.id,
        event_name: data.event_name,
      });
    }
  }
);
