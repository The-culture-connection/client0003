# Quick Start Guide - Phase 0

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies

```bash
# Root
npm install

# Functions
cd functions && npm install && cd ..

# Web
cd web && npm install && cd ..
```

### 2. Start Emulators

```bash
npm run emulators
```

Wait for emulators to start, then open http://localhost:4000

### 3. Seed Test Data

In a new terminal:

```bash
npm run seed
```

This creates test users:
- `superadmin@test.com` / `test123456` (superAdmin)
- `contentadmin@test.com` / `test123456` (contentAdmin)
- `eventadmin@test.com` / `test123456` (eventAdmin)
- `moderator@test.com` / `test123456` (moderator)
- `analyst@test.com` / `test123456` (analyst)
- `user@test.com` / `test123456` (no roles)

### 4. Run Web App

In a new terminal:

```bash
cd web
npm run dev
```

Open http://localhost:3000

### 5. Test It Out

1. **Sign In**: Use `superadmin@test.com` / `test123456`
2. **See Roles**: You should see "superAdmin" in the roles section
3. **Create New User**: Sign out, then sign up with a new email
4. **Check Firestore**: In emulator UI, verify documents were created:
   - `/users/{uid}`
   - `/data_rooms/{uid}`
   - `/user_progress/{uid}`
   - `/analytics_events/{event_id}`

## 📋 Common Commands

```bash
# Start emulators
npm run emulators

# Seed data
npm run seed

# Build functions
cd functions && npm run build

# Deploy to dev
firebase use mortar-dev
firebase deploy --only functions,firestore:rules,firestore:indexes

# Run web app
cd web && npm run dev

# Run mobile app
cd mobile && flutter run
```

## 🔍 Verify Phase 0

See `infra/docs/VERIFICATION_CHECKLIST.md` for complete verification steps.

## 📚 Documentation

- **Full Setup**: `infra/docs/PHASE_0_SETUP.md`
- **Verification**: `infra/docs/VERIFICATION_CHECKLIST.md`
- **Structure**: `infra/docs/FOLDER_STRUCTURE.md`
- **Complete Status**: `infra/docs/PHASE_0_COMPLETE.md`

## ⚠️ Important Notes

1. **Custom Claims**: After calling `setUserRole()`, clients must refresh their ID token to see updated roles
2. **Security Rules**: All writes to progress/badges/certs/approvals must be done via Functions
3. **Emulator Ports**: Make sure ports 4000, 5001, 8080, 9099, 9199 are available

## 🆘 Troubleshooting

**Emulators won't start?**
- Check if ports are in use
- Verify Firebase CLI: `firebase --version`

**Functions won't deploy?**
- Build first: `cd functions && npm run build`
- Check Node version: `node --version` (should be 20)

**Can't see roles?**
- Refresh ID token: `await getIdToken(user, true)`
- Check custom claims in Auth emulator

---

**Ready to build!** 🎉
