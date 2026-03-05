# Deployment Next Steps

## Current Status

✅ **Deployment Complete!**
- Functions deployed successfully
- Firestore rules deployed
- Firestore indexes deployed

⚠️ **Action Required**: Clean up duplicate function

## Step 1: Delete Old Function

You currently have TWO functions doing the same thing:
- `onUserCreated(us-central1)` - Old function (needs deletion)
- `onUserCreatedTrigger(us-central1)` - New function (working)

**Delete the old function:**

```bash
firebase functions:delete onUserCreated --region us-central1
```

Or via Firebase Console:
1. Go to https://console.firebase.google.com/project/mortar-dev/functions
2. Find `onUserCreated(us-central1)`
3. Click the three dots → Delete

## Step 2: Redeploy (Optional - to fix function name)

The code now exports `onUserCreated` (not `onUserCreatedTrigger`). To match the code:

```bash
firebase deploy --only functions
```

This will:
- Delete `onUserCreatedTrigger` (since it's not in code anymore)
- Create/update `onUserCreated` (matches your code)

## Step 3: Verify Deployment

### Test User Creation

1. **Create a test user** in Firebase Console or via your web app:
   - Go to https://console.firebase.google.com/project/mortar-dev/authentication/users
   - Click "Add user" → Enter email/password
   - Or use your web app to sign up

2. **Verify in Firestore Console**:
   - Go to https://console.firebase.google.com/project/mortar-dev/firestore
   - Check that these documents were auto-created:
     - ✅ `/users/{uid}` - User document with email, roles, timestamps
     - ✅ `/data_rooms/{uid}` - Data room document
     - ✅ `/user_progress/{uid}` - Progress document with total_points: 0, level: 1
     - ✅ `/analytics_events/{event_id}` - Analytics event with `event_type: "user_created"`

### Test Role Assignment

1. **Set up a superAdmin user**:
   ```bash
   # Via Firebase Console or your web app, ensure you have a user with superAdmin role
   ```

2. **Call `setUserRole()` function**:
   - Use Firebase Console Functions tab → Test function
   - Or call from your web app (if you have a UI for it)
   - Parameters:
     ```json
     {
       "target_uid": "USER_UID_HERE",
       "role": "contentAdmin",
       "action": "add"
     }
     ```

3. **Verify**:
   - ✅ Function returns success
   - ✅ In Firestore: `/users/{target_uid}.roles` includes `contentAdmin`
   - ✅ In Auth: Custom claims updated (check in Firebase Console → Authentication → Users → Select user → Custom claims)

### Test Security Rules

1. **Try to read another user's data** (should be denied):
   - Use Firebase Console → Firestore → Try to read `/users/{other_user_uid}`
   - Should fail unless you're an admin

2. **Try to write to `/users/{uid}`** (should be denied):
   - Only Functions can write to user documents
   - Direct client writes should be blocked

## Step 4: Test in Web App

1. **Update web app to use dev project**:
   ```bash
   cd web
   # Ensure .env.local has:
   # NEXT_PUBLIC_FIREBASE_ENV=dev
   # NEXT_PUBLIC_FIREBASE_PROJECT_ID=mortar-dev
   # NEXT_PUBLIC_USE_EMULATOR=false
   ```

2. **Start web app**:
   ```bash
   npm run dev
   ```

3. **Test**:
   - Sign up with a new email
   - Verify user info displayed
   - Verify roles displayed (should be empty for new user)
   - Sign in as superAdmin
   - Test `setUserRole()` function
   - Verify roles update after token refresh

## Step 5: Monitor Function Logs

```bash
firebase functions:log
```

Or in Firebase Console:
- https://console.firebase.google.com/project/mortar-dev/functions/logs

Check for:
- ✅ `onUserCreated` trigger firing when users are created
- ✅ No errors in function execution
- ✅ Analytics events being logged

## Troubleshooting

### Function Not Triggering

- Check function logs: `firebase functions:log`
- Verify function is deployed: `firebase functions:list`
- Check Firestore rules allow function writes

### Documents Not Created

- Check function logs for errors
- Verify Firestore permissions
- Check function has proper Firestore access

### Roles Not Updating

- Verify user calling `setUserRole()` has `superAdmin` role
- Check function logs for errors
- Ensure client refreshes token after role update

## Success Criteria

✅ **Phase 0 is complete when:**
1. User creation triggers document creation automatically
2. `setUserRole()` function works and updates claims + Firestore
3. Security rules enforce deny-by-default
4. Web app can authenticate and display roles
5. Same behavior in dev project as emulator

## Next Phase

Once Phase 0 is verified, you're ready for:
- Phase 1: Core features implementation
- Adding more functions
- Expanding security rules
- Building out web/mobile features
