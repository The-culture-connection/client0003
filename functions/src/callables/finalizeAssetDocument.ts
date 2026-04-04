/**
 * finalizeAssetDocument Callable Function
 * Marks an asset document as final and checks module completion
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {evaluateModuleCompletion} from "../helpers/evaluateModuleCompletion";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

export const finalizeAssetDocument = onCall(async (request) => {
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {doc_id} = request.data;

  if (!doc_id || typeof doc_id !== "string") {
    throw new HttpsError("invalid-argument", "doc_id is required");
  }

  try {
    // Get document
    const docRef = db.collection("data_rooms")
      .doc(callerUid)
      .collection("documents")
      .doc(doc_id);

    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      throw new HttpsError("not-found", "Document not found");
    }

    const docData = docSnap.data();
    if (!docData) {
      throw new HttpsError("not-found", "Document data not found");
    }

    // Mark as final
    await docRef.update({
      is_final: true,
      finalized_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    // Get template to find module_id
    const templateRef = db.collection("document_templates")
      .doc(docData.template_id);
    const templateDoc = await templateRef.get();
    const template = templateDoc.data();

    if (template?.module_id) {
      // Check if all required assets for this module are finalized
      await evaluateModuleCompletion(callerUid, template.module_id);
    }

    // Log analytics
    db.collection("analytics_events").doc().set({
      event_type: "asset_finalized",
      user_id: callerUid,
      timestamp: FieldValue.serverTimestamp(),
      metadata: {
        document_id: doc_id,
        template_id: docData.template_id,
        module_id: template?.module_id || null,
      },
    }).catch((err) => logger.error("Failed to log analytics:", err));

    logger.info(`Asset finalized for ${callerUid}: ${doc_id}`);

    return {
      success: true,
      document_id: doc_id,
    };
  } catch (error) {
    logger.error(`Error finalizing asset for ${callerUid}:`, error);
    throw new HttpsError(
      "internal",
      `Failed to finalize asset: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
});
