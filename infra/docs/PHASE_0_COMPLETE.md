# Phase 0: Foundation - COMPLETE ✅

This document confirms that Phase 0 has been successfully implemented.

## Deliverables Checklist

### ✅ Repo Scaffolding + Package Management
- Monorepo structure with `/web`, `/mobile`, `/functions`, `/infra`
- Root `package.json` with workspaces
- Individual `package.json` files for each workspace
- Proper `.gitignore` files

### ✅ Firebase Config for Dev/Stage/Prod
- `.firebaserc` configured with:
  - `mortar-dev` (default)
  - `mortar-stage`
  - `mortar-9d29d` (production)
- `firebase.json` with emulator configuration
- Environment variable templates in `infra/env/`

### ✅ Firestore Collections + Indexes Placeholder
- Collections defined:
  - `/users/{uid}`
  - `/data_rooms/{uid}`
  - `/user_progress/{uid}`
  - `/analytics_events/{event_id}`
  - `/badges/{badgeId}`
  - `/certificates/{certId}`
  - `/approvals/{approvalId}`
  - `/content/{contentId}`
  - `/events/{eventId}`
- `firestore.indexes.json` placeholder ready for index definitions

### ✅ Security Rules Baseline
- Deny-by-default: `match /{document=**} { allow read, write: if false; }`
- Least privilege: Users can only read their own data (with admin exceptions)
- Functions-authoritative writes for:
  - Progress/scoring (`/user_progress`)
  - Badges (`/badges`)
  - Certificates (`/certificates`)
  - Approvals (`/approvals`)
- Role-based access control using custom claims

### ✅ Functions Skeleton
- **onUserCreated** trigger:
  - Creates `/users/{uid}` document
  - Creates `/data_rooms/{uid}` document
  - Creates `/user_progress/{uid}` document
  - Logs analytics event to `/analytics_events`
- **setUserRole** callable:
  - SuperAdmin only
  - Updates custom claims
  - Updates `/users/{uid}.roles` in Firestore
  - Returns message about token refresh requirement
- **logAnalyticsEvent** callable:
  - Authenticated users can log events
  - Creates documents in `/analytics_events`

### ✅ Emulator + Seed Data
- `firebase.json` configured with emulator ports:
  - Auth: 9099
  - Firestore: 8085
  - Functions: 5001
  - Storage: 9199
  - UI: 4000
- Seed script (`infra/scripts/seed.js`):
  - Creates test users with different roles
  - Initializes user documents
  - Ready to run with `npm run seed`

### ✅ CI/CD Skeleton (GitHub Actions)
- `.github/workflows/ci.yml` - Lint and build on PR/push
- `.github/workflows/deploy-dev.yml` - Deploy to dev on `develop` branch
- `.github/workflows/deploy-stage.yml` - Deploy to stage on `release/*` branch
- `.github/workflows/deploy-prod.yml` - Deploy to prod on `main` branch

### ✅ Web App Stub
- Next.js 14 app with:
  - Authentication (sign in/sign up/sign out)
  - Role display (shows current user's roles from custom claims)
  - Firebase initialization with emulator support
  - Environment-based configuration

### ✅ Mobile App Stub
- Flutter app with:
  - Authentication (sign in/sign up/sign out)
  - Role display (shows current user's roles from custom claims)
  - Firebase initialization with emulator support

## Engineering Constraints Met

### ✅ Lower Snake Case
- All Firestore fields use `lower_snake_case`:
  - `display_name`, `created_at`, `updated_at`, `user_id`, `event_type`, etc.

### ✅ Server Timestamps
- All timestamps use `FieldValue.serverTimestamp()`:
  - `created_at`, `updated_at`, `timestamp`

### ✅ Avoid Hot Documents
- Structure uses subcollections pattern (ready for future expansion)
- User progress, data rooms are separate documents (not nested)

### ✅ Prevent Trigger Loops
- `onUserCreated` only writes to user-related collections
- No circular dependencies
- Guards in place to prevent re-triggering

### ✅ Claims Propagation Documented
- `setUserRole` function returns message about token refresh
- Documentation in `PHASE_0_SETUP.md` explains token refresh requirement
- Code comments in `web/src/lib/auth.ts` and `mobile/lib/main.dart`

## Verification Steps

### Local Emulator Testing
1. ✅ Run `npm run emulators` → Emulators start successfully
2. ✅ Run `npm run seed` → Test users created
3. ✅ Create user via web app → Documents auto-created
4. ✅ Call `setUserRole()` → Custom claims and Firestore updated
5. ✅ Display roles in UI → Roles shown correctly

### Production Deployment
1. ✅ Deploy to dev: `firebase deploy --only functions,firestore:rules,firestore:indexes --project mortar-dev`
2. ✅ Test in real dev project → Same behavior as emulator
3. ✅ Verify security rules → Deny-by-default working

## Commands Reference

### Install Dependencies
```bash
npm install
cd functions && npm install
cd ../web && npm install
cd ../mobile && flutter pub get
```

### Run Emulators
```bash
npm run emulators
```

### Seed Data
```bash
npm run seed
```

### Build Functions
```bash
cd functions
npm run build
```

### Deploy to Dev
```bash
firebase use mortar-dev
firebase deploy --only functions,firestore:rules,firestore:indexes
```

### Deploy to Stage
```bash
firebase use mortar-stage
firebase deploy --only functions,firestore:rules,firestore:indexes
```

### Deploy to Production
```bash
firebase use mortar-9d29d
firebase deploy --only functions,firestore:rules,firestore:indexes
```

## Environment Variables

### Dev (web/.env.local)
```bash
NEXT_PUBLIC_FIREBASE_ENV=dev
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mortar-dev
NEXT_PUBLIC_USE_EMULATOR=true
```

### Stage
```bash
NEXT_PUBLIC_FIREBASE_ENV=stage
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mortar-stage
NEXT_PUBLIC_USE_EMULATOR=false
```

### Production
```bash
NEXT_PUBLIC_FIREBASE_ENV=prod
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mortar-9d29d
NEXT_PUBLIC_USE_EMULATOR=false
```

## What "Done" Looks Like

✅ **You can:**
1. Run emulators locally → create a user → see these auto-created:
   - `/users/{uid}`
   - `/data_rooms/{uid}`
   - `/user_progress/{uid}`
   - `/analytics_events/{event_id}` (for user_created)

2. Call `setUserRole()` as a superAdmin and see:
   - Custom claims updated
   - `/users/{target_uid}.roles` mirrored

3. Deploy to dev using alias and confirm the same behavior in the real dev project

4. See roles displayed correctly in web and mobile apps

5. Verify security rules are working (deny-by-default, role-based access)

## Next Steps

Phase 0 is complete! You can now:
- Start building Phase 1 features on this foundation
- Add more collections and indexes as needed
- Extend the role system with additional permissions
- Build out the web and mobile app features

## Documentation

- **Setup Guide**: `infra/docs/PHASE_0_SETUP.md`
- **Verification Checklist**: `infra/docs/VERIFICATION_CHECKLIST.md`
- **Folder Structure**: `infra/docs/FOLDER_STRUCTURE.md`
- **Main README**: `README.md`

---

**Phase 0 Status: COMPLETE ✅**

All requirements met. Foundation is ready for Phase 1 development.
