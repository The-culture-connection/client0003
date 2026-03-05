/**
 * Simple script to assign Admin role to a specific user
 * Uses Firebase CLI authentication
 * 
 * Usage: node infra/scripts/assign-superadmin-simple.js <user-email>
 */

const admin = require("firebase-admin");

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error("❌ Error: Please provide an email address");
  console.log("Usage: node infra/scripts/assign-superadmin-simple.js <email>");
  process.exit(1);
}

// Initialize Admin SDK using Application Default Credentials
// Make sure you're logged in: firebase login
if (admin.apps.length === 0) {
  try {
    // Try to use Application Default Credentials (from Firebase CLI)
    admin.initializeApp({
      projectId: "mortar-dev",
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    // Fallback: initialize without explicit credential (will try to find it)
    admin.initializeApp({
      projectId: "mortar-dev",
    });
  }
}

const db = admin.firestore();
const auth = admin.auth();

async function assignAdmin() {
  try {
    console.log(`🔧 Assigning Admin role to ${email}...\n`);

    // Find user by email
    const user = await auth.getUserByEmail(email);
    console.log(`✓ Found user: ${user.uid}\n`);

    // Check current roles
    const currentRoles = (user.customClaims?.roles || []);
    
    if (currentRoles.includes("Admin")) {
      console.log(`✅ User already has Admin role`);
      return;
    }

    // Add Admin role
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
      await userRef.set({
        uid: user.uid,
        email: email,
        roles: newRoles,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    console.log(`✅ Successfully assigned Admin role to ${email}`);
    console.log(`\n⚠️  IMPORTANT: User must sign out and sign back in to see the role!`);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      console.error(`❌ Error: User with email ${email} not found`);
    } else {
      console.error("❌ Error:", error.message);
    }
    process.exit(1);
  }
}

assignAdmin()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
