/**
 * Authentication utilities for Digital Curriculum
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User,
  getIdTokenResult,
  FirebaseError,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export interface UserWithRoles extends User {
  roles?: string[];
}

/** Map Firebase Auth error codes to user-friendly messages */
function getAuthErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Email and password do not match.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled": "This account has been disabled. Contact support.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Email and password do not match.",
    "auth/too-many-requests": "Too many failed attempts. Please try again later or reset your password.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/email-already-in-use": "An account with this email already exists. Sign in instead.",
    "auth/operation-not-allowed": "This sign-in method is not enabled. Contact support.",
    "auth/requires-recent-login": "Please sign in again to complete this action.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
  };
  return messages[code] || "Something went wrong. Please try again.";
}

function wrapAuthError(err: unknown): never {
  if (err && typeof err === "object" && "code" in err && typeof (err as FirebaseError).code === "string") {
    throw new Error(getAuthErrorMessage((err as FirebaseError).code));
  }
  if (err instanceof Error) throw err;
  throw new Error("Authentication failed.");
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (err) {
    wrapAuthError(err);
  }
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<User> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (err) {
    wrapAuthError(err);
  }
}

/**
 * Send a password reset email to the given address
 */
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && typeof (err as FirebaseError).code === "string") {
      const code = (err as FirebaseError).code;
      if (code === "auth/user-not-found") {
        // Don't reveal that the user doesn't exist; same message as success for security
        return;
      }
      throw new Error(getAuthErrorMessage(code));
    }
    throw err;
  }
}

/**
 * Sign out
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Get current user with roles from custom claims, with Firestore users/{uid}.roles as source of truth when present
 */
/** Resolve `p`, or reject after `ms` so one stalled request can't hang the app. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

const ROLES_CACHE_MS = 15_000;
let rolesCache: { uid: string; at: number; promise: Promise<string[]> } | null = null;

/**
 * Get the current user with roles. Many pages call this on load; within a short
 * window they share one lookup instead of each re-reading `users/{uid}`.
 * Pass `{ fresh: true }` after a role change to bypass the cache.
 */
export async function getCurrentUserWithRoles(
  options?: { fresh?: boolean }
): Promise<UserWithRoles | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const now = Date.now();
  if (
    options?.fresh ||
    !rolesCache ||
    rolesCache.uid !== user.uid ||
    now - rolesCache.at > ROLES_CACHE_MS
  ) {
    rolesCache = { uid: user.uid, at: now, promise: loadRoles(user) };
    // Don't keep a failed lookup cached.
    rolesCache.promise.catch(() => {
      rolesCache = null;
    });
  }
  const roles = await rolesCache.promise;
  return {
    ...user,
    roles,
  };
}

async function loadRoles(user: User): Promise<string[]> {
  let roles: string[] = [];

  try {
    // 1. Prefer Firestore (source of truth for roles stored in DB, e.g. Admin/superAdmin)
    const userRef = doc(db, "users", user.uid);
    const userSnap = await withTimeout(getDoc(userRef), 10_000);
    if (userSnap.exists()) {
      const data = userSnap.data();
      const firestoreRoles = data?.roles;
      if (Array.isArray(firestoreRoles)) {
        roles = firestoreRoles.filter((r) => typeof r === "string");
      }
    }
  } catch (_e) {
    // Firestore read failed (e.g. rules); fall through to token
  }

  // 2. If no roles from Firestore, use custom claims (ID token)
  if (roles.length === 0) {
    try {
      const tokenResult = await withTimeout(getIdTokenResult(user, true), 8_000);
      const rolesClaim = (tokenResult.claims.roles ?? {}) as Record<string, boolean> | string[];
      if (Array.isArray(rolesClaim)) {
        roles = rolesClaim;
      } else if (typeof rolesClaim === "object") {
        roles = Object.keys(rolesClaim).filter((k) => rolesClaim[k]);
      }
    } catch {
      // keep roles []
    }
  }

  return roles;
}

/**
 * Auth state observer
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
