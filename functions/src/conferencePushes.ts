/**
 * Conference app push notifications.
 *
 * Audience rule: anything happening *inside* an event goes to that conference's
 * attendee list, never the whole user base. The one exception is
 * [onConferenceAnnouncedPush], which is how people find out an event exists.
 *
 * Chatty sources (session chat, the Community Hub) are throttled to at most one
 * push per source per minute via a bucketed dedupe key — otherwise a lively
 * thread would fire a notification per message.
 */

import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { sendPushToUids } from "./pushNotifications";
import {
  conferenceAttendeeUids,
  conferenceName,
  minuteBucket,
  sessionRsvpUids,
} from "./conferencePushHelpers";

if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;

/** A new conference goes live — the only conference push that is app-wide. */
export const onConferenceAnnouncedPush = onDocumentWritten(
  { region: "us-central1", document: "conferences/{conferenceId}" },
  async (event) => {
    const conferenceId = event.params.conferenceId as string;
    const before = event.data?.before.data() as Record<string, unknown> | undefined;
    const after = event.data?.after.data() as Record<string, unknown> | undefined;
    if (!after) return;
    // Fire on the draft -> active transition only, not on every later edit.
    if (before?.status === "active" || after.status !== "active") return;

    const name = str(after.name) ?? "A new conference";
    const usersSnap = await db
      .collection("users")
      .select("fcm_token", "fcm_tokens")
      .limit(2500)
      .get();
    const uids = usersSnap.docs.map((d) => d.id);
    if (uids.length === 0) return;

    await sendPushToUids({
      type: "conference_announced",
      uids,
      title: "A conference just opened",
      body: `${name} is live. Tap to grab your spot.`,
      deepLink: "/conference/gate",
      data: { conference_id: conferenceId },
      source: "trigger",
      dedupeKey: `conference_announced_${conferenceId}`,
    });
  }
);

/** A ticket code was issued and is usable — tell that attendee. */
export const onConferenceTicketCodeActivePush = onDocumentCreated(
  { region: "us-central1", document: "conferences/{conferenceId}/ticketCodes/{codeId}" },
  async (event) => {
    const conferenceId = event.params.conferenceId as string;
    const codeId = event.params.codeId as string;
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;

    // Codes are issued against an email before an account necessarily exists;
    // only one already bound to a uid has somewhere to push to.
    const uid = str(data.uid) ?? str(data.usedByUid);
    if (!uid) return;

    const name = await conferenceName(conferenceId);
    await sendPushToUids({
      type: "conference_code_active",
      uids: [uid],
      title: "Your conference code is ready",
      body: `You can enter ${name} now. Tap to go in.`,
      deepLink: "/conference/gate",
      data: { conference_id: conferenceId },
      source: "trigger",
      dedupeKey: `conference_code_active_${conferenceId}_${codeId}`,
    });
  }
);

/** A new mission is published — attendees of that conference only. */
export const onConferenceMissionCreatedPush = onDocumentCreated(
  { region: "us-central1", document: "conference_missions/{missionId}" },
  async (event) => {
    const missionId = event.params.missionId as string;
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;
    if (data.active === false) return;

    const conferenceId = str(data.conference_id);
    if (!conferenceId) return;

    const title = str(data.title) ?? "A new mission";
    const uids = await conferenceAttendeeUids(conferenceId);
    if (uids.length === 0) return;

    await sendPushToUids({
      type: "conference_mission_available",
      uids,
      title: "New mission",
      body: `${title}. Tap to see how to complete it.`,
      deepLink: "/conference/lobby",
      data: { conference_id: conferenceId, mission_id: missionId },
      source: "trigger",
      dedupeKey: `conference_mission_${missionId}`,
    });
  }
);

/** New message in a session chat — to that session's RSVPs, minus the sender. */
export const onConferenceSessionMessagePush = onDocumentCreated(
  {
    region: "us-central1",
    document: "conferences/{conferenceId}/sessions/{sessionId}/messages/{messageId}",
  },
  async (event) => {
    const conferenceId = event.params.conferenceId as string;
    const sessionId = event.params.sessionId as string;
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;

    const senderId = str(data.sender_id);
    const rsvps = await sessionRsvpUids(conferenceId, sessionId);
    const uids = rsvps.filter((u) => u !== senderId);
    if (uids.length === 0) return;

    const author = str(data.author_name) ?? "Someone";
    await sendPushToUids({
      type: "conference_session_message",
      uids,
      title: "New message in your session",
      body: `${author} posted in a session you are attending.`,
      deepLink: `/conference/session/${sessionId}/chat`,
      data: { conference_id: conferenceId, session_id: sessionId },
      source: "trigger",
      // At most one push per session per minute, however busy the chat is.
      dedupeKey: `conference_session_msg_${sessionId}_${minuteBucket()}`,
    });
  }
);

/** New Community Hub post — to the conference's attendees, minus the author. */
export const onConferenceCommunityPostPush = onDocumentCreated(
  { region: "us-central1", document: "conferences/{conferenceId}/community_posts/{postId}" },
  async (event) => {
    const conferenceId = event.params.conferenceId as string;
    const postId = event.params.postId as string;
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;

    const authorId = str(data.author_id);
    const attendees = await conferenceAttendeeUids(conferenceId);
    const uids = attendees.filter((u) => u !== authorId);
    if (uids.length === 0) return;

    const author = str(data.author_name) ?? "Someone";
    await sendPushToUids({
      type: "conference_community_message",
      uids,
      title: "New in the Community Hub",
      body: `${author} posted a message. Tap to read it.`,
      deepLink: "/conference/community",
      data: { conference_id: conferenceId, post_id: postId },
      source: "trigger",
      dedupeKey: `conference_community_${conferenceId}_${minuteBucket()}`,
    });
  }
);

/** A mutual networking match — both people are told. */
export const onConferenceMatchPush = onDocumentCreated(
  { region: "us-central1", document: "conferences/{conferenceId}/matches/{pairId}" },
  async (event) => {
    const conferenceId = event.params.conferenceId as string;
    const pairId = event.params.pairId as string;
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;

    const users = Array.isArray(data.users) ?
      (data.users as unknown[]).filter((x): x is string => typeof x === "string") :
      [];
    if (users.length === 0) return;

    const title = "It is a match";
    const body = "You both want to connect. Tap to start the conversation.";

    // Each person is sent straight into the 1:1 chat with the *other* one, so the
    // deep link differs per recipient — hence one send each rather than a single
    // broadcast (sendPushToUids takes one deepLink for the whole list).
    //
    // The dedupe key has to be per-user for the same reason: a shared key would
    // make the second send a no-op and only one of the pair would ever hear.
    if (users.length === 2) {
      await Promise.all(
        users.map((uid, i) => {
          const other = users[1 - i];
          return sendPushToUids({
            type: "conference_match",
            uids: [uid],
            title,
            body,
            deepLink: `/messages/direct/${other}`,
            data: {
              conference_id: conferenceId,
              pair_id: pairId,
              matched_uid: other,
            },
            source: "trigger",
            dedupeKey: `conference_match_${pairId}_${uid}`,
          });
        })
      );
      return;
    }

    // Not a pair (unexpected shape): there is no single "other person" to open a
    // chat with, so fall back to the networking screen.
    await sendPushToUids({
      type: "conference_match",
      uids: users,
      title,
      body,
      deepLink: "/conference/network",
      data: { conference_id: conferenceId, pair_id: pairId },
      source: "trigger",
      dedupeKey: `conference_match_${pairId}`,
    });
  }
);
