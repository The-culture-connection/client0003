/**
 * Conference Center: ticket buyers, ticket codes, redemption / entry.
 *
 * Adapted from `expansionInvite.ts` (eligibleUsers + inviteCodes) to a
 * conference-scoped shape:
 *   conferences/{id}/ticketBuyers/{normalizedEmail}  — roster (like eligibleUsers)
 *   conferences/{id}/ticketCodes/{autoId}            — codes    (like inviteCodes)
 *   conferences/{id}/attendees/{uid}                 — access record checked at entry
 *
 * Only the single latest code per buyer is valid (revoke-on-reissue = lost-code
 * flow). Conference users are already signed in, so redemption consumes the code
 * for an authed uid (like `finalizeInviteClaim`) — it does NOT create accounts.
 *
 * Phase A: no email is sent — generated codes are returned to the admin UI.
 * Automated ticket emails are Phase B/C.
 */
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  DocumentData,
  DocumentReference,
  FieldValue,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { callableCorsAllowlist } from "./callableCorsAllowlist";
import { BREVO_API_KEY } from "./email/brevoClient";
import { sendConferenceTicketConfirmationEmail } from "./email/conferenceTicketEmail";

if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();
const auth = getAuth();

const defaultCallableOptions = {
  invoker: "public" as const,
  cors: callableCorsAllowlist,
};

/** Options for callables that send Brevo email (free registration). */
const callableWithBrevo = {
  ...defaultCallableOptions,
  secrets: [BREVO_API_KEY],
};

const CONFERENCES = "conferences";
const TICKET_BUYERS = "ticketBuyers";
const TICKET_CODES = "ticketCodes";
const ATTENDEES = "attendees";
const CHECKIN_DAYS = "checkinDays";
const USERS = "users";
const ELIGIBLE = "eligibleUsers";

const DEFAULT_EXPIRATION_DAYS = 180;
const DEFAULT_CHECKIN_TIMEZONE = "America/New_York";

/**
 * Conference-local day key (`YYYY-MM-DD`) so daily check-ins reset at local
 * midnight rather than UTC. `en-CA` formats as `YYYY-MM-DD`. Falls back to the
 * default timezone if the conference's `timezone` is missing/invalid.
 */
function conferenceDayKey(timezone?: string | null): string {
  const tz = typeof timezone === "string" && timezone.trim() ? timezone.trim() : DEFAULT_CHECKIN_TIMEZONE;
  const fmt = (zone: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  try {
    return fmt(tz);
  } catch {
    return fmt(DEFAULT_CHECKIN_TIMEZONE);
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function randomTicketCode(): string {
  // Unambiguous alphabet (no 0/O/1/I), matching the invite pattern.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function maskedPreview(code: string): string {
  if (code.length <= 4) return "****";
  return `${code.slice(0, 2)}****${code.slice(-2)}`;
}

/** Admin/superAdmin gate — mirrors expansionInvite.assertCallerIsNetworkAdmin. */
async function assertCallerIsAdmin(uid: string): Promise<void> {
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

function conferenceRef(conferenceId: string): DocumentReference {
  return db.collection(CONFERENCES).doc(conferenceId);
}

async function assertConferenceExists(conferenceId: string): Promise<DocumentData> {
  const snap = await conferenceRef(conferenceId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Conference not found.");
  }
  return snap.data()!;
}

/**
 * Generate a fresh code for a buyer: revoke the previous latest code, create a
 * new ticketCodes doc, and point the buyer's latestTicketCodeId at it.
 */
async function internalGenerateTicketCode(
  conferenceId: string,
  normalizedEmail: string,
  createdByUid: string,
  expirationDays: number,
): Promise<{ ticketId: string; plainCode: string; expiresAt: Date }> {
  const conf = conferenceRef(conferenceId);
  const buyerRef = conf.collection(TICKET_BUYERS).doc(normalizedEmail);
  const buyerSnap = await buyerRef.get();
  const prevId = buyerSnap.data()?.latestTicketCodeId as string | undefined;
  if (prevId) {
    await conf.collection(TICKET_CODES).doc(prevId).update({
      revoked: true,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const code = randomTicketCode();
  const codeRef = conf.collection(TICKET_CODES).doc();
  const expiresAt = new Date(Date.now() + expirationDays * 86400000);

  await codeRef.set({
    ticketId: codeRef.id,
    conferenceId,
    normalizedEmail,
    code,
    codePreview: maskedPreview(code),
    expiresAt,
    used: false,
    usedAt: null,
    usedByUid: null,
    revoked: false,
    createdByUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ticketId: codeRef.id, plainCode: code, expiresAt };
}

/** Upsert a buyer roster row and attach a freshly generated code. */
async function internalUpsertBuyerWithCode(
  conferenceId: string,
  emailRaw: string,
  source: string,
  createdByUid: string,
  expirationDays: number,
): Promise<{ normalizedEmail: string; ticketId: string; plainCode: string; expiresAt: Date }> {
  const normalizedEmail = normalizeEmail(emailRaw);
  const buyerRef = conferenceRef(conferenceId).collection(TICKET_BUYERS).doc(normalizedEmail);
  const existed = (await buyerRef.get()).exists;
  const now = FieldValue.serverTimestamp();

  await buyerRef.set(
    {
      email: emailRaw.trim(),
      normalizedEmail,
      source,
      updatedAt: now,
      ...(existed ? {} : { redeemed: false, createdAt: now }),
    },
    { merge: true },
  );

  const out = await internalGenerateTicketCode(
    conferenceId,
    normalizedEmail,
    createdByUid,
    expirationDays,
  );

  await buyerRef.update({
    latestTicketCodeId: out.ticketId,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { normalizedEmail, ...out };
}

/**
 * Generate (and email-ready return) a ticket code for a paid purchase.
 * Called from Stripe fulfillment — `buyerUid` is the purchaser's account uid so
 * the code is tied to the email that account will redeem with. Reuses the same
 * upsert + revoke-previous logic as admin-issued codes.
 */
export async function internalGenerateConferenceTicketForPurchase(
  conferenceId: string,
  emailRaw: string,
  buyerUid: string,
): Promise<{ normalizedEmail: string; ticketId: string; plainCode: string; expiresAt: Date }> {
  return internalUpsertBuyerWithCode(
    conferenceId,
    emailRaw,
    "stripe_purchase",
    buyerUid,
    DEFAULT_EXPIRATION_DAYS,
  );
}

// ---------------------------------------------------------------------------
// Redemption validation (latest code only), mirrors loadInviteClaimContext.
// ---------------------------------------------------------------------------

interface TicketClaimContext {
  normalizedEmail: string;
  buyerRef: DocumentReference;
  buyer: DocumentData;
  codeRef: DocumentReference;
  code: DocumentData;
}

type LoadTicketResult =
  | { ok: false; client: { ok: false; code: string; message?: string } }
  | { ok: true; ctx: TicketClaimContext; alreadyConsumedByUid: string | null };

/** Enforce the conference's active window + not-closed status. */
function checkConferenceWindow(
  conf: DocumentData,
): { ok: false; client: { ok: false; code: string; message?: string } } | { ok: true } {
  if (conf.status === "closed") {
    return {
      ok: false,
      client: { ok: false, code: "CONFERENCE_CLOSED", message: "This conference has closed." },
    };
  }
  const nowMs = Date.now();
  const activeFrom = conf.activeFrom as Timestamp | undefined;
  const activeUntil = conf.activeUntil as Timestamp | undefined;
  if (activeFrom && activeFrom.toMillis() > nowMs) {
    return {
      ok: false,
      client: {
        ok: false,
        code: "NOT_ACTIVE_YET",
        message: "This conference isn't open yet. Your code will work once it starts.",
      },
    };
  }
  if (activeUntil && activeUntil.toMillis() < nowMs) {
    return {
      ok: false,
      client: { ok: false, code: "WINDOW_CLOSED", message: "This conference has ended." },
    };
  }
  return { ok: true };
}

async function loadTicketClaimContext(
  conferenceId: string,
  emailRaw: string,
  codeTrimmed: string,
): Promise<LoadTicketResult> {
  const normalizedEmail = normalizeEmail(emailRaw);
  const conf = conferenceRef(conferenceId);
  const buyerRef = conf.collection(TICKET_BUYERS).doc(normalizedEmail);
  const buyerSnap = await buyerRef.get();

  if (!buyerSnap.exists) {
    return {
      ok: false,
      client: {
        ok: false,
        code: "NOT_A_BUYER",
        message: "We couldn't find a ticket for this account at this conference.",
      },
    };
  }

  const buyer = buyerSnap.data()!;
  const latestId = buyer.latestTicketCodeId as string | null | undefined;
  if (!latestId) {
    return { ok: false, client: { ok: false, code: "NO_CODE", message: "This ticket code is invalid." } };
  }

  const codeRef = conf.collection(TICKET_CODES).doc(latestId);
  const codeSnap = await codeRef.get();
  if (!codeSnap.exists) {
    return { ok: false, client: { ok: false, code: "INVALID_CODE", message: "This ticket code is invalid." } };
  }

  const codeDoc = codeSnap.data()!;
  if (codeDoc.revoked === true) {
    return { ok: false, client: { ok: false, code: "REVOKED", message: "This ticket code is no longer valid." } };
  }

  const exp = codeDoc.expiresAt as Timestamp | undefined;
  if (exp && exp.toMillis() < Date.now()) {
    return {
      ok: false,
      client: {
        ok: false,
        code: "EXPIRED",
        message: "This ticket code has expired. Please contact support for a new one.",
      },
    };
  }

  if ((codeDoc.normalizedEmail as string) !== normalizedEmail) {
    return { ok: false, client: { ok: false, code: "INVALID_CODE", message: "This ticket code is invalid." } };
  }

  const storedCode = (codeDoc.code as string | undefined)?.trim();
  if (!storedCode || storedCode !== codeTrimmed) {
    return { ok: false, client: { ok: false, code: "INVALID_CODE", message: "This ticket code is invalid." } };
  }

  let alreadyConsumedByUid: string | null = null;
  if (codeDoc.used === true) {
    alreadyConsumedByUid = (codeDoc.usedByUid as string) || null;
  }

  return {
    ok: true,
    ctx: { normalizedEmail, buyerRef, buyer, codeRef, code: codeDoc },
    alreadyConsumedByUid,
  };
}

// ---------------------------------------------------------------------------
// Callables
// ---------------------------------------------------------------------------

/** Admin: generate (or reissue) a ticket code for one buyer email. */
export const generateConferenceTicketCode = onCall(defaultCallableOptions, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
  await assertCallerIsAdmin(request.auth.uid);

  const conferenceId = (request.data?.conferenceId as string | undefined)?.trim();
  const emailRaw = request.data?.email as string | undefined;
  const source = (request.data?.source as string) || "admin_console";
  const expirationDays = Number(request.data?.expirationDays) || DEFAULT_EXPIRATION_DAYS;
  if (!conferenceId || !emailRaw) {
    throw new HttpsError("invalid-argument", "conferenceId and email are required.");
  }
  await assertConferenceExists(conferenceId);

  const out = await internalUpsertBuyerWithCode(
    conferenceId,
    emailRaw,
    source,
    request.auth.uid,
    expirationDays,
  );

  return {
    ok: true,
    conferenceId,
    normalizedEmail: out.normalizedEmail,
    ticketId: out.ticketId,
    code: out.plainCode,
    codePreview: maskedPreview(out.plainCode),
    expiresAt: out.expiresAt.toISOString(),
  };
});

/** Admin: bulk-add buyers (each gets a fresh code). Up to 500 per call. */
export const bulkAddConferenceTicketBuyers = onCall(defaultCallableOptions, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
  await assertCallerIsAdmin(request.auth.uid);

  const conferenceId = (request.data?.conferenceId as string | undefined)?.trim();
  const emails = request.data?.emails as string[] | undefined;
  const expirationDays = Number(request.data?.expirationDays) || DEFAULT_EXPIRATION_DAYS;
  if (!conferenceId) throw new HttpsError("invalid-argument", "conferenceId is required.");
  if (!Array.isArray(emails) || emails.length === 0) {
    throw new HttpsError("invalid-argument", "emails array is required.");
  }
  if (emails.length > 500) {
    throw new HttpsError("invalid-argument", "Maximum 500 emails per call.");
  }
  await assertConferenceExists(conferenceId);

  const results: { email: string; code: string; codePreview: string }[] = [];
  const seen = new Set<string>();
  for (const emailRaw of emails) {
    if (!emailRaw || typeof emailRaw !== "string") continue;
    const normalized = normalizeEmail(emailRaw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    const out = await internalUpsertBuyerWithCode(
      conferenceId,
      emailRaw,
      "bulk_upload",
      request.auth.uid,
      expirationDays,
    );
    results.push({
      email: out.normalizedEmail,
      code: out.plainCode,
      codePreview: maskedPreview(out.plainCode),
    });
  }

  return { ok: true, written: results.length, results };
});

/** Admin: revoke a ticket code (lost-code flow = revoke then regenerate). */
export const revokeConferenceTicketCode = onCall(defaultCallableOptions, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
  await assertCallerIsAdmin(request.auth.uid);

  const conferenceId = (request.data?.conferenceId as string | undefined)?.trim();
  const ticketCodeId = (request.data?.ticketCodeId as string | undefined)?.trim();
  if (!conferenceId || !ticketCodeId) {
    throw new HttpsError("invalid-argument", "conferenceId and ticketCodeId are required.");
  }

  await conferenceRef(conferenceId).collection(TICKET_CODES).doc(ticketCodeId).update({
    revoked: true,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

/** Authed user: redeem the code from their ticket to unlock the conference. */
export const redeemConferenceTicketCode = onCall(defaultCallableOptions, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const uid = request.auth.uid;

  const conferenceId = (request.data?.conferenceId as string | undefined)?.trim();
  const codeInput = (request.data?.code as string | undefined)?.trim();
  if (!conferenceId || !codeInput) {
    throw new HttpsError("invalid-argument", "conferenceId and code are required.");
  }

  const record = await auth.getUser(uid);
  const emailRaw = record.email;
  if (!emailRaw) {
    throw new HttpsError("failed-precondition", "Your account has no email.");
  }

  const conf = await assertConferenceExists(conferenceId);
  const windowCheck = checkConferenceWindow(conf);
  if (!windowCheck.ok) {
    return { ...windowCheck.client, redeemFailed: true };
  }

  const loaded = await loadTicketClaimContext(conferenceId, emailRaw, codeInput);
  if (!loaded.ok) {
    return { ...loaded.client, redeemFailed: true };
  }

  const { ctx, alreadyConsumedByUid } = loaded;
  if (alreadyConsumedByUid != null) {
    if (alreadyConsumedByUid === uid) {
      return { ok: true, alreadyDone: true, state: "READY" };
    }
    return {
      ok: false,
      code: "USED",
      message: "This ticket code has already been used on another account.",
      redeemFailed: true,
    };
  }

  const attendeeRef = conferenceRef(conferenceId).collection(ATTENDEES).doc(uid);
  const alreadyAttendee = (await attendeeRef.get()).exists;

  const batch = db.batch();
  batch.update(ctx.codeRef, {
    used: true,
    usedAt: FieldValue.serverTimestamp(),
    usedByUid: uid,
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(
    ctx.buyerRef,
    {
      redeemed: true,
      redeemedByUid: uid,
      redeemedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  batch.set(attendeeRef, {
    uid,
    email: emailRaw.trim(),
    normalizedEmail: ctx.normalizedEmail,
    ticketCodeId: ctx.codeRef.id,
    redeemedAt: FieldValue.serverTimestamp(),
  });
  if (!alreadyAttendee) {
    batch.update(conferenceRef(conferenceId), {
      attendeeCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  return { ok: true, state: "READY", conferenceId };
});

/**
 * Authed user: register for a FREE conference. Auto-issues a unique code, emails
 * it (confirmation + active window), and returns it so the app can redeem
 * immediately. Rejects paid conferences (those go through Stripe checkout).
 */
export const registerFreeConferenceTicket = onCall(callableWithBrevo, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const uid = request.auth.uid;

  const conferenceId = (request.data?.conferenceId as string | undefined)?.trim();
  if (!conferenceId) throw new HttpsError("invalid-argument", "conferenceId is required.");

  const conf = await assertConferenceExists(conferenceId);
  if (conf.status === "closed") {
    throw new HttpsError("failed-precondition", "This conference is closed.");
  }
  if (Number(conf.priceCents ?? 0) > 0) {
    throw new HttpsError("failed-precondition", "This conference requires a ticket purchase.");
  }

  const record = await auth.getUser(uid);
  const emailRaw = record.email;
  if (!emailRaw) {
    throw new HttpsError("failed-precondition", "Your account has no email.");
  }

  const gen = await internalUpsertBuyerWithCode(
    conferenceId,
    emailRaw,
    "free_registration",
    uid,
    DEFAULT_EXPIRATION_DAYS,
  );

  const udoc = await db.collection(USERS).doc(uid).get();
  const userName =
    (udoc.data()?.displayName as string | undefined) ??
    (udoc.data()?.name as string | undefined);

  await sendConferenceTicketConfirmationEmail({
    db,
    to: emailRaw.trim(),
    recipientUid: uid,
    userName,
    conferenceId,
    ticketCode: gen.plainCode,
    amountCents: 0,
    currency: String(conf.currency ?? "usd"),
  });

  return { ok: true, code: gen.plainCode, conferenceId };
});

/**
 * Authed attendee: daily check-in for a conference. Resets each conference-local
 * day (`conferenceDayKey`). Records the check-in on the user's own attendee doc
 * and rolls it into a per-day cumulative counter + a conference-level total.
 * Pass `peek:true` to read status without writing (used by the lobby on load).
 */
export const checkInToConference = onCall(defaultCallableOptions, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const uid = request.auth.uid;

  const conferenceId = (request.data?.conferenceId as string | undefined)?.trim();
  if (!conferenceId) throw new HttpsError("invalid-argument", "conferenceId is required.");
  const peek = request.data?.peek === true;

  const conf = await assertConferenceExists(conferenceId);
  const todayKey = conferenceDayKey(conf.timezone as string | undefined);

  // The active window is enforced here as well as at redemption. Holding a
  // redeemed ticket is not a standing entitlement: once a conference closes or
  // runs past `activeUntil`, the actions taken from inside it have to stop too,
  // otherwise a stale client could keep checking in to a dead conference.
  const windowCheck = checkConferenceWindow(conf);

  const attendeeRef = conferenceRef(conferenceId).collection(ATTENDEES).doc(uid);
  const dayRef = conferenceRef(conferenceId).collection(CHECKIN_DAYS).doc(todayKey);

  // Status-only read for the lobby — never writes. Reports the window rather
  // than failing, so the client can show the right state instead of an error.
  if (peek) {
    const [attSnap, daySnap] = await Promise.all([attendeeRef.get(), dayRef.get()]);
    const isAttendee = attSnap.exists;
    const checkedInToday = isAttendee && attSnap.data()?.lastCheckInDate === todayKey;
    const todayCount = (daySnap.data()?.count as number | undefined) ?? 0;
    return {
      checkedInToday,
      todayCount,
      isAttendee,
      todayKey,
      conferenceOpen: windowCheck.ok,
    };
  }

  if (!windowCheck.ok) {
    throw new HttpsError(
      "failed-precondition",
      windowCheck.client.message ?? "This conference is closed.",
    );
  }

  // Idempotent per day: the transaction reads the attendee doc, so a rapid
  // double-tap re-runs and sees today's key already set (no double count).
  const outcome = await db.runTransaction(async (tx) => {
    const attSnap = await tx.get(attendeeRef);
    if (!attSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "You need a ticket to check in to this conference.",
      );
    }
    const alreadyToday = attSnap.data()?.lastCheckInDate === todayKey;
    if (!alreadyToday) {
      tx.set(
        attendeeRef,
        {
          lastCheckInDate: todayKey,
          lastCheckInAt: FieldValue.serverTimestamp(),
          checkInCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      tx.set(
        dayRef,
        {
          date: todayKey,
          conferenceId,
          count: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      tx.update(conferenceRef(conferenceId), {
        checkInTotal: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return { alreadyToday };
  });

  const daySnap = await dayRef.get();
  const todayCount = (daySnap.data()?.count as number | undefined) ?? 1;

  return {
    ok: true,
    checkedInToday: true,
    alreadyToday: outcome.alreadyToday,
    todayCount,
    todayKey,
  };
});

/** Authed user: non-consuming validity check for inline UI feedback. */
export const validateConferenceTicketCode = onCall(defaultCallableOptions, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const uid = request.auth.uid;

  const conferenceId = (request.data?.conferenceId as string | undefined)?.trim();
  const codeInput = (request.data?.code as string | undefined)?.trim();
  if (!conferenceId || !codeInput) {
    throw new HttpsError("invalid-argument", "conferenceId and code are required.");
  }

  const record = await auth.getUser(uid);
  const emailRaw = record.email;
  if (!emailRaw) {
    throw new HttpsError("failed-precondition", "Your account has no email.");
  }

  const conf = await assertConferenceExists(conferenceId);
  const windowCheck = checkConferenceWindow(conf);
  if (!windowCheck.ok) {
    return { valid: false, code: windowCheck.client.code, message: windowCheck.client.message };
  }

  const loaded = await loadTicketClaimContext(conferenceId, emailRaw, codeInput);
  if (!loaded.ok) {
    return { valid: false, code: loaded.client.code, message: loaded.client.message };
  }
  if (loaded.alreadyConsumedByUid != null && loaded.alreadyConsumedByUid !== uid) {
    return { valid: false, code: "USED", message: "This ticket code has already been used." };
  }

  return { valid: true, code: "OK" };
});
