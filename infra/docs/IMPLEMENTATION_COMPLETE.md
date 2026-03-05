# Matching Onboarding Implementation - Complete

## ✅ What Was Implemented

### Frontend (Web)

1. **New Onboarding Wizard** (`/onboarding`)
   - 5-step progressive onboarding flow
   - Step 1: Identity + Location (required fields gated)
   - Step 2: Goals selection (required, multi-select)
   - Step 3: Skills + Interests (required minimums)
   - Step 4: Job Preferences (conditional, shown if job-related goals)
   - Step 5: Links + Privacy (required consent)
   - Autosave with debouncing
   - Validation at each step prevents skipping

2. **OnboardingGate Component**
   - Checks `onboarding_status` from Firestore
   - Blocks dashboard access if not "complete"
   - Shows gate screen with link to onboarding

3. **Routing Updates**
   - Signup → Verify email (if email/password) → Onboarding
   - Google signup → Onboarding (auto-verified)
   - Login → Check onboarding status → Route accordingly
   - Onboarding completion → Dashboard

4. **Email Verification Page** (`/verify-email`)
   - Shows verification status
   - Resend email functionality
   - Redirects to onboarding when verified

5. **Taxonomy Utilities**
   - `getSkills()` - Searchable skills with synonyms
   - `getIndustries()` - Industry list
   - `getRoles()` - Role titles list

6. **Match Profile Utilities**
   - `upsertMatchProfile()` - Save match profile data
   - Type-safe interfaces for all profile data

### Backend (Firebase Functions)

1. **upsertMatchProfile** (callable)
   - Validates schema (Zod)
   - Normalizes URLs (trim, lowercase)
   - Enforces max counts (10 skills offer/want)
   - Computes completeness score (0-100)
   - Updates `/match_profiles/{uid}`

2. **setUserBusinessProfile** (callable)
   - Updates `/users/{uid}` with:
     - first_name, last_name, display_name
     - business_profile (cohort, city, state)

3. **updateOnboardingStatus** (callable)
   - Updates `/users/{uid}.onboarding_status`
   - Sets `profile_completed` flag

4. **onUserCreated** (trigger)
   - Sets `onboarding_status: "needs_profile"` for new users
   - Assigns "Digital Curriculum Students" role by default
   - Assigns "Admin" role for admin emails

### Data Model

1. **Firestore Collections**
   - `/users/{uid}` - Added `onboarding_status`, `first_name`, `last_name`
   - `/match_profiles/{uid}` - Complete match profile structure
   - `/taxonomies/{type}/items/{id}` - Skills, industries, roles

2. **Security Rules**
   - Match profiles: Read own, write via Functions only
   - Taxonomies: Read authenticated, write admin only
   - Matches: Read own, write Functions only

3. **Indexes**
   - Match profiles by visibility.discovery + updated_at
   - Jobs by industry_id + status
   - Skill ads by offered_skills array-contains

### Seed Scripts

1. **seed-taxonomies.js**
   - Seeds 15 skills with synonyms
   - Seeds 10 industries
   - Seeds 10 roles
   - Run: `node infra/scripts/seed-taxonomies.js [--env=dev]`

## 🔧 How It Works

### User Journey

1. **New User Signs Up**
   ```
   Signup → Email Verification (if email/password) → Onboarding → Dashboard
   ```

2. **Onboarding Flow**
   ```
   Step 1 (Identity) → Step 2 (Goals) → Step 3 (Skills) → 
   Step 4 (Job Prefs - conditional) → Step 5 (Privacy) → Complete
   ```

3. **Data Flow**
   ```
   User Input → Autosave (debounced) → upsertMatchProfile() → 
   /match_profiles/{uid} → Final Save → updateOnboardingStatus("complete")
   ```

### Gating Logic

- **OnboardingGate**: Applied to all `/dashboard/*` routes
  - Checks `onboarding_status` from Firestore
  - If not "complete", shows gate screen
  - Gate screen redirects to `/onboarding`

- **Step Validation**: Each step has `canProceed()` function
  - Required fields must be filled
  - Error shown if validation fails
  - "Continue" button disabled until valid

## 📋 Next Steps

### Immediate
1. **Deploy Functions**
   ```bash
   cd functions
   npm run build
   firebase deploy --only functions:upsertMatchProfile,functions:setUserBusinessProfile,functions:updateOnboardingStatus
   ```

2. **Seed Taxonomies**
   ```bash
   node infra/scripts/seed-taxonomies.js --env=dev
   ```

3. **Deploy Security Rules & Indexes**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

### Testing
1. Test signup flow (email/password + Google)
2. Test email verification
3. Test onboarding steps (validation, gating)
4. Test autosave
5. Test routing after completion

### Future Enhancements
1. **buildInitialMatches()** function - Generate match suggestions
2. **Email nudge** - Remind users with partial profiles
3. **Invite code system** - Auto-fill cohort from code
4. **Skill normalization** - Better synonym matching
5. **Geocoding** - Add lat/lng to location data

## 🐛 Known Issues / TODOs

1. **Skill Search**: Currently client-side filtering. Consider Algolia for production.
2. **Geocoding**: Location is city/state only. Add lat/lng for radius matching.
3. **Match Algorithm**: Stub for now. Implement scoring algorithm.
4. **Email Service**: Nudge emails are stubbed. Integrate SendGrid/Mailgun.
5. **Invite Codes**: Not yet implemented. Add `/join/{code}` route.

## 📚 Documentation Files

- `MATCHING_ONBOARDING_IMPLEMENTATION.md` - Full implementation guide
- `ONBOARDING_ROUTE_MAP.md` - Route flow and gating logic
- `IMPLEMENTATION_COMPLETE.md` - This file

## ✅ Verification Checklist

- [x] Onboarding wizard with 5 steps
- [x] Step validation and gating
- [x] Autosave functionality
- [x] Cloud Functions for profile management
- [x] Security rules updated
- [x] Indexes defined
- [x] Routing logic implemented
- [x] Email verification flow
- [x] OnboardingGate component
- [x] Taxonomy structure
- [x] Seed script for taxonomies
- [ ] Functions deployed
- [ ] Taxonomies seeded
- [ ] End-to-end testing complete
