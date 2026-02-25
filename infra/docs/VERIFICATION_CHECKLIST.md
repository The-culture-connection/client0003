# Phase 0 Verification Checklist

Use this checklist to verify that Phase 0 has been implemented correctly.

## Prerequisites

- [ ] Node.js 20+ installed
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Flutter SDK installed (for mobile testing)
- [ ] Firebase projects configured: `mortar-dev`, `mortar-stage`, `mortar-9d29d`

## Local Emulator Testing

### 1. Start Emulators

```bash
npm run emulators
```

- [ ] Emulator UI accessible at http://localhost:4000
- [ ] Auth emulator running on port 9099
- [ ] Firestore emulator running on port 8080
- [ ] Functions emulator running on port 5001

### 2. Seed Test Data

```bash
npm run seed
```

- [ ] Test users created in Auth emulator
- [ ] Documents created in Firestore emulator for each user:
  - [ ] `/users/{uid}`
  - [ ] `/data_rooms/{uid}`
  - [ ] `/user_progress/{uid}`

### 3. Test User Creation via Web App

1. Start web app:
   ```bash
   cd web
   npm run dev
   ```

2. Open http://localhost:3000

3. Sign up with a new email address

4. Verify in Firestore emulator:
   - [ ] `/users/{uid}` document created with:
     - `uid`, `email`, `display_name`, `created_at`, `updated_at`, `roles: []`
   - [ ] `/data_rooms/{uid}` document created
   - [ ] `/user_progress/{uid}` document created with:
     - `user_id`, `total_points: 0`, `level: 1`
   - [ ] `/analytics_events/{event_id}` document created with:
     - `event_type: "user_created"`
     - `user_id` matches the new user's UID

5. Verify in web app:
   - [ ] User is signed in
   - [ ] User info displayed (UID, email, roles: None)

### 4. Test Role Assignment

1. Sign in as `superadmin@test.com` (password: `test123456`)

2. Verify in web app:
   - [ ] User is signed in
   - [ ] Roles displayed: `superAdmin`

3. Call `setUserRole()` function:
   - Open browser console
   - Get another user's UID (from Firestore or create a new user)
   - Call the function:
     ```javascript
     const { setUserRole } = await import('./src/lib/auth');
     await setUserRole('TARGET_UID', 'contentAdmin', 'add');
     ```

4. Verify:
   - [ ] Function returns success
   - [ ] In Firestore: `/users/{target_uid}.roles` updated to include `contentAdmin`
   - [ ] In Auth emulator: Custom claims updated for target user
   - [ ] **IMPORTANT**: Client must refresh token to see changes

5. Sign in as the target user and verify:
   - [ ] Roles displayed include `contentAdmin` (after token refresh)

### 5. Test Role Display

- [ ] Sign in as `contentadmin@test.com` → See `contentAdmin` role
- [ ] Sign in as `eventadmin@test.com` → See `eventAdmin` role
- [ ] Sign in as `moderator@test.com` → See `moderator` role
- [ ] Sign in as `analyst@test.com` → See `analyst` role
- [ ] Sign in as `user@test.com` → See no roles

## Production Deployment Testing

### 1. Deploy to Dev

```bash
firebase use mortar-dev
firebase deploy --only functions,firestore:rules,firestore:indexes
```

- [ ] Functions deployed successfully
- [ ] Security rules deployed successfully
- [ ] Indexes deployed successfully

### 2. Test in Real Dev Project

1. Create a user in the real dev project (via web app or Firebase Console)

2. Verify in Firestore Console:
   - [ ] `/users/{uid}` document created
   - [ ] `/data_rooms/{uid}` document created
   - [ ] `/user_progress/{uid}` document created
   - [ ] `/analytics_events/{event_id}` document created

3. Test `setUserRole()` function:
   - [ ] Sign in as superAdmin
   - [ ] Call `setUserRole()` for another user
   - [ ] Verify custom claims updated
   - [ ] Verify Firestore `/users/{uid}.roles` updated

### 3. Verify Security Rules

1. Try to read `/users/{uid}` as a different user:
   - [ ] Should be denied (unless admin)

2. Try to write to `/users/{uid}`:
   - [ ] Should be denied (only Functions can write)

3. Try to read own `/users/{uid}`:
   - [ ] Should be allowed

## Mobile App Testing (Optional)

1. Start Flutter app:
   ```bash
   cd mobile
   flutter run
   ```

2. Test authentication:
   - [ ] Can sign in with test user
   - [ ] User info displayed
   - [ ] Roles displayed correctly

## CI/CD Verification

- [ ] GitHub Actions workflows created:
  - [ ] `.github/workflows/ci.yml`
  - [ ] `.github/workflows/deploy-dev.yml`
  - [ ] `.github/workflows/deploy-stage.yml`
  - [ ] `.github/workflows/deploy-prod.yml`

- [ ] Workflows run successfully on push/PR

## Documentation Verification

- [ ] `README.md` exists and is complete
- [ ] `infra/docs/PHASE_0_SETUP.md` exists and is complete
- [ ] `infra/docs/VERIFICATION_CHECKLIST.md` (this file) exists
- [ ] Environment variable templates exist in `infra/env/`

## Final Checklist

- [ ] All functions compile without errors
- [ ] All linting passes
- [ ] Security rules are deny-by-default
- [ ] Custom claims propagation documented
- [ ] Emulator suite working
- [ ] Seed script working
- [ ] Web app authenticates and displays roles
- [ ] Mobile app authenticates and displays roles (if tested)
- [ ] Deployment to dev successful
- [ ] Same behavior in real dev project as emulator

## What "Done" Looks Like

✅ **You can:**
1. Run emulators locally → create a user → see auto-created documents
2. Call `setUserRole()` as superAdmin → see custom claims and Firestore updated
3. Deploy to dev → confirm same behavior in real project
4. See roles displayed correctly in web and mobile apps
5. Verify security rules are working (deny-by-default, role-based access)

If all items above are checked, Phase 0 is complete! 🎉
