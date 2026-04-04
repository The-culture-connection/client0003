/**
 * onUserCreated Trigger (v1 - Non-blocking, GCIP not required)
 * Initializes user document, data room, and user progress when a new user is created
 *
 * Note: Using v1 API because v2/auth is not available in firebase-functions v7.0.6.
 * v1 auth triggers are non-blocking and don't require GCIP.
 * When v2/auth becomes available, this can be migrated to use onUserCreated from v2/auth.
 */

import * as functions from "firebase-functions/v1";
import {initializeApp, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {isAdminEmail} from "../config/superAdmins";
import {DEFAULT_SIGNUP_ROLE} from "../config/roles";

// Initialize Firebase Admin (only once)
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

// Use v1 API for user creation trigger (non-blocking, doesn't require GCIP)
// Configure v1 function separately - v2 setGlobalOptions will NOT affect this
export const onUserCreated = functions
  .region("us-central1")
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
  })
  .auth.user()
  .onCreate(async (user) => {
    const uid = user.uid;
    const userEmail = user.email || null;

    // Check if user is an admin based on email
    const isAdmin = isAdminEmail(userEmail);
    // Default role for all new users is "Digital Curriculum Students"
    // Admin emails get "Admin" role instead
    const initialRoles: string[] = isAdmin ? ["Admin"] : [DEFAULT_SIGNUP_ROLE];

    logger.info(`User created: ${uid}`, {
      email: userEmail,
      displayName: user.displayName,
      isAdmin,
      initialRoles,
    });

    try {
      // Set custom claims with initial roles
      await auth.setCustomUserClaims(uid, {
        roles: initialRoles,
      });
      logger.info(`Roles assigned to ${uid} (${userEmail}): ${initialRoles.join(", ")}`);

      const batch = db.batch();

      // 1. Create /users/{uid} document
      const userRef = db.collection("users").doc(uid);
      batch.set(userRef, {
        uid: uid,
        email: userEmail,
        display_name: user.displayName || null,
        photo_url: user.photoURL || null,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
        roles: initialRoles, // Set initial roles (Admin if applicable, otherwise Digital Curriculum Students)
        email_verified: user.emailVerified || false,
        badges: {
          earned: [],
          visible: [],
        },
        membership: {
          status: "active",
          paid_modules: [],
        },
        permissions: {
          hidden_videos: [],
        },
        points: {
          balance: 0,
          history_summary: [],
        },
        profile_completed: false,
        onboarding_status: "needs_profile",
      });

      // 2. Create /data_rooms/{uid} document
      const dataRoomRef = db.collection("data_rooms").doc(uid);
      batch.set(dataRoomRef, {
        user_id: uid,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
        // Additional data room fields can be added here
      });

      // 3. Create /user_progress/{uid} document
      const userProgressRef = db.collection("user_progress").doc(uid);
      batch.set(userProgressRef, {
        user_id: uid,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
        total_points: 0,
        level: 1,
        // Additional progress fields can be added here
      });

      // Commit the batch
      await batch.commit();
      logger.info(`Successfully initialized user documents for ${uid}`);

      // 4. Log analytics event (fire and forget)
      db.collection("analytics_events").doc().set({
        event_type: "user_created",
        user_id: uid,
        timestamp: FieldValue.serverTimestamp(),
        metadata: {
          email: user.email || null,
          provider: user.providerData?.[0]?.providerId || "unknown",
        },
      }).catch((error) => {
        logger.error(`Error logging analytics event for ${uid}:`, error);
      });
    } catch (error) {
      logger.error(`Error initializing user ${uid}:`, error);
      // Don't throw - allow user creation to proceed even if Firestore init fails
    }
  });
