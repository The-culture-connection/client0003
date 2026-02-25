# Phase 0: Foundation Setup Guide

This document provides setup instructions and verification steps for Phase 0 of the MORTAR monorepo.

## Folder Structure

```
.
├── .firebaserc              # Firebase project aliases
├── firebase.json            # Firebase configuration
├── firestore.rules          # Firestore security rules
├── firestore.indexes.json   # Firestore indexes
├── package.json             # Root package.json (workspaces)
│
├── web/                     # Next.js web application
│   ├── src/
│   │   ├── app/            # Next.js app directory
│   │   └── lib/            # Utilities (firebase, auth)
│   ├── package.json
│   └── next.config.js
│
├── mobile/                  # Flutter mobile application
│   ├── lib/
│   │   └── main.dart
│   └── pubspec.yaml
│
├── functions/               # Firebase Functions v2 (TypeScript)
│   ├── src/
│   │   ├── index.ts        # Main entry point
│   │   ├── triggers/       # Cloud Functions triggers
│   │   │   └── onUserCreated.ts
│   │   └── callables/      # Callable functions
│   │       ├── setUserRole.ts
│   │       └── logAnalyticsEvent.ts
│   ├── package.json
│   └── tsconfig.json
│
└── infra/                   # Infrastructure scripts and docs
    ├── scripts/
    │   └── seed.js         # Emulator seed script
    ├── env/                 # Environment variable templates
    │   ├── dev.env.example
    │   ├── stage.env.example
    │   └── prod.env.example
    └── docs/
        └── PHASE_0_SETUP.md
```

## Environment Variables

### Development (.env.local in web/)

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

## Commands

### Install Dependencies

```bash
# Root (workspaces)
npm install

# Functions
cd functions && npm install

# Web
cd web && npm install

# Mobile
cd mobile && flutter pub get
```

### Run Emulators

```bash
# From root directory
npm run emulators

# Or directly
firebase emulators:start
```

### Seed Emulator Data

```bash
# Make sure emulators are running first
npm run seed

# Or directly
node infra/scripts/seed.js
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

### Run Web App

```bash
cd web
npm run dev
# App runs on http://localhost:3000
```

### Run Mobile App

```bash
cd mobile
flutter run
```

## Verification Checklist

### Local Emulator Testing

1. **Start Emulators**
   ```bash
   npm run emulators
   ```
   - Verify emulator UI at http://localhost:4000
   - Check Auth emulator on port 9099
   - Check Firestore emulator on port 8080
   - Check Functions emulator on port 5001

2. **Seed Test Data**
   ```bash
   npm run seed
   ```
   - Verify test users created in Auth emulator
   - Verify documents created in Firestore emulator

3. **Test User Creation**
   - Open web app at http://localhost:3000
   - Sign up with a new email
   - Verify in Firestore emulator:
     - `/users/{uid}` document created
     - `/data_rooms/{uid}` document created
     - `/user_progress/{uid}` document created
     - `/analytics_events/{event_id}` document created with `event_type: "user_created"`

4. **Test Role Assignment**
   - Sign in as `superadmin@test.com` (password: `test123456`)
   - Call `setUserRole()` function with:
     - `target_uid`: Another user's UID
     - `role`: `"contentAdmin"`
     - `action`: `"add"`
   - Verify:
     - Custom claims updated in Auth
     - `/users/{target_uid}.roles` updated in Firestore
     - Client must refresh token to see changes

5. **Test Role Display**
   - Sign in as different users with different roles
   - Verify roles are displayed correctly in the UI
   - Verify roles match Firestore `/users/{uid}.roles`

### Production Deployment Testing

1. **Deploy to Dev**
   ```bash
   firebase use mortar-dev
   firebase deploy --only functions,firestore:rules,firestore:indexes
   ```

2. **Test in Dev Project**
   - Create a user in the real dev project
   - Verify same behavior as emulator:
     - User documents created
     - Analytics event logged
   - Test `setUserRole()` function
   - Verify custom claims propagation

3. **Verify Security Rules**
   - Try to read/write documents as different users
   - Verify deny-by-default behavior
   - Verify role-based access control

## What "Done" Looks Like

✅ **Monorepo Structure**
- `/web` - Next.js app with authentication
- `/mobile` - Flutter app with authentication
- `/functions` - Firebase Functions v2 with all required functions
- `/infra` - Scripts and documentation

✅ **Firebase Configuration**
- Dev/stage/prod projects configured
- Emulator suite working
- Security rules implemented (deny-by-default)

✅ **Functions Implemented**
- `onUserCreated` trigger creates user documents
- `setUserRole` callable (superAdmin only)
- `logAnalyticsEvent` callable

✅ **Authentication Working**
- Web app can sign in/up
- Mobile app can sign in/up
- Roles displayed correctly
- Custom claims working

✅ **Verification**
- Can create user → see auto-created documents
- Can set roles → see claims updated
- Can deploy to dev → same behavior in real project

## Important Notes

### Custom Claims Propagation

**CRITICAL**: After calling `setUserRole()`, clients must refresh their ID token to see updated custom claims:

```typescript
// Web (TypeScript)
await getIdToken(user, true); // Force refresh

// Flutter (Dart)
await user.getIdToken(true); // Force refresh
```

### Security Rules

- All writes to progress/scoring/badges/certs/approvals must be done via Functions
- Clients can only read their own data (with admin exceptions)
- Deny-by-default: everything is denied unless explicitly allowed

### Engineering Constraints

- Use `lower_snake_case` for Firestore fields
- Use server timestamps (`FieldValue.serverTimestamp()`)
- Avoid hot documents: use subcollections for frequent updates
- Prevent trigger loops: never write to the same doc you listen to without guards

## Troubleshooting

### Emulators Not Starting
- Check if ports are already in use
- Verify Firebase CLI is installed: `firebase --version`
- Check `firebase.json` configuration

### Functions Not Deploying
- Verify Node.js version (should be 20)
- Run `npm run build` in functions directory first
- Check Firebase project alias: `firebase use`

### Custom Claims Not Updating
- Client must refresh ID token after `setUserRole()` call
- Verify user has `superAdmin` role
- Check function logs: `firebase functions:log`

### Security Rules Not Working
- Deploy rules: `firebase deploy --only firestore:rules`
- Check rules syntax in `firestore.rules`
- Test in emulator first
