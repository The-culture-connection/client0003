# MORTAR Web App

Next.js web application for MORTAR platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables (create `.env.local`):
```
NEXT_PUBLIC_FIREBASE_ENV=dev
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mortar-dev
NEXT_PUBLIC_USE_EMULATOR=true
```

3. Run development server:
```bash
npm run dev
```

The app will be available at http://localhost:3000

## Environment Variables

- `NEXT_PUBLIC_FIREBASE_ENV`: Environment (dev/stage/prod)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Firebase project ID
- `NEXT_PUBLIC_USE_EMULATOR`: Set to "true" to use Firebase emulators
