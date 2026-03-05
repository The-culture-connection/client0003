# Matching Onboarding Implementation Guide

## Overview
Complete matching profile onboarding system with 5-step wizard, server-authoritative data collection, and proper gating.

## Onboarding Flow

### Step 1: Identity + Location (REQUIRED)
- **Fields**: first_name, last_name, city, state, cohort
- **Validation**: All fields required except cohort
- **Gate**: Cannot proceed without filling required fields

### Step 2: Goals (REQUIRED)
- **Fields**: Multi-select goals (find_job, hire, sell_skills, buy_skills, mentor, peer, partner)
- **Validation**: At least one goal required
- **Gate**: Cannot proceed without selecting at least one goal

### Step 3: Skills + Interests (REQUIRED)
- **Fields**: 
  - Skills I Offer (up to 10, required)
  - Skills I Want (up to 10, required)
  - Industries (up to 3, required)
  - Role Titles (up to 2, optional)
- **Validation**: Must have at least 1 skill offer, 1 skill want, 1 industry
- **Gate**: Cannot proceed without minimum requirements

### Step 4: Job Preferences (CONDITIONAL)
- **Shown if**: Goals include "find_job" or "hire"
- **Fields**: job_types, work_mode, compensation range
- **Validation**: Required if step is shown
- **Gate**: Cannot proceed if shown and not filled

### Step 5: Links + Privacy (REQUIRED CONSENT)
- **Fields**: LinkedIn URL, Portfolio URL, visibility toggles, consent checkboxes
- **Validation**: Consent.matching is REQUIRED
- **Gate**: Cannot complete without consent

## Data Model

### /users/{uid}
```typescript
{
  first_name: string;
  last_name: string;
  display_name: string;
  onboarding_status: "needs_profile" | "partial" | "complete";
  business_profile: {
    cohort_name: string;
    city: string;
    state: string;
  };
}
```

### /match_profiles/{uid}
```typescript
{
  uid: string;
  location: { city, state, radius_miles? };
  goals: MatchingGoal[];
  industries: string[]; // industry_ids
  role_titles: string[]; // role_ids
  skills_offer: string[]; // skill_ids (max 10)
  skills_want: string[]; // skill_ids (max 10)
  work_mode?: "remote" | "hybrid" | "on_site";
  compensation?: { min?, max?, currency };
  links?: { linkedin_url?, portfolio_url? };
  visibility: { discovery, jobs, marketplace };
  consent: { matching, marketing };
  completeness_score: number; // 0-100
  skills_offer_count: number;
  skills_want_count: number;
  primary_industry_id: string | null;
  updated_at: timestamp;
}
```

### /taxonomies/{type}/items/{id}
```typescript
{
  name: string;
  synonyms: string[];
  category_id: string | null;
  is_active: boolean;
  created_at: timestamp;
}
```

## Cloud Functions

### upsertMatchProfile(payload)
- **Input**: MatchProfile object
- **Validates**: Schema, max counts (10 skills), URL formats
- **Normalizes**: URLs (trim, lowercase), computes completeness score
- **Updates**: /match_profiles/{uid}
- **Returns**: { success, completeness_score }

### setUserBusinessProfile(payload)
- **Input**: { first_name, last_name, cohort_name, city, state }
- **Updates**: /users/{uid} with business_profile and display_name
- **Returns**: { success }

### updateOnboardingStatus(payload)
- **Input**: { status: "needs_profile" | "partial" | "complete" }
- **Updates**: /users/{uid}.onboarding_status and profile_completed
- **Returns**: { success, status }

## Routing Logic

1. **After Signup (Email/Password)**:
   - If email not verified → `/verify-email`
   - If verified → `/onboarding`

2. **After Signup (Google)**:
   - Google accounts are auto-verified → `/onboarding`

3. **After Login**:
   - Check onboarding_status
   - If not "complete" → `/onboarding`
   - If "complete" → `/dashboard`

4. **After Onboarding Completion**:
   - Call `updateOnboardingStatus({ status: "complete" })`
   - Redirect to `/dashboard`

## Gating System

### OnboardingGate Component
- Checks `/users/{uid}.onboarding_status`
- If not "complete", shows gate screen with link to `/onboarding`
- Applied to all dashboard routes (except onboarding itself)

### Step Validation
- Each step has `canProceed()` function
- Required fields must be filled
- Error message shown if validation fails
- "Continue" button disabled until valid

## Autosave
- Debounced autosave (1 second) after field changes
- Saves to `/match_profiles/{uid}` via `upsertMatchProfile()`
- Does not block navigation
- Allows user to return and continue

## Taxonomies

### Seed Data
Run: `node infra/scripts/seed-taxonomies.js [--env=dev]`

### Skills (15 initial)
- JavaScript, TypeScript, React, Node.js, Python
- Product Management, UI/UX Design, Marketing Strategy
- Sales, Finance, Operations, Leadership, Entrepreneurship
- Data Analysis, Project Management

### Industries (10 initial)
- Technology, Healthcare, Finance, Education, Retail
- Manufacturing, Consulting, Media & Entertainment
- Real Estate, Non-profit

### Roles (10 initial)
- Software Engineer, Product Manager, Designer
- Marketing Manager, Sales Representative, Operations Manager
- CEO, CTO, CFO, Founder

## Security Rules

- `/match_profiles/{uid}`: Read own, write via Functions only
- `/taxonomies`: Read authenticated, write admin only
- `/matches/{uid}/suggestions`: Read own, write Functions only

## Testing Checklist

1. **Signup Flow**:
   - [ ] Email/password signup → verify email page
   - [ ] Google signup → onboarding
   - [ ] Email verification → onboarding

2. **Onboarding Steps**:
   - [ ] Step 1: Cannot proceed without required fields
   - [ ] Step 2: Cannot proceed without selecting goal
   - [ ] Step 3: Cannot proceed without skills/industries
   - [ ] Step 4: Conditional display works
   - [ ] Step 5: Cannot complete without consent

3. **Data Persistence**:
   - [ ] Autosave works
   - [ ] Data persists on refresh
   - [ ] Completeness score calculated correctly

4. **Routing**:
   - [ ] Incomplete onboarding → redirected to onboarding
   - [ ] Complete onboarding → dashboard access
   - [ ] Dashboard shows after completion

5. **Backend**:
   - [ ] Functions deploy successfully
   - [ ] Data normalized correctly
   - [ ] Security rules enforce properly

## Next Steps

1. Deploy functions
2. Seed taxonomies
3. Test end-to-end flow
4. Add email verification UI polish
5. Add "Complete profile" nudge banner on dashboard
