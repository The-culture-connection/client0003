# Testing Firestore Security Rules

This guide shows you how to test that your security rules are working correctly.

## Method 1: Firebase Console (Easiest - Quick Test)

### Test Reading Another User's Data

1. **Get two user UIDs**:
   - Go to https://console.firebase.google.com/project/mortar-dev/authentication/users
   - Note down two different user UIDs (e.g., `user1_uid` and `user2_uid`)

2. **Try to read another user's document**:
   - Go to https://console.firebase.google.com/project/mortar-dev/firestore
   - Navigate to `users` collection
   - Try to open a document that belongs to a different user
   - **Expected**: You should be able to see it (Console uses admin privileges)
   - **Note**: Console always has admin access, so this won't show rule enforcement

### Better: Use Firestore Rules Playground

1. Go to https://console.firebase.google.com/project/mortar-dev/firestore/rules
2. Click "Rules Playground" tab
3. Configure test:
   - **Location**: `users/{userId}`
   - **Authenticated**: Yes
   - **User ID**: `user1_uid` (a user that exists)
   - **Document ID**: `user2_uid` (different user's document)
   - **Operation**: `get` (read)
4. Click "Run"
5. **Expected Result**: ❌ Should fail with "Permission denied"

## Method 2: Client SDK in Web App (Most Realistic)

### Create a Test Script

Create a test file in your web app:

```typescript
// web/src/lib/test-security-rules.ts
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

/**
 * Test reading another user's data
 * This should fail due to security rules
 */
export async function testReadOtherUserData() {
  const auth = getAuth();
  const db = getFirestore();
  
  // Make sure you're signed in as user1
  if (!auth.currentUser) {
    throw new Error("You must be signed in first");
  }
  
  const currentUserUid = auth.currentUser.uid;
  console.log("Current user:", currentUserUid);
  
  // Try to read another user's document
  // Replace 'OTHER_USER_UID' with an actual UID from your database
  const otherUserUid = "OTHER_USER_UID_HERE";
  const otherUserRef = doc(db, "users", otherUserUid);
  
  try {
    const docSnap = await getDoc(otherUserRef);
    if (docSnap.exists()) {
      console.error("❌ SECURITY RULE FAILED: Could read other user's data!");
      console.log("Data:", docSnap.data());
      return false;
    } else {
      console.log("✅ Document doesn't exist (this is fine)");
      return true;
    }
  } catch (error: any) {
    if (error.code === "permission-denied") {
      console.log("✅ SECURITY RULE WORKING: Permission denied as expected");
      return true;
    } else {
      console.error("❌ Unexpected error:", error);
      return false;
    }
  }
}

/**
 * Test reading your own data
 * This should succeed
 */
export async function testReadOwnData() {
  const auth = getAuth();
  const db = getFirestore();
  
  if (!auth.currentUser) {
    throw new Error("You must be signed in first");
  }
  
  const currentUserUid = auth.currentUser.uid;
  const ownUserRef = doc(db, "users", currentUserUid);
  
  try {
    const docSnap = await getDoc(ownUserRef);
    if (docSnap.exists()) {
      console.log("✅ SECURITY RULE WORKING: Can read own data");
      console.log("Data:", docSnap.data());
      return true;
    } else {
      console.error("❌ Your own document doesn't exist");
      return false;
    }
  } catch (error: any) {
    if (error.code === "permission-denied") {
      console.error("❌ SECURITY RULE FAILED: Can't read own data!");
      return false;
    } else {
      console.error("❌ Unexpected error:", error);
      return false;
    }
  }
}

/**
 * Test writing to your own user document
 * This should fail (only Functions can write)
 */
export async function testWriteOwnData() {
  const auth = getAuth();
  const db = getFirestore();
  
  if (!auth.currentUser) {
    throw new Error("You must be signed in first");
  }
  
  const currentUserUid = auth.currentUser.uid;
  const ownUserRef = doc(db, "users", currentUserUid);
  
  try {
    // Try to update your own document
    const { updateDoc } = await import("firebase/firestore");
    await updateDoc(ownUserRef, {
      test_field: "This should fail"
    });
    console.error("❌ SECURITY RULE FAILED: Could write to user document!");
    return false;
  } catch (error: any) {
    if (error.code === "permission-denied") {
      console.log("✅ SECURITY RULE WORKING: Cannot write to user document (Functions only)");
      return true;
    } else {
      console.error("❌ Unexpected error:", error);
      return false;
    }
  }
}
```

### Use in Browser Console

1. **Start your web app**:
   ```bash
   cd web
   npm run dev
   ```

2. **Sign in** as a regular user (not superAdmin)

3. **Open browser console** (F12)

4. **Import and run the test**:
   ```javascript
   // Get the other user's UID from Firestore Console first
   const { testReadOtherUserData, testReadOwnData, testWriteOwnData } = await import('./src/lib/test-security-rules');
   
   // Test 1: Try to read another user's data (should fail)
   await testReadOtherUserData();
   
   // Test 2: Try to read your own data (should succeed)
   await testReadOwnData();
   
   // Test 3: Try to write to your own document (should fail)
   await testWriteOwnData();
   ```

## Method 3: Using Firebase Emulator (Recommended for Development)

### Set Up Test Script

Create a test script that uses the emulator:

```javascript
// infra/scripts/test-rules.js
const admin = require("firebase-admin");
const { initializeApp } = require("firebase/app");
const { getFirestore, connectFirestoreEmulator, doc, getDoc } = require("firebase/firestore");
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = require("firebase/auth");

// Initialize admin (bypasses rules)
admin.initializeApp({
  projectId: "mortar-dev",
});

const adminDb = admin.firestore();

// Initialize client SDK
const app = initializeApp({
  projectId: "mortar-dev",
});

const clientDb = getFirestore(app);
const clientAuth = getAuth(app);

// Connect to emulators
connectFirestoreEmulator(clientDb, "localhost", 8085);
connectAuthEmulator(clientAuth, "http://localhost:9099");

async function testSecurityRules() {
  console.log("🧪 Testing Firestore Security Rules...\n");

  // Create two test users via admin SDK
  const user1 = await admin.auth().createUser({
    email: "testuser1@example.com",
    password: "test123456",
  });
  
  const user2 = await admin.auth().createUser({
    email: "testuser2@example.com",
    password: "test123456",
  });

  // Create user documents via admin SDK
  await adminDb.collection("users").doc(user1.uid).set({
    uid: user1.uid,
    email: "testuser1@example.com",
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  await adminDb.collection("users").doc(user2.uid).set({
    uid: user2.uid,
    email: "testuser2@example.com",
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log("✅ Created test users:", user1.uid, user2.uid);

  // Sign in as user1
  await signInWithEmailAndPassword(clientAuth, "testuser1@example.com", "test123456");
  console.log("✅ Signed in as user1");

  // Test 1: Try to read own data (should succeed)
  try {
    const ownDoc = await getDoc(doc(clientDb, "users", user1.uid));
    if (ownDoc.exists()) {
      console.log("✅ Test 1 PASSED: Can read own user document");
    } else {
      console.log("❌ Test 1 FAILED: Own document doesn't exist");
    }
  } catch (error) {
    console.log("❌ Test 1 FAILED:", error.message);
  }

  // Test 2: Try to read another user's data (should fail)
  try {
    const otherDoc = await getDoc(doc(clientDb, "users", user2.uid));
    if (otherDoc.exists()) {
      console.log("❌ Test 2 FAILED: Could read another user's document!");
    } else {
      console.log("⚠️  Test 2: Document doesn't exist (might be fine)");
    }
  } catch (error) {
    if (error.code === "permission-denied") {
      console.log("✅ Test 2 PASSED: Permission denied as expected");
    } else {
      console.log("❌ Test 2 FAILED with unexpected error:", error.message);
    }
  }

  // Test 3: Try to write to own document (should fail - Functions only)
  try {
    const { updateDoc } = require("firebase/firestore");
    await updateDoc(doc(clientDb, "users", user1.uid), {
      test_field: "should fail"
    });
    console.log("❌ Test 3 FAILED: Could write to user document!");
  } catch (error) {
    if (error.code === "permission-denied") {
      console.log("✅ Test 3 PASSED: Cannot write to user document (Functions only)");
    } else {
      console.log("❌ Test 3 FAILED with unexpected error:", error.message);
    }
  }

  // Cleanup
  await admin.auth().deleteUser(user1.uid);
  await admin.auth().deleteUser(user2.uid);
  await adminDb.collection("users").doc(user1.uid).delete();
  await adminDb.collection("users").doc(user2.uid).delete();

  console.log("\n✅ Tests complete!");
}

// Run tests
testSecurityRules().catch(console.error);
```

### Run the Test

```bash
# Start emulators first
npm run emulators

# In another terminal
node infra/scripts/test-rules.js
```

## Method 4: Using curl (Advanced)

If you want to test with raw HTTP requests:

```bash
# First, get an ID token from your app
# Then use it to make a request to Firestore REST API

curl -X GET \
  "https://firestore.googleapis.com/v1/projects/mortar-dev/databases/(default)/documents/users/OTHER_USER_UID" \
  -H "Authorization: Bearer YOUR_ID_TOKEN_HERE"
```

**Expected response if rules work**:
```json
{
  "error": {
    "code": 403,
    "message": "Permission denied",
    "status": "PERMISSION_DENIED"
  }
}
```

## Quick Test Checklist

- [ ] **Can read own data**: ✅ Should succeed
- [ ] **Cannot read other user's data**: ❌ Should fail with permission denied
- [ ] **Cannot write to user documents**: ❌ Should fail (Functions only)
- [ ] **Can read own data_rooms**: ✅ Should succeed
- [ ] **Cannot read other user's data_rooms**: ❌ Should fail
- [ ] **Can read own user_progress**: ✅ Should succeed
- [ ] **Cannot read other user's user_progress**: ❌ Should fail

## What Success Looks Like

✅ **Security rules are working if:**
- You can read your own documents
- You get "permission denied" when trying to read other users' documents
- You get "permission denied" when trying to write to user documents
- Only Functions can write to user documents (via admin SDK)

## Troubleshooting

### "Permission denied" when reading own data
- Check that you're signed in
- Verify the document ID matches your user UID
- Check security rules allow `request.auth.uid == resource.id`

### Can read other user's data (shouldn't happen)
- Security rules might not be deployed
- Check `firestore.rules` file
- Redeploy rules: `firebase deploy --only firestore:rules`

### Rules not working in emulator
- Make sure emulators are running
- Check emulator is using correct rules file
- Restart emulators after changing rules
