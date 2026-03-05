# Onboarding Route Map & Flow

## Routes

### Public Routes
- `/login` - Login/Signup page
- `/verify-email` - Email verification page (for email/password signups)
- `/join/{code}` - Join with invite code (optional, can auto-fill cohort)

### Protected Routes
- `/onboarding` - Matching onboarding wizard (5 steps)
- `/dashboard` - Main dashboard (gated by onboarding completion)

## Authentication Flow

### Email/Password Signup
1. User signs up → Account created
2. Email verification sent automatically
3. If not verified → Redirect to `/verify-email`
4. If verified → Redirect to `/onboarding`
5. Complete onboarding → Redirect to `/dashboard`

### Google Signup
1. User signs in with Google → Account created (auto-verified)
2. Redirect to `/onboarding`
3. Complete onboarding → Redirect to `/dashboard`

### Login (Existing User)
1. User signs in
2. Check `onboarding_status`:
   - If "needs_profile" or "partial" → `/onboarding`
   - If "complete" → `/dashboard`

## Onboarding Steps

### Step 1: Identity + Location (REQUIRED)
**Fields:**
- First Name *
- Last Name *
- City *
- State *
- Cohort (optional)

**Validation:** Cannot proceed without first name, last name, city, state

### Step 2: Goals (REQUIRED)
**Fields:**
- Multi-select goals (at least one required)

**Validation:** Must select at least one goal

### Step 3: Skills + Interests (REQUIRED)
**Fields:**
- Skills I Offer (1-10 required)
- Skills I Want (1-10 required)
- Industries (1-3 required)
- Role Titles (0-2 optional)

**Validation:** Must have at least 1 skill offer, 1 skill want, 1 industry

### Step 4: Job Preferences (CONDITIONAL)
**Shown if:** Goals include "find_job" or "hire"

**Fields:**
- Job Types *
- Work Mode *
- Compensation Range (optional)

**Validation:** Required if step is shown

### Step 5: Links + Privacy (REQUIRED CONSENT)
**Fields:**
- LinkedIn URL (optional)
- Portfolio URL (optional)
- Visibility toggles
- Consent checkboxes

**Validation:** Consent.matching is REQUIRED

## Gating Logic

### OnboardingGate
- Applied to all `/dashboard` routes
- Checks `onboarding_status` from `/users/{uid}`
- If not "complete", shows gate screen
- Gate screen has link to `/onboarding`

### Step Gates
- Each step validates required fields
- "Continue" button disabled until valid
- Error message shown if user tries to proceed without required fields
- Steps 1-2 cannot be skipped
- Steps 3-4 can show partial completion (stored as "partial" status)
- Step 5 requires consent to complete

## Data Flow

1. **User signs up** → `onUserCreated` trigger:
   - Creates `/users/{uid}` with `onboarding_status: "needs_profile"`
   - Assigns "Digital Curriculum Students" role (or "Admin" if admin email)

2. **User fills Step 1** → Autosave to `/match_profiles/{uid}`

3. **User fills Step 2** → Autosave to `/match_profiles/{uid}`

4. **User fills Step 3** → Autosave to `/match_profiles/{uid}`

5. **User fills Step 4** (if shown) → Autosave to `/match_profiles/{uid}`

6. **User completes Step 5**:
   - Calls `setUserBusinessProfile()` → Updates `/users/{uid}`
   - Calls `upsertMatchProfile()` → Updates `/match_profiles/{uid}`
   - Calls `updateOnboardingStatus({ status: "complete" })` → Updates `/users/{uid}`
   - Redirects to `/dashboard`

## Functions Called

### During Onboarding
- `upsertMatchProfile()` - Autosave (debounced) and final save
- `setUserBusinessProfile()` - Final save of name, cohort, location
- `updateOnboardingStatus()` - Mark onboarding complete

### After Onboarding
- `buildInitialMatches()` - (Future) Generate initial match suggestions

## Testing Scenarios

### Scenario 1: New Email/Password User
1. Sign up with email/password
2. Should see verify email page
3. Verify email
4. Should redirect to onboarding
5. Complete all 5 steps
6. Should redirect to dashboard

### Scenario 2: New Google User
1. Sign in with Google
2. Should redirect directly to onboarding
3. Complete all 5 steps
4. Should redirect to dashboard

### Scenario 3: Returning User (Incomplete)
1. Sign in
2. Check onboarding_status = "partial"
3. Should redirect to onboarding
4. Complete remaining steps
5. Should redirect to dashboard

### Scenario 4: Returning User (Complete)
1. Sign in
2. Check onboarding_status = "complete"
3. Should redirect to dashboard

### Scenario 5: Validation Testing
1. Try to proceed from Step 1 without required fields → Should show error
2. Try to proceed from Step 2 without goals → Should show error
3. Try to proceed from Step 3 without skills → Should show error
4. Try to complete Step 5 without consent → Should show error

## Error Handling

- Network errors: Show error message, allow retry
- Validation errors: Show inline error, disable continue button
- Function errors: Show user-friendly error message
- Autosave errors: Log but don't block (non-critical)
