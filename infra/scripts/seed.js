/**
 * Seed script for Firebase Emulator Suite
 * Populates local emulators with test data
 * 
 * Usage: node infra/scripts/seed.js
 * Make sure emulators are running first!
 */

const admin = require("firebase-admin");

// Initialize Admin SDK with emulator settings
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: "mortar-dev",
  });
}

// Connect to emulators
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8085";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";

const db = admin.firestore();
const auth = admin.auth();

async function seed() {
  console.log("🌱 Starting seed process...");

  try {
    // Create test users
    const testUsers = [
      {
        email: "superadmin@test.com",
        password: "test123456",
        displayName: "Super Admin",
        roles: ["superAdmin"],
      },
      {
        email: "contentadmin@test.com",
        password: "test123456",
        displayName: "Content Admin",
        roles: ["contentAdmin"],
      },
      {
        email: "eventadmin@test.com",
        password: "test123456",
        displayName: "Event Admin",
        roles: ["eventAdmin"],
      },
      {
        email: "moderator@test.com",
        password: "test123456",
        displayName: "Moderator",
        roles: ["moderator"],
      },
      {
        email: "analyst@test.com",
        password: "test123456",
        displayName: "Analyst",
        roles: ["analyst"],
      },
      {
        email: "user@test.com",
        password: "test123456",
        displayName: "Regular User",
        roles: [],
      },
    ];

    console.log("👤 Creating test users...");
    
    // Process users in parallel for better performance
    const userPromises = testUsers.map(async (userData) => {
      try {
        const userRecord = await auth.createUser({
          email: userData.email,
          password: userData.password,
          displayName: userData.displayName,
          emailVerified: true,
        });

        // Set custom claims
        if (userData.roles.length > 0) {
          await auth.setCustomUserClaims(userRecord.uid, {
            roles: userData.roles,
          });
        }

        // Batch all Firestore writes for this user
        const batch = db.batch();
        
        // Create user document (simulating onUserCreated trigger)
        const userRef = db.collection("users").doc(userRecord.uid);
        batch.set(userRef, {
          uid: userRecord.uid,
          email: userData.email,
          display_name: userData.displayName,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          roles: userData.roles,
          email_verified: true,
        });

        // Create data room
        const dataRoomRef = db.collection("data_rooms").doc(userRecord.uid);
        batch.set(dataRoomRef, {
          user_id: userRecord.uid,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Create user progress
        const userProgressRef = db.collection("user_progress").doc(userRecord.uid);
        batch.set(userProgressRef, {
          user_id: userRecord.uid,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          total_points: 0,
          level: 1,
        });

        // Commit batch (single write operation)
        await batch.commit();

        console.log(`  ✓ Created user: ${userData.email} (${userRecord.uid})`);
        return {success: true, email: userData.email, uid: userRecord.uid};
      } catch (error) {
        if (error.code === "auth/email-already-exists") {
          console.log(`  ⚠ User already exists: ${userData.email}`);
          return {success: false, email: userData.email, reason: "exists"};
        } else {
          console.error(`  ✗ Error creating user ${userData.email}:`, error.message);
          return {success: false, email: userData.email, reason: "error", error: error.message};
        }
      }
    });

    // Wait for all users to be created in parallel
    await Promise.all(userPromises);

    console.log("✅ Seed process completed!");
    console.log("\n📝 Test users created:");
    testUsers.forEach((user) => {
      console.log(`   ${user.email} (${user.password}) - Roles: ${user.roles.join(", ") || "none"}`);
    });
  } catch (error) {
    console.error("❌ Seed process failed:", error);
    process.exit(1);
  }
}

// Run seed
seed()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
