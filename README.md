# MORTAR Monorepo

Firebase-first monorepo powering Next.js web app and Flutter mobile app.

## Project Structure

- `/web` - Next.js web application
- `/mobile` - Flutter mobile application
- `/functions` - Firebase Functions v2 (TypeScript)
- `/infra` - Infrastructure scripts and documentation

## Quick Start

### Prerequisites

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Flutter SDK (for mobile development)

### Setup

1. **Install dependencies**
   ```bash
   npm install
   cd functions && npm install
   cd ../web && npm install
   ```

2. **Configure environment**
   - Copy `infra/env/dev.env.example` to `web/.env.local`
   - Update values as needed

3. **Start emulators**
   ```bash
   npm run emulators
   ```

4. **Seed test data**
   ```bash
   npm run seed
   ```

5. **Run web app**
   ```bash
   cd web
   npm run dev
   ```

## Firebase Projects

- **Dev**: `mortar-dev`
- **Stage**: `mortar-stage`
- **Production**: `mortar-9d29d`

## Documentation

See [infra/docs/PHASE_0_SETUP.md](infra/docs/PHASE_0_SETUP.md) for detailed setup and verification instructions. Staging checklist: [infra/docs/STAGE_DEPLOYMENT.md](infra/docs/STAGE_DEPLOYMENT.md).

## Phase 0 Features

✅ Monorepo structure
✅ Firebase Functions v2 (onUserCreated, setUserRole, logAnalyticsEvent)
✅ Firestore security rules (deny-by-default, least privilege)
✅ Role/claims framework (superAdmin/contentAdmin/eventAdmin/moderator/analyst)
✅ Emulator suite with seed script
✅ Next.js web app stub with authentication
✅ Flutter mobile app stub with authentication
✅ CI/CD skeleton (GitHub Actions)

## Development

### Functions

```bash
cd functions
npm run build
npm run lint
```

### Web

```bash
cd web
npm run dev
npm run build
npm run lint
```

### Mobile

```bash
cd mobile
flutter pub get
flutter run
```

## Deployment

### Dev

CI deploys **functions + Firestore indexes** to `mortar-dev` (not Firestore/Storage rules from this repo).

```bash
firebase use dev
firebase deploy --project mortar-dev --only functions,firestore:indexes
```

### Stage

- **Digital Curriculum (web):** deploy on **[Railway](Digital%20Curriculum/DEPLOY_RAILWAY.md)** with `VITE_FIREBASE_ENV=stage` (see [infra/docs/STAGE_DEPLOYMENT.md](infra/docs/STAGE_DEPLOYMENT.md)).
- **Firebase backend** (`mortar-stage` — Functions, Firestore rules/indexes, Storage rules):

```bash
npm run deploy:stage
```

(`firebase use staging` then `firebase deploy --only functions,firestore:rules,firestore:indexes,storage` is equivalent.)

### Production

```bash
firebase use prod
firebase deploy --project mortar-9d29d --only functions,firestore:rules,firestore:indexes
```

## License

Private - MORTAR Project
# client0003
