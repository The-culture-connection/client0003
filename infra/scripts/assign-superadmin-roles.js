/**
 * Script to assign Admin role to existing users based on approved emails
 * 
 * Usage: 
 *   For emulator: node infra/scripts/assign-superadmin-roles.js
 *   For dev: node infra/scripts/assign-superadmin-roles.js --env dev
 *   For production: node infra/scripts/assign-superadmin-roles.js --env prod
 */

const admin = require("firebase-admin");

// Admin emails from App Metadata
const ADMIN_EMAILS = [
  "shannon@wearemortar.com",
  "masters@wearemortar.com",
  "grace@wearemortar.com",
  "gshort03@gmail.com",
  "grace-s@the-culture-connection.com",
];

/**
 * Check if an email is an admin email
 */
function isAdminEmail(email) {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase();
  return ADMIN_EMAILS.includes(normalizedEmail);
}

// Parse command line arguments
const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith("--env"));
const env = envArg ? envArg.split("=")[1] || "dev" : "dev";

// Map environment to project ID
const projectMap = {
  dev: "mortar-dev",
  stage: "mortar-stage",
  prod: "mortar-9d29d",
};

const projectId = projectMap[env] || projectMap.dev;

// Only use emulators if explicitly requested via USE_EMULATOR env var
// By default, connect to real Firebase project
const useEmulator = process.env.USE_EMULATOR === "true";

if (useEmulator) {
  // Connect to emulators
  process.env.FIRESTORE_EMULATOR_HOST = "localhost:8085";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
  console.log("🔌 Using Firebase Emulators");
} else {
  console.log(`🌐 Connecting to Firebase project: ${projectId}`);
}

// Initialize Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: projectId,
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function assignAdminRoles() {
  console.log(`🔧 Assigning Admin roles (${env} environment)...\n`);

  try {
    // Get all users
    console.log("📋 Fetching all users...");
    const listUsersResult = await auth.listUsers();
    const users = listUsersResult.users;

    console.log(`Found ${users.length} users\n`);

    let updatedCount = 0;
    let alreadyAdminCount = 0;
    let notAdminEmailCount = 0;

    // Process each user
    for (const user of users) {
      const email = user.email;
      
      if (!email) {
        console.log(`⚠️  Skipping user ${user.uid} (no email)`);
        continue;
      }

      // Check if email is in admin list
      if (!isAdminEmail(email)) {
        notAdminEmailCount++;
        continue;
      }

      // Check current roles
      const currentRoles = (user.customClaims?.roles || []);
      const isAlreadyAdmin = currentRoles.includes("Admin");

      if (isAlreadyAdmin) {
        console.log(`✓ ${email} already has Admin role`);
        alreadyAdminCount++;
        continue;
      }

      // Assign Admin role
      const newRoles = [...currentRoles, "Admin"];
      
      await auth.setCustomUserClaims(user.uid, {
        ...user.customClaims,
        roles: newRoles,
      });

      // Update Firestore
      const userRef = db.collection("users").doc(user.uid);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        await userRef.update({
          roles: newRoles,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // User document doesn't exist, create it
        await userRef.set({
          uid: user.uid,
          email: email,
          roles: newRoles,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      console.log(`✅ Assigned Admin role to ${email} (${user.uid})`);
      updatedCount++;
    }

    console.log("\n📊 Summary:");
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Already Admin: ${alreadyAdminCount}`);
    console.log(`   Not Admin email: ${notAdminEmailCount}`);
    console.log(`   Total processed: ${users.length}`);

    if (updatedCount > 0) {
      console.log("\n⚠️  IMPORTANT: Users must refresh their ID tokens to see the new role!");
      console.log("   They can do this by signing out and signing back in.");
    }

    console.log("\n✅ Done!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run script
assignAdminRoles()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
