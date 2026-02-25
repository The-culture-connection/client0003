# Exact Folder Structure - Phase 0

```
.
├── .firebaserc                          # Firebase project aliases (dev/stage/prod)
├── .gitignore                           # Git ignore rules
├── firebase.json                        # Firebase configuration (emulators, functions)
├── firestore.rules                      # Firestore security rules (deny-by-default)
├── firestore.indexes.json               # Firestore indexes (placeholder)
├── package.json                         # Root package.json (workspaces)
├── README.md                            # Main README
│
├── .github/
│   └── workflows/
│       ├── ci.yml                       # CI workflow (lint/test/build)
│       ├── deploy-dev.yml               # Deploy to dev
│       ├── deploy-stage.yml             # Deploy to stage
│       └── deploy-prod.yml              # Deploy to production
│
├── web/                                 # Next.js web application
│   ├── .eslintrc.json                   # ESLint config
│   ├── .gitignore                       # Web-specific gitignore
│   ├── next.config.js                   # Next.js configuration
│   ├── package.json                     # Web dependencies
│   ├── README.md                        # Web app README
│   ├── tsconfig.json                    # TypeScript config
│   └── src/
│       ├── app/
│       │   ├── globals.css              # Global styles
│       │   ├── layout.tsx               # Root layout
│       │   └── page.tsx                 # Home page (auth + role display)
│       └── lib/
│           ├── auth.ts                  # Auth utilities (signIn, signUp, setUserRole)
│           └── firebase.ts              # Firebase initialization
│
├── mobile/                              # Flutter mobile application
│   ├── .gitignore                       # Flutter gitignore
│   ├── pubspec.yaml                     # Flutter dependencies
│   ├── README.md                        # Mobile app README
│   └── lib/
│       └── main.dart                    # Main app (auth + role display)
│
├── functions/                           # Firebase Functions v2 (TypeScript)
│   ├── .eslintrc.js                     # ESLint config
│   ├── package.json                     # Functions dependencies
│   ├── tsconfig.json                     # TypeScript config
│   ├── tsconfig.dev.json                # TypeScript dev config
│   └── src/
│       ├── index.ts                     # Main entry point (exports all functions)
│       ├── triggers/
│       │   └── onUserCreated.ts         # onUserCreate trigger (initializes user docs)
│       └── callables/
│           ├── setUserRole.ts           # setUserRole callable (superAdmin only)
│           └── logAnalyticsEvent.ts     # logAnalyticsEvent callable
│
└── infra/                               # Infrastructure scripts and docs
    ├── Credentials/                    # Firebase credentials (gitignored in production)
    │   ├── Dev infolist/
    │   │   ├── google-services (4).json
    │   │   ├── GoogleService-Info (5).plist
    │   │   └── webapp
    │   ├── Stage Infolist/
    │   │   ├── google-services android.json
    │   │   ├── GoogleService-Info ios.plist
    │   │   └── webapp
    │   └── Prod infolist/
    │       ├── google-services (5).json
    │       ├── GoogleService-Info (6).plist
    │       └── webapp
    ├── docs/
    │   ├── FOLDER_STRUCTURE.md          # This file
    │   ├── PHASE_0_SETUP.md             # Setup guide
    │   └── VERIFICATION_CHECKLIST.md    # Verification checklist
    ├── env/
    │   ├── dev.env.example              # Dev environment template
    │   ├── stage.env.example            # Stage environment template
    │   └── prod.env.example             # Prod environment template
    └── scripts/
        └── seed.js                      # Emulator seed script
```

## Key Files

### Firebase Configuration
- `.firebaserc` - Project aliases: `mortar-dev`, `mortar-stage`, `mortar-9d29d`
- `firebase.json` - Emulator ports, functions config
- `firestore.rules` - Security rules (deny-by-default, role-based)
- `firestore.indexes.json` - Index definitions (placeholder)

### Functions
- `functions/src/index.ts` - Exports all functions
- `functions/src/triggers/onUserCreated.ts` - Creates user docs on signup
- `functions/src/callables/setUserRole.ts` - Role management (superAdmin only)
- `functions/src/callables/logAnalyticsEvent.ts` - Analytics logging

### Web App
- `web/src/app/page.tsx` - Main page with auth UI
- `web/src/lib/firebase.ts` - Firebase initialization
- `web/src/lib/auth.ts` - Auth utilities

### Mobile App
- `mobile/lib/main.dart` - Main app with auth UI

### Infrastructure
- `infra/scripts/seed.js` - Seeds emulator with test users
- `infra/docs/PHASE_0_SETUP.md` - Complete setup guide
- `infra/docs/VERIFICATION_CHECKLIST.md` - Verification steps
