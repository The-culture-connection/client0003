/**
 * proposeMeeting Callable Function
 * Allows users to propose meeting time slots and topics
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {z} from "zod";
import * as logger from "firebase-functions/logger";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const proposeMeetingSchema = z.object({
  topic: z.string().min(1),
  description: z.string().optional(),
  proposed_time_slots: z.array(z.object({
    start_time: z.string(), // ISO string
    end_time: z.string(), // ISO string
  })),
  meeting_type: z.enum(["training", "networking", "mentorship", "other"]).optional(),
});

export const proposeMeeting = onCall(async (request) => {
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const validationResult = proposeMeetingSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid input: ${validationResult.error.message}`
    );
  }

  const proposal = validationResult.data;

  try {
    const proposalRef = db.collection("meeting_proposals").doc();

    await proposalRef.set({
      id: proposalRef.id,
      proposer_id: callerUid,
      topic: proposal.topic,
      description: proposal.description || null,
      proposed_time_slots: proposal.proposed_time_slots,
      meeting_type: proposal.meeting_type || "other",
      status: "pending",
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    logger.info(`Meeting proposal created by ${callerUid}: ${proposalRef.id}`);

    return {
      success: true,
      proposal_id: proposalRef.id,
      message: "Meeting proposal submitted successfully",
    };
  } catch (error) {
    logger.error(`Error proposing meeting for ${callerUid}:`, error);
    throw new HttpsError(
      "internal",
      `Failed to propose meeting: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
});
