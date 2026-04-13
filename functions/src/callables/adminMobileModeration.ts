/**
 * Staff-only: create `groups_mobile` with visibility + placement audit;
 * moderation snapshots and account actions (ban / lift suspension).
 */
import {initializeApp, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {
  DocumentData,
  FieldValue,
  getFirestore,
  Timestamp,
} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {z} from "zod";

import {callableCorsAllowlist} from "../callableCorsAllowlist";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

const USERS = "users";
const ELIGIBLE = "eligibleUsers";
const MOBILE_GROUPS = "groups_mobile";
const FEED_POSTS = "feed_posts";
const EVENTS_MOBILE = "events_mobile";
const USER_REPORTS = "user_reports";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function assertCallerIsNetworkAdmin(uid: string): Promise<void> {
  const udoc = await db.collection(USERS).doc(uid).get();
  const roles: string[] = Array.isArray(udoc.data()?.roles)
    ? (udoc.data()?.roles as string[])
    : [];
  const single = udoc.data()?.role as string | undefined;
  const eligible = single ? [single, ...roles] : roles;
  if (eligible.includes("Admin") || eligible.includes("superAdmin")) {
    return;
  }
  const user = await auth.getUser(uid);
  const em = user.email ? normalizeEmail(user.email) : "";
  if (em) {
    const es = await db.collection(ELIGIBLE).doc(em).get();
    const r = es.data()?.role as string | undefined;
    if (r === "Admin" || r === "superAdmin") return;
  }
  throw new HttpsError("permission-denied", "Admin or superAdmin only.");
}

const ALLOWED_GROUP_CATEGORIES = new Set([
  "Business & Entrepreneurship",
  "Marketing & Brand Growth",
  "Money, Funding & Resources",
  "Operations & Logistics",
  "Community & Networking",
  "Events & Opportunities",
  "Industry-Specific",
  "Wins, Lessons & Advice",
]);

function jsonSafeValue(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return v;
  }
  if (v instanceof Timestamp) {
    return v.toDate().toISOString();
  }
  if (Array.isArray(v)) {
    return v.map((x) => jsonSafeValue(x));
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o)) {
      out[k] = jsonSafeValue(o[k]);
    }
    return out;
  }
  return String(v);
}

function sanitizeUserDoc(data: DocumentData | undefined): Record<string, unknown> {
  if (!data) return {};
  const skip = new Set(["permissions", "badges"]);
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(data)) {
    if (skip.has(k)) continue;
    out[k] = jsonSafeValue(data[k]);
  }
  return out;
}

const placementRowSchema = z.object({
  email: z.string().min(3).max(320),
  reportReason: z.string().max(4000).optional().default(""),
});

const adminCreateMobileGroupSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(5000).optional(),
  rulesText: z.string().max(20000).optional(),
  category: z.string().optional(),
  visibility: z.enum(["public", "private"]),
  status: z.enum(["Open", "Closed"]).optional().default("Open"),
  placementRows: z.array(placementRowSchema).max(500),
});

export const adminCreateMobileGroup = onCall(
  {region: "us-central1", invoker: "public", cors: callableCorsAllowlist},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }
    await assertCallerIsNetworkAdmin(uid);

    const parsed = adminCreateMobileGroupSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid payload for adminCreateMobileGroup");
    }
    const {name, description, rulesText, category, visibility, status, placementRows} = parsed.data;

    let catOut: string | undefined;
    const c = category?.trim();
    if (c && ALLOWED_GROUP_CATEGORIES.has(c)) {
      catOut = c;
    }

    const memberUids = new Set<string>();
    const placementAudit: Array<Record<string, unknown>> = [];
    const unresolved: string[] = [];

    for (const row of placementRows) {
      const em = normalizeEmail(row.email);
      if (!em) continue;
      try {
        const au = await auth.getUserByEmail(em);
        memberUids.add(au.uid);
        placementAudit.push({
          email: em,
          uid: au.uid,
          reportReason: row.reportReason?.trim() ?? "",
          placedAt: Timestamp.now(),
        });
      } catch {
        unresolved.push(em);
      }
    }

    const members = Array.from(memberUids);
    const ref = db.collection(MOBILE_GROUPS).doc();
    await ref.set({
      Name: name.trim(),
      Status: status,
      Created: FieldValue.serverTimestamp(),
      GroupMembers: members,
      PendingMembers: [] as string[],
      createdBy: uid,
      visibility,
      memberCount: members.length,
      threadCount: 0,
      placement_audit: placementAudit,
      ...(description?.trim() ? {description: description.trim()} : {}),
      ...(rulesText?.trim() ? {rulesText: rulesText.trim()} : {}),
      ...(catOut ? {category: catOut} : {}),
    });

    return {
      ok: true,
      groupId: ref.id,
      memberCount: members.length,
      unresolvedEmails: unresolved,
    };
  }
);

const adminUpdateMobileGroupSchema = z.object({
  groupId: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(5000).optional().default(""),
  rulesText: z.string().max(20000).optional().default(""),
  category: z.string().optional().default(""),
  visibility: z.enum(["public", "private"]),
  status: z.enum(["Open", "Closed"]),
});

/** Staff-only: update `groups_mobile` metadata (same fields as create). */
export const adminUpdateMobileGroup = onCall(
  {region: "us-central1", invoker: "public", cors: callableCorsAllowlist},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }
    await assertCallerIsNetworkAdmin(uid);

    const parsed = adminUpdateMobileGroupSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid payload for adminUpdateMobileGroup");
    }
    const {groupId, name, description, rulesText, category, visibility, status} = parsed.data;

    const ref = db.collection(MOBILE_GROUPS).doc(groupId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Community not found");
    }

    const catTrim = category.trim();
    if (catTrim && !ALLOWED_GROUP_CATEGORIES.has(catTrim)) {
      throw new HttpsError("invalid-argument", "Invalid category");
    }

    const descTrim = description.trim();
    const rulesTrim = rulesText.trim();

    const updates: Record<string, unknown> = {
      Name: name.trim(),
      Status: status,
      visibility,
      description: descTrim ? descTrim : FieldValue.delete(),
      rulesText: rulesTrim ? rulesTrim : FieldValue.delete(),
      category: catTrim ? catTrim : FieldValue.delete(),
    };
    await ref.update(updates);

    return {ok: true, groupId};
  }
);

const adminModifyMobileGroupMembersSchema = z.object({
  groupId: z.string().min(1),
  addRows: z.array(placementRowSchema).max(200).optional().default([]),
  removeUids: z.array(z.string().min(1)).max(500).optional().default([]),
  removeEmails: z.array(z.string().min(3).max(320)).max(200).optional().default([]),
});

/** Staff-only: add/remove `GroupMembers` and append `placement_audit` for new adds. */
export const adminModifyMobileGroupMembers = onCall(
  {region: "us-central1", invoker: "public", cors: callableCorsAllowlist},
  async (request) => {
    const caller = request.auth?.uid;
    if (!caller) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }
    await assertCallerIsNetworkAdmin(caller);

    const parsed = adminModifyMobileGroupMembersSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid payload for adminModifyMobileGroupMembers");
    }
    const {groupId, addRows, removeUids, removeEmails} = parsed.data;

    const ref = db.collection(MOBILE_GROUPS).doc(groupId);

    const removeSet = new Set(removeUids);
    const unresolvedAddEmails: string[] = [];
    const unresolvedRemoveEmails: string[] = [];
    const addResolved: Array<{uid: string; email: string; reportReason: string}> = [];

    for (const em of removeEmails) {
      const norm = normalizeEmail(em);
      if (!norm) continue;
      try {
        const au = await auth.getUserByEmail(norm);
        removeSet.add(au.uid);
      } catch {
        unresolvedRemoveEmails.push(norm);
      }
    }

    for (const row of addRows) {
      const em = normalizeEmail(row.email);
      if (!em) continue;
      try {
        const au = await auth.getUserByEmail(em);
        addResolved.push({
          uid: au.uid,
          email: em,
          reportReason: row.reportReason?.trim() ?? "",
        });
      } catch {
        unresolvedAddEmails.push(em);
      }
    }

    if (addResolved.length === 0 && removeSet.size === 0) {
      return {
        ok: true,
        groupId,
        unresolvedAddEmails,
        unresolvedRemoveEmails,
      };
    }

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new HttpsError("not-found", "Community not found");
      }
      const data = snap.data()!;
      const prev = Array.isArray(data.GroupMembers) ? [...(data.GroupMembers as string[])] : [];
      const oldSet = new Set(prev);
      for (const r of removeSet) {
        oldSet.delete(r);
      }
      for (const a of addResolved) {
        oldSet.add(a.uid);
      }
      const nextMembers = Array.from(oldSet);

      const prevAudit = Array.isArray(data.placement_audit)
        ? [...(data.placement_audit as Record<string, unknown>[])]
        : [];
      const newAudit = [...prevAudit];
      for (const a of addResolved) {
        if (!prev.includes(a.uid)) {
          newAudit.push({
            email: a.email,
            uid: a.uid,
            reportReason: a.reportReason,
            placedAt: Timestamp.now(),
          });
        }
      }

      tx.update(ref, {
        GroupMembers: nextMembers,
        placement_audit: newAudit,
      });
    });

    return {
      ok: true,
      groupId,
      unresolvedAddEmails,
      unresolvedRemoveEmails,
    };
  }
);

const getUserModerationSnapshotSchema = z.object({
  uid: z.string().min(1),
});

export const getUserModerationSnapshot = onCall(
  {region: "us-central1", invoker: "public", cors: callableCorsAllowlist},
  async (request) => {
    const caller = request.auth?.uid;
    if (!caller) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }
    await assertCallerIsNetworkAdmin(caller);

    const parsed = getUserModerationSnapshotSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "uid required");
    }
    const {uid} = parsed.data;

    const userSnap = await db.collection(USERS).doc(uid).get();
    const user = sanitizeUserDoc(userSnap.data());

    const [feedSnap, eventsSnap, reportsSnap] = await Promise.all([
      db.collection(FEED_POSTS).where("author_id", "==", uid).limit(10).get(),
      db.collection(EVENTS_MOBILE).where("created_by", "==", uid).limit(10).get(),
      db.collection(USER_REPORTS).where("reported_user_id", "==", uid).limit(10).get(),
    ]);

    const feedPosts = feedSnap.docs.map((d) => ({
      id: d.id,
      ...jsonSafeValue(d.data()) as Record<string, unknown>,
    }));
    const eventsMobile = eventsSnap.docs.map((d) => ({
      id: d.id,
      ...jsonSafeValue(d.data()) as Record<string, unknown>,
    }));
    const reportsAboutUser = reportsSnap.docs.map((d) => ({
      id: d.id,
      ...jsonSafeValue(d.data()) as Record<string, unknown>,
    }));

    return {user, feedPosts, eventsMobile, reportsAboutUser};
  }
);

const moderateUserAccountSchema = z.object({
  uid: z.string().min(1),
  action: z.enum(["ban", "unban", "lift_content_suspension"]),
});

export const moderateUserAccount = onCall(
  {region: "us-central1", invoker: "public", cors: callableCorsAllowlist},
  async (request) => {
    const caller = request.auth?.uid;
    if (!caller) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }
    await assertCallerIsNetworkAdmin(caller);

    const parsed = moderateUserAccountSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "uid and action required");
    }
    const {uid, action} = parsed.data;

    if (uid === caller) {
      throw new HttpsError("invalid-argument", "Cannot moderate your own account.");
    }

    const userRef = db.collection(USERS).doc(uid);

    if (action === "ban") {
      await auth.updateUser(uid, {disabled: true});
      await userRef.set(
        {
          account_banned: true,
          content_suspended: true,
          updated_at: FieldValue.serverTimestamp(),
          moderation_updated_at: FieldValue.serverTimestamp(),
          moderation_updated_by: caller,
        },
        {merge: true}
      );
      return {ok: true, action: "ban"};
    }

    if (action === "unban") {
      await auth.updateUser(uid, {disabled: false});
      await userRef.set(
        {
          account_banned: false,
          content_suspended: false,
          updated_at: FieldValue.serverTimestamp(),
          moderation_updated_at: FieldValue.serverTimestamp(),
          moderation_updated_by: caller,
        },
        {merge: true}
      );
      return {ok: true, action: "unban"};
    }

    await userRef.set(
      {
        content_suspended: false,
        updated_at: FieldValue.serverTimestamp(),
        moderation_updated_at: FieldValue.serverTimestamp(),
        moderation_updated_by: caller,
      },
      {merge: true}
    );
    return {ok: true, action: "lift_content_suspension"};
  }
);
