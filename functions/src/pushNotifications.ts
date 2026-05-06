import {getApps, initializeApp} from "firebase-admin/app";
import {getMessaging} from "firebase-admin/messaging";
import {FieldValue, Timestamp, getFirestore} from "firebase-admin/firestore";
import {onDocumentCreated, onDocumentWritten} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {z} from "zod";

import {callableCorsAllowlist} from "./callableCorsAllowlist";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const messaging = getMessaging();

const PUSH_ACTIVITY = "push_notifications_activity";
const PUSH_DEDUPE = "push_notification_dedupes";

type PushEventType =
  | "badge_earned"
  | "badge_available"
  | "event_reminder_1d"
  | "event_reminder_2h"
  | "direct_message"
  | "group_message"
  | "admin_manual"
  | "admin_graduation_application"
  | "admin_user_reported"
  | "admin_event_needs_approval"
  | "admin_digital_dm";

async function assertCallerIsNetworkAdmin(uid: string): Promise<void> {
  const udoc = await db.collection("users").doc(uid).get();
  const roles: string[] = Array.isArray(udoc.data()?.roles) ? (udoc.data()?.roles as string[]) : [];
  const single = udoc.data()?.role as string | undefined;
  const all = single ? [single, ...roles] : roles;
  if (!all.some((r) => r === "Admin" || r === "superAdmin")) {
    throw new HttpsError("permission-denied", "Admin or superAdmin only.");
  }
}

function cleanTokens(userData: Record<string, unknown>): string[] {
  const set = new Set<string>();
  const one = userData.fcm_token;
  if (typeof one === "string" && one.trim()) set.add(one.trim());
  const many = userData.fcm_tokens;
  if (Array.isArray(many)) {
    for (const t of many) {
      if (typeof t === "string" && t.trim()) set.add(t.trim());
    }
  }
  return Array.from(set);
}

async function loadTokensForUid(uid: string): Promise<string[]> {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return [];
  return cleanTokens(snap.data() as Record<string, unknown>);
}

async function loadAdminRecipientUids(): Promise<string[]> {
  const byUid = new Set<string>();

  const [admins, superAdmins, singleRoleAdmins, singleRoleSupers] = await Promise.all([
    db.collection("users").where("roles", "array-contains", "Admin").select().limit(2500).get(),
    db.collection("users").where("roles", "array-contains", "superAdmin").select().limit(2500).get(),
    db.collection("users").where("role", "==", "Admin").select().limit(2500).get(),
    db.collection("users").where("role", "==", "superAdmin").select().limit(2500).get(),
  ]);

  for (const snap of [admins, superAdmins, singleRoleAdmins, singleRoleSupers]) {
    for (const d of snap.docs) byUid.add(d.id);
  }
  return Array.from(byUid);
}

async function logPushActivity(params: {
  type: PushEventType;
  title: string;
  body: string;
  deepLink: string;
  targetUids: string[];
  successCount: number;
  failureCount: number;
  data?: Record<string, unknown>;
  source: "trigger" | "scheduler" | "admin";
  actorUid?: string;
}): Promise<void> {
  await db.collection(PUSH_ACTIVITY).add({
    type: params.type,
    title: params.title,
    body: params.body,
    deep_link: params.deepLink,
    target_uids: params.targetUids,
    success_count: params.successCount,
    failure_count: params.failureCount,
    source: params.source,
    actor_uid: params.actorUid ?? null,
    data: params.data ?? {},
    created_at: FieldValue.serverTimestamp(),
  });
}

async function sendPushToUids(params: {
  type: PushEventType;
  uids: string[];
  title: string;
  body: string;
  deepLink: string;
  data?: Record<string, string>;
  source: "trigger" | "scheduler" | "admin";
  actorUid?: string;
}): Promise<{success: number; failure: number}> {
  const uidSet = new Set(params.uids.filter((x) => x.trim().length > 0));
  if (uidSet.size === 0) {
    return {success: 0, failure: 0};
  }

  const tokenSet = new Set<string>();
  for (const uid of uidSet) {
    const tokens = await loadTokensForUid(uid);
    for (const t of tokens) tokenSet.add(t);
  }
  const tokens = Array.from(tokenSet);
  if (tokens.length === 0) {
    await logPushActivity({
      type: params.type,
      title: params.title,
      body: params.body,
      deepLink: params.deepLink,
      targetUids: Array.from(uidSet),
      successCount: 0,
      failureCount: 0,
      data: {reason: "no_tokens", ...(params.data ?? {})},
      source: params.source,
      actorUid: params.actorUid,
    });
    return {success: 0, failure: 0};
  }

  let success = 0;
  let failure = 0;
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    const response = await messaging.sendEachForMulticast({
      tokens: chunk,
      notification: {title: params.title, body: params.body},
      data: {
        type: params.type,
        deep_link: params.deepLink,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        ...(params.data ?? {}),
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    });
    success += response.successCount;
    failure += response.failureCount;
  }

  await logPushActivity({
    type: params.type,
    title: params.title,
    body: params.body,
    deepLink: params.deepLink,
    targetUids: Array.from(uidSet),
    successCount: success,
    failureCount: failure,
    data: params.data,
    source: params.source,
    actorUid: params.actorUid,
  });
  return {success, failure};
}

function listAddedStrings(before: unknown, after: unknown): string[] {
  const prev = new Set(Array.isArray(before) ? before.filter((x) => typeof x === "string") : []);
  const next = Array.isArray(after) ? after.filter((x) => typeof x === "string") : [];
  return next.filter((x) => !prev.has(x));
}

function readEarnedBadges(doc: Record<string, unknown> | undefined): unknown {
  const badges = doc?.badges;
  if (!badges || typeof badges !== "object" || Array.isArray(badges)) return [];
  return (badges as Record<string, unknown>).earned;
}

export const onUserBadgeEarnedPush = onDocumentWritten(
  {region: "us-central1", document: "users/{uid}"},
  async (event) => {
    const uid = event.params.uid as string;
    const before = event.data?.before.data() as Record<string, unknown> | undefined;
    const after = event.data?.after.data() as Record<string, unknown> | undefined;
    if (!after) return;

    const addedBadges = listAddedStrings(readEarnedBadges(before), readEarnedBadges(after));
    if (addedBadges.length === 0) return;

    const latestBadge = addedBadges[addedBadges.length - 1]!;
    await sendPushToUids({
      type: "badge_earned",
      uids: [uid],
      title: "Badge earned!",
      body: "You unlocked a new badge. Tap to view your achievements.",
      deepLink: "/profile/achievements",
      data: {badge_id: latestBadge},
      source: "trigger",
    });
  }
);

export const onBadgeDefinitionCreatedPush = onDocumentCreated(
  {region: "us-central1", document: "badge_definitions/{badgeId}"},
  async (event) => {
    const badgeId = event.params.badgeId as string;
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;
    if (data.active === false) return;

    const name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : badgeId;
    const usersSnap = await db.collection("users").select("fcm_token", "fcm_tokens").limit(2500).get();
    const uids = usersSnap.docs.map((d) => d.id);
    if (uids.length === 0) return;

    await sendPushToUids({
      type: "badge_available",
      uids,
      title: "New badge available",
      body: `${name} is now available. Tap to view badges.`,
      deepLink: "/profile/achievements",
      data: {badge_id: badgeId},
      source: "trigger",
    });
  }
);

export const onDirectMessageCreatedPush = onDocumentCreated(
  {region: "us-central1", document: "dm_threads/{threadId}/messages/{messageId}"},
  async (event) => {
    const threadId = event.params.threadId as string;
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;

    const senderId = typeof data.sender_id === "string" ? data.sender_id : "";
    if (!senderId) return;
    const parts = threadId.split("_").filter(Boolean);
    if (parts.length !== 2) return;
    const recipient = parts[0] === senderId ? parts[1] : parts[0];
    if (!recipient || recipient === senderId) return;

    await sendPushToUids({
      type: "direct_message",
      uids: [recipient],
      title: "New direct message",
      body: "You received a new message.",
      deepLink: `/messages/direct/${senderId}`,
      data: {thread_id: threadId},
      source: "trigger",
    });
  }
);

async function notifyGroupMembers(groupId: string, authorId: string, deepLink: string): Promise<void> {
  const groupSnap = await db.collection("groups_mobile").doc(groupId).get();
  if (!groupSnap.exists) return;
  const members = Array.isArray(groupSnap.data()?.GroupMembers) ? (groupSnap.data()?.GroupMembers as string[]) : [];
  const recipients = members.filter((uid) => uid !== authorId);
  if (recipients.length === 0) return;

  await sendPushToUids({
    type: "group_message",
    uids: recipients,
    title: "New group message",
    body: "There is new activity in one of your groups.",
    deepLink,
    data: {group_id: groupId},
    source: "trigger",
  });
}

export const onMobileGroupThreadPush = onDocumentCreated(
  {region: "us-central1", document: "groups_mobile/{groupId}/threads/{threadId}"},
  async (event) => {
    const groupId = event.params.groupId as string;
    const threadId = event.params.threadId as string;
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;
    const authorId = typeof data.author_id === "string" ? data.author_id : "";
    if (!authorId) return;
    await notifyGroupMembers(groupId, authorId, `/groups/${groupId}?thread=${threadId}`);
  }
);

export const onMobileGroupCommentPush = onDocumentCreated(
  {region: "us-central1", document: "groups_mobile/{groupId}/threads/{threadId}/comments/{commentId}"},
  async (event) => {
    const groupId = event.params.groupId as string;
    const threadId = event.params.threadId as string;
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;
    const authorId = typeof data.author_id === "string" ? data.author_id : "";
    if (!authorId) return;
    await notifyGroupMembers(groupId, authorId, `/groups/${groupId}?thread=${threadId}`);
  }
);

export const onGraduationApplicationCreatedAdminPush = onDocumentCreated(
  {region: "us-central1", document: "GraduationApplications/{applicationId}"},
  async (event) => {
    const applicationId = event.params.applicationId as string;
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;

    const status = typeof data.status === "string" ? data.status : "pending";
    if (status !== "pending") return;

    const userName = typeof data.userName === "string" && data.userName.trim() ? data.userName.trim() : "A user";
    const adminUids = await loadAdminRecipientUids();
    if (adminUids.length === 0) return;

    await sendPushToUids({
      type: "admin_graduation_application",
      uids: adminUids,
      title: "New graduation application",
      body: `${userName} submitted a graduation application.`,
      deepLink: "/admin/events",
      data: {
        application_id: applicationId,
        web_admin_path: "/admin/panel/graduation",
      },
      source: "trigger",
    });
  }
);

export const onUserReportedAdminPush = onDocumentCreated(
  {region: "us-central1", document: "user_reports/{reportId}"},
  async (event) => {
    const reportId = event.params.reportId as string;
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;

    const reportedUid = typeof data.reported_user_id === "string" ? data.reported_user_id : "";
    const adminUids = await loadAdminRecipientUids();
    if (adminUids.length === 0) return;

    await sendPushToUids({
      type: "admin_user_reported",
      uids: adminUids,
      title: "User reported",
      body: "A new user report needs moderation review.",
      deepLink: "/admin/reports",
      data: {report_id: reportId, reported_uid: reportedUid},
      source: "trigger",
    });
  }
);

export const onEventNeedsApprovalAdminPush = onDocumentCreated(
  {region: "us-central1", document: "events_mobile/{eventId}"},
  async (event) => {
    const eventId = event.params.eventId as string;
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;

    const approval = typeof data.approval_status === "string" ? data.approval_status : "";
    if (approval !== "pending") return;

    const title = typeof data.title === "string" && data.title.trim() ? data.title.trim() : "An event";
    const adminUids = await loadAdminRecipientUids();
    if (adminUids.length === 0) return;

    await sendPushToUids({
      type: "admin_event_needs_approval",
      uids: adminUids,
      title: "Event needs approval",
      body: `${title} is waiting for approval.`,
      deepLink: "/admin/events",
      data: {event_id: eventId},
      source: "trigger",
    });
  }
);

export const onDigitalStudentDmCreatedAdminPush = onDocumentCreated(
  {region: "us-central1", document: "Digital Student DMs/{dmId}"},
  async (event) => {
    const dmId = event.params.dmId as string;
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;

    const senderUid = typeof data.uid === "string" ? data.uid : "";
    const adminUids = await loadAdminRecipientUids();
    if (adminUids.length === 0) return;

    await sendPushToUids({
      type: "admin_digital_dm",
      uids: adminUids,
      title: "New Digital Curriculum DM",
      body: "A student sent a new message to Mortar.",
      deepLink: "/messages",
      data: {
        dm_id: dmId,
        sender_uid: senderUid,
        web_admin_path: "/admin/panel/messages",
      },
      source: "trigger",
    });
  }
);

export const onDigitalStudentDmReplyAdminPush = onDocumentCreated(
  {region: "us-central1", document: "Digital Student DMs/{dmId}/replies/{replyId}"},
  async (event) => {
    const dmId = event.params.dmId as string;
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;

    const sender = typeof data.sender === "string" ? data.sender.toLowerCase() : "";
    if (sender && sender !== "user") return;

    const adminUids = await loadAdminRecipientUids();
    if (adminUids.length === 0) return;

    await sendPushToUids({
      type: "admin_digital_dm",
      uids: adminUids,
      title: "New Digital Curriculum DM",
      body: "A student replied in the Mortar DM thread.",
      deepLink: "/messages",
      data: {
        dm_id: dmId,
        web_admin_path: "/admin/panel/messages",
      },
      source: "trigger",
    });
  }
);

function readEventDateMs(d: unknown): number | null {
  if (!d || typeof d !== "object") return null;
  if ("toMillis" in d && typeof (d as {toMillis?: unknown}).toMillis === "function") {
    return (d as {toMillis: () => number}).toMillis();
  }
  return null;
}

async function reminderDedupeOnce(key: string): Promise<boolean> {
  const ref = db.collection(PUSH_DEDUPE).doc(key);
  const snap = await ref.get();
  if (snap.exists) return false;
  await ref.set({created_at: FieldValue.serverTimestamp()});
  return true;
}

export const scheduledEventReminderPushes = onSchedule(
  {
    schedule: "*/15 * * * *",
    timeZone: "America/New_York",
    region: "us-central1",
    maxInstances: 1,
  },
  async () => {
    const now = Date.now();
    const upper = Timestamp.fromMillis(now + 26 * 60 * 60 * 1000);
    const lower = Timestamp.fromMillis(now + 90 * 60 * 1000);

    const snap = await db
      .collection("events_mobile")
      .where("approval_status", "in", ["approved", null])
      .where("date", ">=", Timestamp.fromMillis(now))
      .where("date", "<=", upper)
      .get()
      .catch(async () => {
        // Some docs omit approval_status; fallback query without this filter.
        return db
          .collection("events_mobile")
          .where("date", ">=", Timestamp.fromMillis(now))
          .where("date", "<=", upper)
          .get();
      });

    for (const docSnap of snap.docs) {
      const d = docSnap.data() as Record<string, unknown>;
      const eventMs = readEventDateMs(d.date);
      if (!eventMs) continue;
      const diffMs = eventMs - now;
      if (diffMs <= 0) continue;
      const users = Array.isArray(d.registered_users) ? (d.registered_users as string[]) : [];
      if (users.length === 0) continue;

      const isOneDayWindow = diffMs <= 25 * 60 * 60 * 1000 && diffMs >= 23 * 60 * 60 * 1000;
      const isTwoHourWindow = diffMs <= 2.5 * 60 * 60 * 1000 && diffMs >= 1.5 * 60 * 60 * 1000;
      if (!isOneDayWindow && !isTwoHourWindow) continue;

      const type: PushEventType = isOneDayWindow ? "event_reminder_1d" : "event_reminder_2h";
      const title = isOneDayWindow ? "Event reminder: tomorrow" : "Event reminder: starts soon";
      const eventTitle = typeof d.title === "string" && d.title.trim() ? d.title.trim() : "your event";
      const body = isOneDayWindow ?
        `${eventTitle} is tomorrow. Tap to view event details.` :
        `${eventTitle} starts in about 2 hours. Tap to open the event.`;

      const recipients: string[] = [];
      for (const uid of users) {
        const marker = `${docSnap.id}_${uid}_${type}`;
        // eslint-disable-next-line no-await-in-loop
        const ok = await reminderDedupeOnce(marker);
        if (ok) recipients.push(uid);
      }
      if (recipients.length === 0) continue;

      await sendPushToUids({
        type,
        uids: recipients,
        title,
        body,
        deepLink: `/events/${docSnap.id}`,
        data: {event_id: docSnap.id},
        source: "scheduler",
      });
    }

    // Extra query near 2h in case first query skipped due lower bound.
    const snap2h = await db
      .collection("events_mobile")
      .where("date", ">=", lower)
      .where("date", "<=", Timestamp.fromMillis(now + 3 * 60 * 60 * 1000))
      .limit(300)
      .get();
    logger.info("scheduledEventReminderPushes sweep complete", {
      primaryDocs: snap.size,
      nearTwoHourDocs: snap2h.size,
    });
  }
);

const adminSendPushSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(300),
  deepLink: z.string().min(1).max(400),
  audience: z.enum(["all", "uids"]),
  uids: z.array(z.string().min(1)).max(2000).optional().default([]),
});

export const adminSendPushNotification = onCall(
  {region: "us-central1", invoker: "public", cors: callableCorsAllowlist},
  async (request) => {
    const caller = request.auth?.uid;
    if (!caller) throw new HttpsError("unauthenticated", "Sign in required");
    await assertCallerIsNetworkAdmin(caller);

    const parsed = adminSendPushSchema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError("invalid-argument", parsed.error.message);
    const payload = parsed.data;

    let uids: string[] = [];
    if (payload.audience === "uids") {
      uids = payload.uids;
      if (uids.length === 0) {
        throw new HttpsError("invalid-argument", "uids required when audience is 'uids'");
      }
    } else {
      const usersSnap = await db.collection("users").select("fcm_token", "fcm_tokens").limit(2500).get();
      uids = usersSnap.docs.map((d) => d.id);
    }

    const result = await sendPushToUids({
      type: "admin_manual",
      uids,
      title: payload.title.trim(),
      body: payload.body.trim(),
      deepLink: payload.deepLink.trim(),
      source: "admin",
      actorUid: caller,
    });

    return {
      ok: true,
      successCount: result.success,
      failureCount: result.failure,
      audienceCount: uids.length,
    };
  }
);

const getPushActivitySchema = z.object({
  limit: z.number().int().min(1).max(200).optional().default(50),
});

export const getPushNotificationActivity = onCall(
  {region: "us-central1", invoker: "public", cors: callableCorsAllowlist},
  async (request) => {
    const caller = request.auth?.uid;
    if (!caller) throw new HttpsError("unauthenticated", "Sign in required");
    await assertCallerIsNetworkAdmin(caller);

    const parsed = getPushActivitySchema.safeParse(request.data ?? {});
    if (!parsed.success) throw new HttpsError("invalid-argument", parsed.error.message);
    const {limit} = parsed.data;

    const snap = await db
      .collection(PUSH_ACTIVITY)
      .orderBy("created_at", "desc")
      .limit(limit)
      .get();
    const items = snap.docs.map((d) => ({id: d.id, ...d.data()}));
    return {items};
  }
);
