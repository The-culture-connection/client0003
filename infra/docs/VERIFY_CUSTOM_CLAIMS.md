# How to Verify Custom Claims Are Set

## The Problem

If roles show in Firestore but not in the UI, it means:
- ✅ Firestore document has `roles: ["superAdmin"]`
- ❌ Firebase Auth custom claims are NOT set (or token not refreshed)

The UI reads roles from the **ID token's custom claims**, not from Firestore.

## Step 1: Verify Custom Claims in Firebase Console

1. Go to: https://console.firebase.google.com/project/mortar-dev/authentication/users
2. Find the user: `grace-s@the-culture-connection.com`
3. Click on the user
4. Scroll down to **"Custom claims"** section
5. Check if you see:
   ```json
   {
     "roles": ["superAdmin"]
   }
   ```

### If Custom Claims Are Missing

You need to set them:

1. In the user details page, scroll to "Custom claims"
2. Click "Add custom claim"
3. Key: `roles`
4. Value: `["superAdmin"]` (as JSON array - include the brackets and quotes)
5. Click "Save"

## Step 2: Refresh the User's Token

After setting custom claims, the user must refresh their ID token:

### Option A: Use the "Refresh Roles" Button (New)

The web app now has a "Refresh Roles" button that will:
- Force refresh the ID token
- Reload user data with updated roles

### Option B: Sign Out and Sign Back In

1. Click "Sign Out" in the web app
2. Sign back in with the same credentials
3. Roles should now appear

### Option C: Browser Console

Open browser console (F12) and run:
```javascript
const { getAuth, getIdToken } = await import('firebase/auth');
const auth = getAuth();
const user = auth.currentUser;
if (user) {
  await getIdToken(user, true); // Force refresh
  location.reload(); // Reload page
}
```

## Step 3: Verify It's Working

After refreshing:

1. **In the UI**: Should show "Roles: superAdmin"
2. **In Browser Console**: Run this to see the token claims:
   ```javascript
   const { getAuth, getIdToken } = await import('firebase/auth');
   const auth = getAuth();
   const user = auth.currentUser;
   if (user) {
     const token = await getIdToken(user);
     const decoded = JSON.parse(atob(token.split('.')[1]));
     console.log('Custom claims:', decoded);
     console.log('Roles:', decoded.roles);
   }
   ```

## Why This Happens

- **Firestore** = Database (stores user data)
- **Custom Claims** = Part of the ID token (used for security rules and client-side checks)
- **Both need to be in sync** for the system to work correctly

The `onUserCreated` function sets both automatically for new users, but for existing users you need to set custom claims manually.

## Quick Checklist

- [ ] Custom claims set in Firebase Console → Authentication → Users
- [ ] User signed out and back in (or clicked "Refresh Roles")
- [ ] UI shows roles correctly
- [ ] Browser console shows roles in decoded token
