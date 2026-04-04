/**
 * generateDocumentPDF Callable Function
 * Generates PDF documents from templates and stores them in Storage
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {z} from "zod";
import * as logger from "firebase-functions/logger";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const storage = getStorage();

const generateDocumentPDFSchema = z.object({
  template_id: z.string().min(1),
  form_data: z.record(z.string(), z.any()),
});

export const generateDocumentPDF = onCall(async (request) => {
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const validationResult = generateDocumentPDFSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid input: ${validationResult.error.message}`
    );
  }

  const {template_id, form_data} = validationResult.data;

  try {
    // Get template document
    const templateRef = db.collection("document_templates").doc(template_id);
    const templateDoc = await templateRef.get();

    if (!templateDoc.exists) {
      throw new HttpsError("not-found", "Template not found");
    }

    const template = templateDoc.data();
    if (!template) {
      throw new HttpsError("not-found", "Template data not found");
    }

    // Validate form_data against template schema
    // TODO: Implement schema validation based on template.schema

    // Generate PDF (stub - would use pdfkit or similar)
    // For now, create a placeholder document reference
    const docId = db.collection("data_rooms").doc(callerUid)
      .collection("documents").doc().id;

    const fileName = `${template.name || "document"}_${docId}.pdf`;
    const filePath = `data_rooms/${callerUid}/${fileName}`;

    // Create a placeholder file in Storage (in production, generate actual PDF)
    const bucket = storage.bucket();
    const file = bucket.file(filePath);

    // Create a simple text placeholder (in production, generate PDF)
    await file.save(JSON.stringify({
      template_id,
      form_data,
      generated_at: new Date().toISOString(),
    }), {
      metadata: {
        contentType: "application/pdf",
      },
    });

    // Make file publicly readable (or use signed URLs)
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    // Create document record in Firestore
    const docRef = db.collection("data_rooms")
      .doc(callerUid)
      .collection("documents")
      .doc(docId);

    await docRef.set({
      id: docId,
      user_id: callerUid,
      template_id,
      template_name: template.name,
      form_data,
      file_path: filePath,
      file_url: publicUrl,
      file_size_bytes: 0, // Would be actual size in production
      is_final: false,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    // Log analytics
    db.collection("analytics_events").doc().set({
      event_type: "asset_generated",
      user_id: callerUid,
      timestamp: FieldValue.serverTimestamp(),
      metadata: {
        template_id,
        document_id: docId,
      },
    }).catch((err) => logger.error("Failed to log analytics:", err));

    logger.info(`Document generated for ${callerUid}: ${docId}`);

    return {
      success: true,
      document_id: docId,
      file_url: publicUrl,
    };
  } catch (error) {
    logger.error(`Error generating document for ${callerUid}:`, error);
    throw new HttpsError(
      "internal",
      `Failed to generate document: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
});
