/**
 * Expansion Network: eligible users, invite codes, session init, claim flow.
 * Role strings must match product exactly (case-sensitive).
 */
import { initializeApp } from "firebase-admin/app";
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

initializeApp();
const db = getFirestore();
const auth = getAuth();

/**
 * Gen 2 callables run on **Cloud Run**. Browsers send an **OPTIONS** preflight
 * before POST; that request carries **no** Google IAM identity. If the Cloud Run
 * service is not invokable by `allUsers`, the load balancer can return 403 with
 * **no CORS headers** → "No Access-Control-Allow-Origin" in DevTools.
 *
 * `invoker: "public"` only opens the **HTTP** endpoint; handlers still enforce
 * Firebase Auth (`request.auth`) or your own checks (e.g. admin callables).
 *
 * `cors` uses full origins (scheme + host) and/or RegExp — see [callableCorsAllowlist.ts](callableCorsAllowlist.ts).
 */
const defaultCallableOptions = {
  invoker: "public" as const,
  cors: callableCorsAllowlist,
};

const ELIGIBLE = "eligibleUsers";
const INVITES = "inviteCodes";
const USERS = "users";

/** Canonical role values — do not rename. */
export const CANONICAL_ROLES = [
  "superAdmin",
  "Admin",
  "Alumni",
  "Digital Curriculum Alumni",
  "Digital Curriculum Students",
] as const;
export type CanonicalRole = (typeof CANONICAL_ROLES)[number];

export function networkAccessForRole(role: string): boolean {
  switch (role) {
    case "Digital Curriculum Students":
      return false;
    case "superAdmin":
    case "Admin":
    case "Alumni":
    case "Digital Curriculum Alumni":
      return true;
    default:
      return false;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertCanonicalRole(role: string): asserts role is CanonicalRole {
  if (!CANONICAL_ROLES.includes(role as CanonicalRole)) {
    throw new HttpsError("invalid-argument", `Invalid role: ${role}`);
  }
}

function randomInviteCode(): string {
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

function onboardingCompleteFromUserData(u: DocumentData | undefined): boolean {
  if (!u) return false;
  if (u.onboardingComplete === true && u.profileCreated === true) return true;
  if (u.expansionOnboardingComplete === true) return true;
  if (u.onboarding_status === "complete") return true;
  return false;
}

/** Firebase Admin Auth / Google API errors are not HttpsErrors; rethrowing them becomes `[internal] INTERNAL` on the client. */
function readErrorCode(e: unknown): string {
  if (e && typeof e === "object" && "code" in e) {
    return String((e as { code: unknown }).code);
  }
  return "";
}

function readErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

/**
 * Maps Firebase Admin Auth and related failures to [HttpsError] so the app shows a useful message
 * instead of `[internal] INTERNAL`.
 */
function mapClaimAccountErrorToHttps(e: unknown, phase: string): HttpsError {
  const code = readErrorCode(e);
  const msg = readErrorMessage(e);
  console.error(`claimInviteAndCreateAccount:${phase}`, code, msg, e);

  if (code === "auth/email-already-exists") {
    return new HttpsError(
      "already-exists",
      "An account already exists for this email. Use “Already have an account?” to sign in.",
    );
  }
  if (code === "auth/invalid-email") {
    return new HttpsError("invalid-argument", "This email address is not valid.");
  }
  if (code === "auth/weak-password" || code === "auth/invalid-password") {
    return new HttpsError(
      "invalid-argument",
      "Password does not meet Firebase requirements. Try a longer or stronger password.",
    );
  }
  if (code === "auth/operation-not-allowed") {
    return new HttpsError(
      "failed-precondition",
      "Email/password sign-up is disabled for this Firebase project. Enable it in Firebase Console → Authentication → Sign-in method.",
    );
  }
  if (code === "auth/uid-already-exists") {
    return new HttpsError(
      "already-exists",
      "This account already exists. Try signing in instead.",
    );
  }
  if (code === "auth/internal-error") {
    return new HttpsError(
      "unavailable",
      "Firebase Auth returned a temporary error. Try again in a few moments.",
    );
  }
  const looksLikeFirestorePermissionDenied =
    code === "7" ||
    code === "PERMISSION_DENIED" ||
    /PERMISSION_DENIED|permission denied|insufficient permissions/i.test(msg);

  if (looksLikeFirestorePermissionDenied) {
    if (phase === "batch.commit") {
      return new HttpsError(
        "failed-precondition",
        "Firestore returned PERMISSION_DENIED on the server write. Cloud Functions use the Admin SDK, so client Security Rules (even fully open rules) do not apply to this operation. Fix IAM: Google Cloud Console → IAM → find the Cloud Functions / Cloud Run runtime service account (often PROJECT_ID@appspot.gserviceaccount.com or …-compute@developer.gserviceaccount.com) and ensure it has “Cloud Datastore User” or “Editor” (or “Firebase Admin”) on this GCP project. Also confirm the Functions project matches the Firestore database (firebase use / same project as the app).",
      );
    }
    return new HttpsError(
      "failed-precondition",
      `Permission denied during ${phase}. Code: ${code || "n/a"}. Check Cloud Function logs and GCP IAM.`,
    );
  }
  if (
    msg.includes("signBlob") ||
    msg.includes("iam.serviceAccounts") ||
    code === "403" ||
    msg.includes("Permission 'iam.serviceAccounts.signBlob'")
  ) {
    return new HttpsError(
      "failed-precondition",
      "Server cannot mint a sign-in token. (1) If the function runs as PROJECT_ID@appspot.gserviceaccount.com: IAM → Service Accounts → open that account → Permissions → Grant Access → New principal = the SAME email → role Service Account Token Creator (signing needs this on self). (2) Or grant …-compute@developer.gserviceaccount.com Token Creator on PROJECT_ID@appspot.gserviceaccount.com. (3) Check Cloud Run → claiminviteandcreateaccount → Service account. Roles on firebase-adminsdk-… only apply if that SA is the runtime identity.",
    );
  }

  const hint = code ? ` (${code})` : "";
  return new HttpsError(
    "internal",
    `Registration failed${hint}. Try again or contact support. If this keeps happening, check Cloud Function logs for claimInviteAndCreateAccount.`,
  );
}

/** Shared invite + eligible row checks (latest invite only). */
interface ClaimInviteContext {
  normalizedEmail: string;
  emailTrimmed: string;
  eligibleRef: DocumentReference;
  el: DocumentData;
  invRef: DocumentReference;
  inv: DocumentData;
}

type LoadInviteResult =
  | { ok: false; client: { ok: false; code: string; message?: string } }
  | { ok: true; ctx: ClaimInviteContext; alreadyConsumedByUid: string | null };

async function loadInviteClaimContext(
  emailRaw: string,
  inviteCodeTrimmed: string,
): Promise<LoadInviteResult> {
  const normalizedEmail = normalizeEmail(emailRaw);
  const eligibleRef = db.collection(ELIGIBLE).doc(normalizedEmail);
  const eligibleSnap = await eligibleRef.get();

  if (!eligibleSnap.exists) {
    return {
      ok: false,
      client: {
        ok: false,
        code: "NOT_ELIGIBLE",
        message: "This email is not approved for alumni network access.",
      },
    };
  }

  const el = eligibleSnap.data()!;
  if (el.networkAccess !== true) {
    return {
      ok: false,
      client: {
        ok: false,
        code: "NO_NETWORK_ACCESS",
        message:
          "Your account is recognized, but you do not currently have alumni network access.",
      },
    };
  }

  const latestId = el.latestInviteCodeId as string | null | undefined;
  if (!latestId) {
    return { ok: false, client: { ok: false, code: "NO_INVITE", message: "This invite code is invalid." } };
  }

  const invRef = db.collection(INVITES).doc(latestId);
  const invSnap = await invRef.get();
  if (!invSnap.exists) {
    return { ok: false, client: { ok: false, code: "INVALID_CODE", message: "This invite code is invalid." } };
  }

  const inv = invSnap.data()!;
  if (inv.revoked === true) {
    return { ok: false, client: { ok: false, code: "REVOKED", message: "This invite code is invalid." } };
  }

  const exp = inv.expiresAt as Timestamp | undefined;
  if (exp && exp.toMillis() < Date.now()) {
    return {
      ok: false,
      client: {
        ok: false,
        code: "EXPIRED",
        message:
          "This invite code has expired. Please contact an administrator for a new one.",
      },
    };
  }

  if ((inv.normalizedEmail as string) !== normalizedEmail) {
    return { ok: false, client: { ok: false, code: "INVALID_CODE", message: "This invite code is invalid." } };
  }

  const storedCode = (inv.code as string | undefined)?.trim();
  if (!storedCode || storedCode !== inviteCodeTrimmed) {
    return { ok: false, client: { ok: false, code: "INVALID_CODE", message: "This invite code is invalid." } };
  }

  let alreadyConsumedByUid: string | null = null;
  if (inv.used === true) {
    alreadyConsumedByUid = (inv.usedByUid as string) || null;
  }

  return {
    ok: true,
    ctx: {
      normalizedEmail,
      emailTrimmed: emailRaw.trim(),
      eligibleRef,
      el,
      invRef,
      inv,
    },
    alreadyConsumedByUid,
  };
}

/** Authenticated: sync users/{uid} from eligibleUsers, return routing state. */
export const initializeUserSession = onCall(defaultCallableOptions, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const uid = request.auth.uid;
  const record = await auth.getUser(uid);
  if (record.disabled) {
    return {
      state: "UNAUTHORIZED",
      reason: "account_disabled",
      message: "This account has been disabled.",
    };
  }
  const emailRaw = record.email;
  if (!emailRaw) {
    throw new HttpsError("failed-precondition", "Your account has no email.");
  }
  const normalizedEmail = normalizeEmail(emailRaw);
  const eligibleRef = db.collection(ELIGIBLE).doc(normalizedEmail);
  const eligibleSnap = await eligibleRef.get();

  if (!eligibleSnap.exists) {
    return {
      state: "UNAUTHORIZED",
      reason: "not_eligible",
      message: "Your account is not authorized for this network.",
    };
  }

  const el = eligibleSnap.data()!;
  const networkAccess = el.networkAccess === true;
  if (!networkAccess) {
    return {
      state: "UNAUTHORIZED",
      reason: "no_network_access",
      message:
        "Your account is recognized, but you do not currently have alumni network access.",
    };
  }

  const role = el.role as string;
  const userRef = db.collection(USERS).doc(uid);
  const userSnap = await userRef.get();
  const prev = userSnap.data() || {};

  if (prev.account_banned === true) {
    return {
      state: "UNAUTHORIZED",
      reason: "account_banned",
      message: "This account is not allowed to use the network.",
    };
  }

  const patch: Record<string, unknown> = {
    uid,
    email: emailRaw,
    normalizedEmail,
    role,
    roles: [role],
    networkAccess: true,
    eligibleUserEmail: normalizedEmail,
    updatedAt: FieldValue.serverTimestamp(),
    lastLoginAt: FieldValue.serverTimestamp(),
    expansion_mobile_app_account_created: true,
  };
  if (prev.expansion_mobile_app_account_created !== true) {
    patch.expansion_mobile_app_account_created_at = FieldValue.serverTimestamp();
  }
  await userRef.set(patch, { merge: true });

  const merged = { ...prev, ...(await userRef.get()).data() };
  const ready = onboardingCompleteFromUserData(merged);

  return {
    state: ready ? "READY_FOR_HOME" : "REQUIRES_ONBOARDING",
    role,
    networkAccess: true,
    normalizedEmail,
    cohortId: (el.cohortId as string) || null,
  };
});

/**
 * Public: claim invite, create Auth user with email/password, link Firestore.
 * Does **not** return a custom token — the client signs in with the same password via
 * `signInWithEmailAndPassword`, avoiding `iam.serviceAccounts.signBlob` / IAM on Cloud Run.
 */
export const claimInviteAndCreateAccount = onCall(
  defaultCallableOptions,
  async (request) => {
    const emailRaw = request.data?.email as string | undefined;
    const inviteCode = (request.data?.inviteCode as string | undefined)?.trim();
    const password = request.data?.password as string | undefined;

    if (!emailRaw || !inviteCode || !password) {
      throw new HttpsError("invalid-argument", "email, inviteCode, and password are required.");
    }
    if (password.length < 6) {
      throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");
    }

    const loaded = await loadInviteClaimContext(emailRaw, inviteCode);
    if (!loaded.ok) {
      return loaded.client;
    }
    if (loaded.alreadyConsumedByUid != null) {
      return {
        ok: false,
        code: "USED",
        message: "This invite code has already been used.",
      };
    }

    const { ctx } = loaded;
    const { normalizedEmail, eligibleRef, el, invRef } = ctx;

    let uid: string;
    try {
      const existing = await auth.getUserByEmail(emailRaw.trim());
      return {
        ok: false,
        code: "ALREADY_EXISTS",
        message: "An account already exists for this email. Please log in instead.",
        existingUid: existing.uid,
      };
    } catch (e: unknown) {
      if (readErrorCode(e) !== "auth/user-not-found") {
        throw mapClaimAccountErrorToHttps(e, "getUserByEmail");
      }
    }

    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: emailRaw.trim(),
        password,
        emailVerified: false,
      });
    } catch (e: unknown) {
      throw mapClaimAccountErrorToHttps(e, "createUser");
    }
    uid = userRecord.uid;

    const batch = db.batch();
    batch.update(invRef, {
      used: true,
      usedAt: FieldValue.serverTimestamp(),
      usedByUid: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(
      eligibleRef,
      {
        linkedUid: uid,
        accountClaimed: true,
        claimedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const userRef = db.collection(USERS).doc(uid);
    batch.set(
      userRef,
      {
        uid,
        email: emailRaw.trim(),
        normalizedEmail,
        role: el.role,
        roles: [el.role],
        networkAccess: true,
        profileCreated: false,
        onboardingComplete: false,
        eligibleUserEmail: normalizedEmail,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    try {
      await batch.commit();
    } catch (e: unknown) {
      throw mapClaimAccountErrorToHttps(e, "batch.commit");
    }

    const userSnap = await userRef.get();
    const ready = onboardingCompleteFromUserData(userSnap.data());

    return {
      ok: true,
      /** Client must call `signInWithEmailAndPassword` with the same email/password. */
      signInWithEmailPassword: true,
      state: ready ? "READY_FOR_HOME" : "REQUIRES_ONBOARDING",
      role: el.role,
      cohortId: (el.cohortId as string) || null,
    };
  },
);

/**
 * Authenticated: after email/password sign-in, consume invite and link eligibleUsers (existing Auth accounts).
 */
export const finalizeInviteClaim = onCall(defaultCallableOptions, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const inviteCode = (request.data?.inviteCode as string | undefined)?.trim();
  if (!inviteCode) {
    throw new HttpsError("invalid-argument", "inviteCode is required.");
  }

  const uid = request.auth.uid;
  const record = await auth.getUser(uid);
  const emailRaw = record.email;
  if (!emailRaw) {
    throw new HttpsError("failed-precondition", "Your account has no email.");
  }

  const loaded = await loadInviteClaimContext(emailRaw, inviteCode);
  if (!loaded.ok) {
    return { ...loaded.client, finalizeFailed: true };
  }

  const { ctx, alreadyConsumedByUid } = loaded;
  if (alreadyConsumedByUid != null) {
    if (alreadyConsumedByUid === uid) {
      return { ok: true, alreadyDone: true };
    }
    return {
      ok: false,
      code: "USED",
      message: "This invite code has already been used.",
      finalizeFailed: true,
    };
  }

  const batch = db.batch();
  batch.update(ctx.invRef, {
    used: true,
    usedAt: FieldValue.serverTimestamp(),
    usedByUid: uid,
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(
    ctx.eligibleRef,
    {
      linkedUid: uid,
      accountClaimed: true,
      claimedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const userRef = db.collection(USERS).doc(uid);
  batch.set(
    userRef,
    {
      uid,
      email: emailRaw.trim(),
      normalizedEmail: ctx.normalizedEmail,
      role: ctx.el.role,
      roles: [ctx.el.role],
      networkAccess: true,
      eligibleUserEmail: ctx.normalizedEmail,
      updatedAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
      expansion_mobile_app_account_created: true,
    },
    { merge: true },
  );
  await batch.commit();

  const userSnap = await userRef.get();
  const ready = onboardingCompleteFromUserData(userSnap.data());

  return {
    ok: true,
    state: ready ? "READY_FOR_HOME" : "REQUIRES_ONBOARDING",
    role: ctx.el.role,
    cohortId: (ctx.el.cohortId as string) || null,
  };
});

/** Admin: upsert eligible user. Optionally generate invite for network-access roles. */
export const createOrUpdateEligibleUser = onCall(defaultCallableOptions, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
  await assertCallerIsNetworkAdmin(request.auth.uid);

  const emailRaw = request.data?.email as string | undefined;
  const role = request.data?.role as string | undefined;
  const source = (request.data?.source as string) || "admin_console";
  const generateInvite = request.data?.generateInvite === true;
  const expirationDays = Number(request.data?.expirationDays) || 14;
  const cohortId = (request.data?.cohortId as string) || null;

  if (!emailRaw || !role) {
    throw new HttpsError("invalid-argument", "email and role are required.");
  }
  assertCanonicalRole(role);

  const normalizedEmail = normalizeEmail(emailRaw);
  const networkAccess = networkAccessForRole(role);
  const inviteRequired =
    generateInvite &&
    networkAccess &&
    role !== "Digital Curriculum Students";

  const ref = db.collection(ELIGIBLE).doc(normalizedEmail);
  const now = FieldValue.serverTimestamp();
  const existed = (await ref.get()).exists;

  await ref.set(
    {
      email: emailRaw.trim(),
      normalizedEmail,
      role,
      networkAccess,
      source,
      inviteRequired,
      updatedAt: now,
      ...(cohortId ? { cohortId } : {}),
      ...(!existed ? { createdAt: now } : {}),
    },
    { merge: true },
  );

  let plainCode: string | null = null;
  let inviteId: string | null = null;
  if (inviteRequired) {
    const out = await internalGenerateInvite(
      normalizedEmail,
      role,
      networkAccess,
      request.auth.uid,
      expirationDays,
    );
    plainCode = out.plainCode;
    inviteId = out.inviteId;
    await ref.update({
      latestInviteCodeId: inviteId,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return {
    ok: true,
    normalizedEmail,
    inviteId,
    code: plainCode,
    codePreview: plainCode ? maskedPreview(plainCode) : null,
  };
});

async function internalGenerateInvite(
  normalizedEmail: string,
  role: string,
  networkAccess: boolean,
  createdByUid: string,
  expirationDays: number,
): Promise<{ inviteId: string; plainCode: string }> {
  const eligibleRef = db.collection(ELIGIBLE).doc(normalizedEmail);
  const eligibleSnap = await eligibleRef.get();
  const prevId = eligibleSnap.data()?.latestInviteCodeId as string | undefined;
  if (prevId) {
    await db.collection(INVITES).doc(prevId).update({
      revoked: true,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const code = randomInviteCode();
  const inviteRef = db.collection(INVITES).doc();
  const expiresAt = new Date(Date.now() + expirationDays * 86400000);

  const caller = await auth.getUser(createdByUid);
  const callerEmail = caller.email ? normalizeEmail(caller.email) : "";
  let createdByRole = "Admin";
  if (callerEmail) {
    const ce = await db.collection(ELIGIBLE).doc(callerEmail).get();
    if (ce.data()?.role) createdByRole = ce.data()!.role as string;
  }

  await inviteRef.set({
    inviteId: inviteRef.id,
    normalizedEmail,
    role,
    networkAccess,
    code,
    codePreview: maskedPreview(code),
    expiresAt,
    used: false,
    usedAt: null,
    usedByUid: null,
    revoked: false,
    createdByUid,
    createdByRole,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { inviteId: inviteRef.id, plainCode: code };
}

/** Admin: generate a new invite for an eligible email. */
export const generateInviteCode = onCall(defaultCallableOptions, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
  await assertCallerIsNetworkAdmin(request.auth.uid);

  const emailRaw = request.data?.email as string | undefined;
  const expirationDays = Number(request.data?.expirationDays) || 14;
  if (!emailRaw) throw new HttpsError("invalid-argument", "email is required.");

  const normalizedEmail = normalizeEmail(emailRaw);
  const eligibleSnap = await db.collection(ELIGIBLE).doc(normalizedEmail).get();
  if (!eligibleSnap.exists) {
    throw new HttpsError("not-found", "Eligible user not found.");
  }
  const el = eligibleSnap.data()!;
  if (el.networkAccess !== true) {
    throw new HttpsError("failed-precondition", "User does not have network access.");
  }
  if (el.role === "Digital Curriculum Students") {
    throw new HttpsError(
      "failed-precondition",
      "Invites are not generated for Digital Curriculum Students by default.",
    );
  }

  const { inviteId, plainCode } = await internalGenerateInvite(
    normalizedEmail,
    el.role as string,
    true,
    request.auth.uid,
    expirationDays,
  );

  await db
    .collection(ELIGIBLE)
    .doc(normalizedEmail)
    .update({
      latestInviteCodeId: inviteId,
      inviteRequired: true,
      updatedAt: FieldValue.serverTimestamp(),
    });

  return {
    inviteId,
    code: plainCode,
    codePreview: maskedPreview(plainCode),
    expiresAt: new Date(Date.now() + expirationDays * 86400000).toISOString(),
  };
});

export const revokeInviteCode = onCall(defaultCallableOptions, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
  await assertCallerIsNetworkAdmin(request.auth.uid);

  const inviteId = request.data?.inviteId as string | undefined;
  if (!inviteId) throw new HttpsError("invalid-argument", "inviteId required.");

  await db.collection(INVITES).doc(inviteId).update({
    revoked: true,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

export const bulkUploadEligibleUsers = onCall(defaultCallableOptions, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
  await assertCallerIsNetworkAdmin(request.auth.uid);

  const rows = request.data?.users as
    | { email: string; role: string; cohortId?: string }[]
    | undefined;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new HttpsError("invalid-argument", "users array required.");
  }
  if (rows.length > 500) {
    throw new HttpsError("invalid-argument", "Maximum 500 rows per call.");
  }

  let written = 0;
  for (const row of rows) {
    if (!row.email || !row.role) continue;
    assertCanonicalRole(row.role);
    const normalizedEmail = normalizeEmail(row.email);
    const networkAccess = networkAccessForRole(row.role);
    await db
      .collection(ELIGIBLE)
      .doc(normalizedEmail)
      .set(
        {
          email: row.email.trim(),
          normalizedEmail,
          role: row.role,
          networkAccess,
          source: "bulk_upload",
          inviteRequired: false,
          updatedAt: FieldValue.serverTimestamp(),
          ...(row.cohortId ? { cohortId: row.cohortId } : {}),
        },
        { merge: true },
      );
    written++;
  }
  return { ok: true, written };
});

export const promoteToDigitalCurriculumAlumni = onCall(defaultCallableOptions, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
  await assertCallerIsNetworkAdmin(request.auth.uid);

  const emailRaw = request.data?.email as string | undefined;
  const generateInvite = request.data?.generateInvite === true;
  const expirationDays = Number(request.data?.expirationDays) || 14;
  if (!emailRaw) throw new HttpsError("invalid-argument", "email required.");

  const normalizedEmail = normalizeEmail(emailRaw);
  const ref = db.collection(ELIGIBLE).doc(normalizedEmail);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Eligible user not found.");

  const el = snap.data()!;
  if (el.role !== "Digital Curriculum Students") {
    throw new HttpsError("failed-precondition", "User is not a Digital Curriculum Student.");
  }

  const newRole = "Digital Curriculum Alumni";
  await ref.update({
    role: newRole,
    networkAccess: true,
    updatedAt: FieldValue.serverTimestamp(),
  });

  let code: string | null = null;
  let inviteId: string | null = null;
  if (generateInvite) {
    const out = await internalGenerateInvite(
      normalizedEmail,
      newRole,
      true,
      request.auth.uid,
      expirationDays,
    );
    code = out.plainCode;
    inviteId = out.inviteId;
    await ref.update({
      latestInviteCodeId: inviteId,
      inviteRequired: true,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const linkedUid = el.linkedUid as string | undefined;
  if (linkedUid) {
    await db
      .collection(USERS)
      .doc(linkedUid)
      .set(
        {
          role: newRole,
          roles: [newRole],
          networkAccess: true,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  }

  return { ok: true, inviteId, code, codePreview: code ? maskedPreview(code) : null };
});

/** Public: lightweight check (does not consume invite). Returns whether a Firebase Auth user already exists. */
export const validateInviteCode = onCall(
  defaultCallableOptions,
  async (request) => {
    const emailRaw = request.data?.email as string | undefined;
    const inviteCode = (request.data?.inviteCode as string | undefined)?.trim();
    if (!emailRaw || !inviteCode) {
      throw new HttpsError("invalid-argument", "email and inviteCode required.");
    }

    const loaded = await loadInviteClaimContext(emailRaw, inviteCode);
    if (!loaded.ok) {
      const c = loaded.client.code as string;
      const legacy: Record<string, string> = {
        NOT_ELIGIBLE: "NOT_ELIGIBLE",
        NO_NETWORK_ACCESS: "NOT_ELIGIBLE",
        NO_INVITE: "NO_INVITE",
        INVALID_CODE: "INVALID",
        REVOKED: "REVOKED",
        USED: "USED",
        EXPIRED: "EXPIRED",
      };
      return { valid: false, code: legacy[c] ?? "INVALID" };
    }

    if (loaded.alreadyConsumedByUid != null) {
      return { valid: false, code: "USED" };
    }

    let authAccountExists = false;
    try {
      await auth.getUserByEmail(emailRaw.trim());
      authAccountExists = true;
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code !== "auth/user-not-found") {
        throw e;
      }
    }

    return { valid: true, code: "OK", authAccountExists };
  },
);
