/**
 * approveMeeting Callable Function
 * Admin-only function to approve meeting proposals and create events
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {z} from "zod";
import * as logger from "firebase-functions/logger";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

const approveMeetingSchema = z.object({
  proposal_id: z.string().min(1),
  selected_time_slot_index: z.number().int().min(0),
  event_title: z.string().min(1).optional(),
  event_description: z.string().optional(),
});

export const approveMeeting = onCall(async (request) => {
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Verify caller is Admin
  const callerRecord = await auth.getUser(callerUid);
  const callerRoles = callerRecord.customClaims?.roles || [];

  if (!callerRoles.includes("Admin")) {
    throw new HttpsError(
      "permission-denied",
      "Only Admin can approve meetings"
    );
  }

  const validationResult = approveMeetingSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid input: ${validationResult.error.message}`
    );
  }

  const {proposal_id, selected_time_slot_index, event_title, event_description} =
    validationResult.data;

  try {
    // Get proposal
    const proposalRef = db.collection("meeting_proposals").doc(proposal_id);
    const proposalDoc = await proposalRef.get();

    if (!proposalDoc.exists) {
      throw new HttpsError("not-found", "Meeting proposal not found");
    }

    const proposal = proposalDoc.data();
    if (!proposal) {
      throw new HttpsError("not-found", "Proposal data not found");
    }

    if (proposal.status !== "pending") {
      throw new HttpsError("failed-precondition", "Proposal already processed");
    }

    const timeSlots = proposal.proposed_time_slots || [];
    if (selected_time_slot_index >= timeSlots.length) {
      throw new HttpsError("invalid-argument", "Invalid time slot index");
    }

    const selectedSlot = timeSlots[selected_time_slot_index];

    // Create event
    const eventRef = db.collection("events").doc();
    await eventRef.set({
      id: eventRef.id,
      title: event_title || proposal.topic,
      description: event_description || proposal.description || null,
      event_date: selectedSlot.start_time,
      event_end_date: selectedSlot.end_time,
      event_type: proposal.meeting_type || "training",
      organizer_id: proposal.proposer_id,
      created_by: callerUid,
      status: "scheduled",
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    // Update proposal status
    await proposalRef.update({
      status: "approved",
      approved_by: callerUid,
      approved_at: FieldValue.serverTimestamp(),
      event_id: eventRef.id,
      selected_time_slot: selectedSlot,
      updated_at: FieldValue.serverTimestamp(),
    });

    logger.info(`Meeting proposal ${proposal_id} approved by ${callerUid}, event ${eventRef.id} created`);

    return {
      success: true,
      proposal_id,
      event_id: eventRef.id,
      message: "Meeting approved and event created",
    };
  } catch (error) {
    logger.error(`Error approving meeting ${proposal_id}:`, error);
    throw new HttpsError(
      "internal",
      `Failed to approve meeting: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
});
