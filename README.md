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

See [infra/docs/PHASE_0_SETUP.md](infra/docs/PHASE_0_SETUP.md) for detailed setup and verification instructions.

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

```bash
firebase use mortar-dev
firebase deploy --only functions,firestore:rules,firestore:indexes
```

### Stage

```bash
firebase use mortar-stage
firebase deploy --only functions,firestore:rules,firestore:indexes
```

### Production

```bash
firebase use mortar-9d29d
firebase deploy --only functions,firestore:rules,firestore:indexes
```

## License

Private - MORTAR Project
# client0003
