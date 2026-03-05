# How to Assign SuperAdmin Role

## Option 1: Firebase Console (Easiest)

1. Go to https://console.firebase.google.com/project/mortar-dev/authentication/users
2. Find the user with email `grace-s@the-culture-connection.com`
3. Click on the user to open details
4. Scroll down to "Custom claims"
5. Click "Add custom claim"
6. Key: `roles`
7. Value: `["superAdmin"]` (as a JSON array)
8. Click "Save"

**Note**: The user must sign out and sign back in to see the role.

## Option 2: Using Firebase CLI (If you have a service account)

If you have a service account JSON file:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"
node infra/scripts/assign-superadmin-simple.js grace-s@the-culture-connection.com
```

## Option 3: Using setUserRole Function (If you have another superadmin)

If you have access to another superadmin account:

1. Sign in to your web app as that superadmin
2. Open browser console (F12)
3. Run:
```javascript
const { getFunctions, httpsCallable } = await import('firebase/functions');
const functions = getFunctions();
const setUserRole = httpsCallable(functions, 'setUserRole');

// Replace with the actual UID
const targetUid = 'C0dx8vuOtOMmxG40pfdIiiBNY2m1';

await setUserRole({
  target_uid: targetUid,
  role: 'superAdmin',
  action: 'add'
});
```

## Option 4: Manual Firestore Update (Temporary)

You can manually update the Firestore document:

1. Go to https://console.firebase.google.com/project/mortar-dev/firestore
2. Navigate to `users` collection
3. Find document with ID: `C0dx8vuOtOMmxG40pfdIiiBNY2m1`
4. Edit the `roles` field to: `["superAdmin"]`
5. Save

**Note**: This only updates Firestore, not custom claims. The user still won't have the role in their token until custom claims are set.

## For Future Users

✅ **Good news**: The `onUserCreated` function has been updated and deployed. 

Any NEW users who sign up with these emails will automatically get the `superAdmin` role:
- shannon@wearemortar.com
- masters@wearemortar.com
- grace@wearemortar.com
- gshort03@gmail.com
- grace-s@the-culture-connection.com

## Verify Role Assignment

After assigning the role:

1. User must **sign out and sign back in** (to refresh ID token)
2. Check in web app - should show "Roles: superAdmin"
3. Check in Firebase Console → Authentication → Users → Select user → Custom claims should show `roles: ["superAdmin"]`
4. Check in Firestore → `users/{uid}` → `roles` field should be `["superAdmin"]`
