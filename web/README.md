# MORTAR Web App

Next.js web application for MORTAR platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables (create `.env.local` if needed):
```
NEXT_PUBLIC_FIREBASE_ENV=dev
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mortar-dev
# NEXT_PUBLIC_USE_EMULATOR=true  # Only set this to "true" if you want to use emulators
```

3. Run development server:
```bash
npm run dev
```

The app will be available at http://localhost:3000

## Environment Variables

- `NEXT_PUBLIC_FIREBASE_ENV`: Environment (dev/stage/prod). Defaults to "dev"
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Firebase project ID (optional, uses config defaults)
- `NEXT_PUBLIC_USE_EMULATOR`: Set to "true" ONLY if you want to use Firebase emulators. **Default: Uses real Firebase services**

**Note:** The app now uses real Firebase services by default. Emulators are only used if explicitly enabled.
