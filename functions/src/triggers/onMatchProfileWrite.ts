/**
 * onMatchProfileWrite Firestore Trigger
 * Triggers match recomputation when match profile changes significantly
 * Uses diff checking to avoid hot loops
 */

import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * Check if key matching fields have changed
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, require-jsdoc
function hasKeyFieldsChanged(before: any, after: any): boolean {
  const keyFields = ["goals", "skills_offer", "skills_want", "industries", "visibility.discovery"];

  for (const field of keyFields) {
    const fieldParts = field.split(".");
    let beforeValue = before;
    let afterValue = after;

    for (const part of fieldParts) {
      beforeValue = beforeValue?.[part];
      afterValue = afterValue?.[part];
    }

    // Compare arrays/objects
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      return true;
    }
  }

  return false;
}

export const onMatchProfileWrite = onDocumentWritten(
  {
    document: "match_profiles/{uid}",
    region: "us-central1",
    maxInstances: 10,
  },
  async (event) => {
    const uid = event.params.uid;
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    // Skip if document was deleted
    if (!after) {
      return;
    }

    // Skip if this is a new document (no before data)
    if (!before) {
      logger.info(`New match profile created for ${uid}, skipping recompute`);
      return;
    }

    // Check if key fields changed
    if (!hasKeyFieldsChanged(before, after)) {
      logger.info(`No key fields changed for ${uid}, skipping recompute`);
      return;
    }

    // Check guard: avoid recomputing too frequently (within 5 minutes)
    const lastRecomputed = after.last_recomputed_at?.toMillis?.() || 0;
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    if (lastRecomputed > fiveMinutesAgo) {
      logger.info(`Recompute skipped for ${uid} (too recent: ${Math.round((now - lastRecomputed) / 1000)}s ago)`);
      return;
    }

    try {
      // Enqueue match recomputation job
      const jobRef = db.collection("match_jobs").doc();
      await jobRef.set({
        user_id: uid,
        status: "pending",
        created_at: FieldValue.serverTimestamp(),
        trigger: "profile_update",
      });

      // Update last_recomputed_at timestamp
      await event.data?.after?.ref.update({
        last_recomputed_at: FieldValue.serverTimestamp(),
      });

      logger.info(`Enqueued match recomputation job for ${uid}`);
    } catch (error) {
      logger.error(`Error enqueueing match recomputation for ${uid}:`, error);
    }
  }
);
