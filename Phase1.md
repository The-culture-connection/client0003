# MORTAR MASTERS Webapp - Complete Build Plan

## Overview
This document outlines the step-by-step plan to complete the full webapp buildout, integrating the UI scaffolding from `@UI/` with Firebase backend functionality. All complex computing will be handled by Firebase Functions to ensure scalability and security.

---

## PHASE 1: Foundation & Integration
**Goal**: Set up the foundation by copying UI components and establishing routing

### Tasks:
1. **Copy UI Components to Web App**
   - Copy all UI components from `UI/src/app/components/ui/` to `web/src/components/ui/`
   - Copy page components from `UI/src/app/pages/web/` to `web/src/components/pages/web/`
   - Ensure all imports are updated to use Next.js paths

2. **Set Up Next.js Routing**
   - Create route handlers for all pages:
     - `/dashboard` → Dashboard
     - `/curriculum` → Curriculum Viewer
     - `/quizzes` → Quiz System
     - `/data-room` → Data Room
     - `/certificates` → Certificate Center
     - `/events` → Events Hub
     - `/community` → Discussion Board
     - `/analytics` → Analytics (Admin only)
     - `/admin` → Admin Dashboard (Admin only)

3. **Integrate Firebase Client**
   - Ensure Firebase is properly initialized (already done)
   - Create hooks for data fetching:
     - `useUserProgress()` - Fetch user progress
     - `useCurriculum()` - Fetch curriculum structure
     - `useQuizzes()` - Fetch quizzes
     - `useEvents()` - Fetch events
     - `useDiscussionThreads()` - Fetch discussion threads

4. **Set Up Role-Based Access Control**
   - Verify `RoleGate` and `PrivilegeGate` components work
   - Add `OnboardingGate` to protect routes

**Deliverables**: All UI components copied, routing established, Firebase hooks created

---

## PHASE 2: Dashboard
**Goal**: Build dynamic dashboard with real data from Firebase

### Tasks:
1. **Fetch Real User Data**
   - Create `useUserDashboard()` hook
   - Fetch from `/users/{uid}`: roles, badges, points, business_profile
   - Fetch from `/user_progress/{uid}`: progress across modules

2. **Next Lesson Logic**
   - Create Firebase Function `getNextLesson(uid)` (or compute client-side)
   - Determine next lesson based on:
     - Module completion status
     - Chapter completion status
     - Quiz pass status
     - Asset requirements

3. **Progress Visualization**
   - Calculate module progress from `/user_progress/{uid}/module_results/{module_id}`
   - Show progress rings/cards for each module
   - Display badges earned

4. **Upcoming Events**
   - Fetch from `/events` collection
   - Filter by upcoming dates
   - Show RSVP status

5. **Points & Badges Display**
   - Show current points balance
   - Display earned badges
   - Show progress toward next badge

**Deliverables**: Fully functional dashboard with real Firebase data

---

## PHASE 3: Curriculum Viewer
**Goal**: Module-based curriculum with freemium model and paywall

### Tasks:
1. **Curriculum Data Structure**
   - Create Firestore collections:
     - `/curricula/{curriculum_id}/modules/{module_id}`
     - `/curricula/{curriculum_id}/modules/{module_id}/chapters/{chapter_id}`
     - `/curricula/{curriculum_id}/modules/{module_id}/chapters/{chapter_id}/lessons/{lesson_id}`
   - Seed initial curriculum data (4 modules)

2. **Freemium Logic**
   - First 5 chapters across all modules are free
   - Remaining chapters require module purchase
   - Create Firebase Function `checkChapterAccess(uid, chapter_id)`:
     - Check if chapter is in first 5 free chapters
     - Check if user has purchased the module
     - Return access status

3. **Paywall UI**
   - Show lock icon for locked chapters
   - Display "Purchase Module" button
   - Show pricing information
   - Integrate with payment system (stripe/shopify)

4. **Hidden Training Videos**
   - Check `/users/{uid}.permissions.hidden_videos` array
   - Show unlock icon for granted videos
   - Use existing `grantHiddenTrainingVideo()` function

5. **Module Progress Display**
   - Show completion status per module
   - Display required assets per module
   - Show quiz status per chapter

**Deliverables**: Full curriculum viewer with freemium and paywall logic

---

## PHASE 4: Lesson Tracking
**Goal**: Track lesson viewing time and completion (server-authoritative)

### Tasks:
1. **Lesson Viewer Component**
   - Create lesson detail page
   - Display lesson content (video, text, resources)
   - Track time spent (client-side timer, send to server periodically)

2. **Time Tracking (Server-Authoritative)**
   - Use existing `trackLessonTime(lesson_id, delta_seconds)` function
   - Call function every 30 seconds or on page unload
   - Store in `/user_progress/{uid}/lesson_progress/{lesson_id}`

3. **Lesson Completion**
   - Use existing `markLessonComplete(lesson_id)` function
   - Mark lesson complete when user clicks "Complete"
   - Update chapter progress automatically

4. **Chapter Completion Logic**
   - Chapter complete only if:
     - All lessons in chapter are complete
     - Chapter quiz is passed (checked separately)
   - Create Firebase Function `evaluateChapterCompletion(uid, chapter_id)`

5. **Progress Indicators**
   - Show lesson completion status
   - Display time spent per lesson
   - Show chapter progress percentage

**Deliverables**: Lesson tracking with server-authoritative time and completion

---

## PHASE 5: Quiz System
**Goal**: Complete quiz system with variants, attempts, and email triggers

### Tasks:
1. **Quiz Data Structure**
   - Create Firestore collections:
     - `/quizzes/{quiz_id}` - Quiz metadata
     - `/quizzes/{quiz_id}/variants/{variant_id}/questions/{question_id}` - Questions
   - Seed quiz data with multiple variants

2. **Quiz Runner UI**
   - Create quiz taking interface
   - Show question progress
   - Timer (optional)
   - Submit button

3. **Quiz Submission (Server-Authoritative)**
   - Use existing `submitQuizAttempt(quiz_id, answers)` function
   - Function handles:
     - Deterministic variant selection (based on attempt count)
     - Scoring
     - Attempt tracking
     - Pass/fail determination

4. **Quiz Variant Logic**
   - If user fails, serve different variant on next attempt
   - Variant selection: `variant_id = (attempt_count % total_variants)`
   - Store in `/quiz_attempts/{attempt_id}`

5. **Email Trigger on Double Failure**
   - In `submitQuizAttempt()`, check if this is 2nd failure
   - Trigger email notification (stub for now, integrate SendGrid later)
   - Log event to analytics

6. **Quiz Wall (Progress Gating)**
   - User cannot progress to next chapter until quiz is passed
   - Check in `getNextLesson()` function
   - Display "Complete Quiz" message if blocked

7. **Quiz Results UI**
   - Show score, pass/fail status
   - Display attempt count
   - Show feedback if failed
   - "Retake Quiz" button

**Deliverables**: Complete quiz system with variants, attempts, and gating

---

## PHASE 6: Data Room
**Goal**: Document generation, templates, and asset requirements

### Tasks:
1. **Data Room Structure**
   - Display folders from `/data_rooms/{uid}/documents/{doc_id}`
   - Show document metadata: name, type, status, created_at

2. **Document Templates**
   - Create `/document_templates/{template_id}` collection
   - Seed templates: Business Plan, Financial Projections, etc.
   - Display template library

3. **Document Generation**
   - Use existing `generateDocumentPDF(template_id, form_data)` function
   - Create form UI for template fields
   - Submit form data to function
   - Function generates PDF, stores in Storage, links in Firestore

4. **Asset Requirements**
   - Create `/module_asset_requirements/{module_id}/requirements/{req_id}` collection
   - Define required assets per module
   - Display checklist: "Required for Module 1: Business Plan, Financial Projections"

5. **Asset Finalization**
   - Use existing `finalizeAssetDocument(doc_id)` function
   - Mark document as "final" (cannot be edited)
   - Function checks if all required assets are finalized
   - Triggers module completion evaluation

6. **Asset Wall (Progress Gating)**
   - User cannot complete module until all required assets are finalized
   - Check in `evaluateModuleCompletion()` function
   - Display "Complete Required Assets" message

**Deliverables**: Full Data Room with document generation and asset gating

---

## PHASE 7: Certificate Center
**Goal**: Certificate generation, download, and verification

### Tasks:
1. **Certificate Data Structure**
   - Store in `/users/{uid}.certificates` array or `/certificates/{cert_id}`
   - Include: module_id, issued_at, verification_code, score

2. **Certificate Generation Trigger**
   - In `evaluateGraduation()` function, generate certificate when user graduates
   - Create certificate document with:
     - User name, module name, completion date
     - Verification URL: `https://mortar.com/verify/{verification_code}`
   - Store PDF in Storage

3. **Certificate Display**
   - Show all earned certificates
   - Display certificate preview
   - Download button (fetch from Storage)

4. **Verification System**
   - Create `/verify/[code]` page
   - Query Firestore for certificate by verification_code
   - Display certificate details if valid

5. **LinkedIn Integration**
   - "Add to LinkedIn" button
   - Generate LinkedIn post/share content
   - Open LinkedIn share dialog

**Deliverables**: Certificate center with generation, download, and verification

---

## PHASE 8: Events Hub
**Goal**: Calendar view, RSVP, and admin event posting

### Tasks:
1. **Events Data Structure**
   - Use existing `/events/{event_id}` collection
   - Include: title, description, date, time, location, type, max_attendees
   - Subcollection: `/events/{event_id}/rsvps/{uid}`

2. **Events List View**
   - Fetch all events from Firestore
   - Filter by upcoming/past
   - Show RSVP status

3. **Calendar View**
   - Use calendar component from UI
   - Display events on calendar
   - Click event to see details

4. **RSVP Functionality**
   - Create Firebase Function `rsvpToEvent(event_id, rsvp_data)`:
     - Check if event has capacity
     - Create RSVP document
     - Update event attendee count
   - "Add to Calendar" button (generate ICS file)

5. **Admin Event Posting**
   - Admin-only form to create events
   - Create Firebase Function `createEvent(event_data)` (Admin only)
   - Set event type: "training", "networking", "workshop"

6. **Training Events**
   - Special handling for training events
   - Link to curriculum content if applicable
   - Show in calendar with special icon

**Deliverables**: Full events hub with calendar, RSVP, and admin posting

---

## PHASE 9: Discussion Board & Meetings
**Goal**: Threaded discussions and meeting proposals

### Tasks:
1. **Discussion Threads Structure**
   - Use existing `/discussion_threads/{thread_id}` collection
   - Include: title, author, content, category, created_at
   - Subcollection: `/discussion_threads/{thread_id}/comments/{comment_id}`

2. **Thread List View**
   - Fetch threads from Firestore
   - Filter by category, sort by recent/hot
   - Show reply count, view count, like count

3. **Thread Detail View**
   - Display thread content
   - Show comments (nested if needed)
   - Like/comment functionality

4. **Create Thread**
   - Form to create new thread
   - Create Firebase Function `createThread(thread_data)`
   - Validate user permissions

5. **Meeting Proposals**
   - Use existing `/meeting_proposals/{proposal_id}` collection
   - Use existing `proposeMeeting(payload)` function
   - Form to propose meeting: time slots, topic, description

6. **Meeting Approval**
   - Use existing `approveMeeting(proposal_id)` function (Admin only)
   - Admin dashboard to review proposals
   - On approval, create event in `/events` collection

7. **ICS File Generation**
   - Create Firebase Function `generateICSFile(event_data)`
   - Generate .ics file for calendar import
   - Return download link

**Deliverables**: Discussion board and meeting proposal system

---

## PHASE 10: Admin Dashboard
**Goal**: Analytics suite and user management

### Tasks:
1. **Admin Analytics Suite**
   - Use existing `adminAnalyticsReport(querySpec)` function
   - Create UI for:
     - KPIs: total users, completion rates, average scores
     - Cohort breakdown
     - City breakdown
     - Referral source breakdown
     - Time spent analytics
   - CSV export functionality

2. **User Management**
   - List all users
   - Filter by role, cohort, city
   - View user details
   - Edit user roles (use existing `setUserRole()` function)

3. **Hidden Video Access**
   - Use existing `grantHiddenTrainingVideo(uid, video_id)` function
   - UI to grant/revoke access
   - List users with access

4. **Content Management**
   - Manage curriculum content
   - Edit quizzes
   - Manage document templates
   - Manage events

5. **Moderation Tools**
   - Moderate discussion threads
   - Approve/reject meeting proposals
   - Review flagged content

**Deliverables**: Complete admin dashboard with analytics and management tools

---

## PHASE 11: Store & Points System
**Goal**: Shopify integration and points redemption

### Tasks:
1. **Points System**
   - Points stored in `/users/{uid}.points.balance`
   - Points ledger in `/points_ledger/{entry_id}`
   - Create Firebase Function `awardPoints(eventType, uid, metadata)`:
     - Award points for: module completion, asset creation, quiz scores
     - Update balance and ledger

2. **Points Display**
   - Show current balance on dashboard
   - Display points history
   - Show points earned per action

3. **Shopify Store Integration**
   - Embed Shopify store page or link to store
   - Pass user points balance to store (if using Shopify API)
   - Handle points redemption

4. **Points Redemption**
   - Create Firebase Function `redeemPoints(uid, amount, item_id)`:
     - Check balance
     - Deduct points
     - Create redemption record
     - Trigger Shopify order (if applicable)

5. **Merchandise Display**
   - Show available items
   - Display points cost
   - "Redeem" button

**Deliverables**: Points system and Shopify store integration

---

## PHASE 12: Progress Aggregation
**Goal**: Comprehensive progress tracking and graduation logic

### Tasks:
1. **Progress Data Structure**
   - `/user_progress/{uid}/lesson_progress/{lesson_id}`
   - `/user_progress/{uid}/chapter_results/{chapter_id}`
   - `/user_progress/{uid}/module_results/{module_id}`
   - `/user_progress/{uid}/curriculum_results/{curriculum_id}`

2. **Module Completion Evaluation**
   - Use existing `evaluateModuleCompletion(uid, module_id)` function
   - Checks:
     - All chapters completed (lessons + quiz passed)
     - All required assets finalized
   - Updates `/user_progress/{uid}/module_results/{module_id}`

3. **Graduation Evaluation**
   - Use existing `evaluateGraduation(uid)` function
   - Checks:
     - All 4 modules completed
     - All required assets created
   - Triggers:
     - Certificate generation
     - Badge awarding
     - Role upgrade (Digital Curriculum Student → Alumni)
     - Points award

4. **Badge Awarding**
   - Create Firebase Function `awardBadge(uid, badge_id)`:
     - Add badge to `/users/{uid}.badges.earned`
     - Award points
     - Log analytics event

5. **Progress Dashboard**
   - Show overall progress
   - Display module completion status
   - Show badges earned
   - Display graduation status

**Deliverables**: Complete progress aggregation and graduation system

---

## PHASE 13: Mobile App Integration
**Goal**: Deep links and mobile preview

### Tasks:
1. **Deep Link Generation**
   - Create Firebase Function `generateMobileAccessCode(uid)`:
     - Generate unique access code
     - Store in `/users/{uid}.mobile_access_code`
     - Return code

2. **Mobile Preview Page**
   - Create `/mobile-preview` page
   - Show mobile app features
   - Display access code
   - QR code for mobile app scanning

3. **"Open Mobile App" Button**
   - Add to dashboard
   - Generate deep link
   - Open mobile app or redirect to app store

4. **Mobile App Features**
   - Document mobile app features that differ from web
   - Ensure role-based feature access works

**Deliverables**: Mobile app integration with deep links and preview

---

## PHASE 14: Business Profile Enhancement
**Goal**: Verify business profile integration (already in onboarding)

### Tasks:
1. **Verify Onboarding Integration**
   - Business profile already collected in onboarding
   - Verify data is saved to `/users/{uid}.business_profile`
   - Verify cohort, city, connection goals are stored

2. **Profile Display**
   - Show business profile on user profile page
   - Display cohort, city, connection goals

3. **Profile Editing**
   - Allow users to edit business profile
   - Use existing `setUserBusinessProfile()` function

**Deliverables**: Verified business profile integration

---

## PHASE 15: City Badges
**Goal**: Create and award city-specific badges

### Tasks:
1. **Badge Data Structure**
   - Create `/badges/{badge_id}` collection
   - Include: name, description, icon, city, requirements

2. **City Badge Creation**
   - Create badges for each city
   - Store in Firestore
   - Define requirements (e.g., "Complete onboarding in Cincinnati")

3. **Badge Awarding Logic**
   - In `onUserCreated` or `setUserBusinessProfile`:
     - Check user's city
     - Award corresponding city badge
     - Add to `/users/{uid}.badges.earned`

4. **Badge Display**
   - Show city badge on profile
   - Display in certificate center
   - Show in dashboard

**Deliverables**: City badge system with automatic awarding

---

## PHASE 16: Pricing Model
**Goal**: Module-based payment system

### Tasks:
1. **Pricing Data Structure**
   - Create `/pricing/{module_id}` collection
   - Include: module_id, price, currency, description

2. **Purchase Flow**
   - User clicks "Purchase Module"
   - Redirect to payment page (Stripe/Shopify)
   - On success, call Firebase Function `purchaseModule(uid, module_id, transaction_id)`:
     - Add module to `/users/{uid}.membership.paid_modules`
     - Create transaction record
     - Award points (if applicable)

3. **Access Control**
   - In `checkChapterAccess()` function:
     - Check if chapter is free (first 5)
     - Check if user has purchased module
     - Return access status

4. **Payment Integration**
   - Integrate Stripe or Shopify Payments
   - Handle webhooks for payment confirmation
   - Update user access on payment success

**Deliverables**: Module-based payment system with access control

---

## PHASE 17: Analytics Tracking
**Goal**: Comprehensive event logging and admin analytics

### Tasks:
1. **Event Logging**
   - Use existing `logAnalyticsEvent()` function
   - Add logging to all key actions:
     - Lesson started/completed
     - Quiz started/submitted
     - Asset created/finalized
     - Module completed
     - Certificate earned
     - Event RSVP
     - Discussion post created

2. **Admin Analytics Suite**
   - Use existing `adminAnalyticsReport()` function
   - Build UI with:
     - KPIs dashboard
     - Cohort breakdown charts
     - City breakdown charts
     - Referral source charts
     - Time spent analytics
     - Completion rate trends

3. **CSV Export**
   - Create Firebase Function `exportAnalyticsCSV(querySpec)`:
     - Query analytics events
     - Generate CSV
     - Return download link

4. **Real-time Updates**
   - Use Firestore real-time listeners for live updates
   - Update charts automatically

**Deliverables**: Complete analytics tracking and admin suite

---

## PHASE 18: Testing & Bug Fixes
**Goal**: Comprehensive testing and bug fixes

### Tasks:
1. **Unit Testing**
   - Test all Firebase Functions
   - Test data validation
   - Test error handling

2. **Integration Testing**
   - Test full user flows:
     - Sign up → Onboarding → Dashboard
     - Curriculum → Lesson → Quiz → Asset
     - Module completion → Certificate
     - Event RSVP → Calendar
     - Discussion post → Meeting proposal

3. **Edge Case Testing**
   - Test with no data
   - Test with incomplete data
   - Test permission boundaries
   - Test concurrent operations

4. **Error Handling**
   - Add error boundaries
   - Display user-friendly error messages
   - Log errors to analytics

5. **Performance Testing**
   - Test with large datasets
   - Optimize Firestore queries
   - Add pagination where needed

**Deliverables**: Fully tested application with bug fixes

---

## PHASE 19: Deployment
**Goal**: Deploy to staging and production

### Tasks:
1. **Environment Configuration**
   - Set up staging environment variables
   - Set up production environment variables
   - Configure Firebase projects (dev/stage/prod)

2. **CI/CD Pipeline**
   - Update GitHub Actions workflows
   - Add deployment steps for staging
   - Add deployment steps for production

3. **Staging Deployment**
   - Deploy functions to staging
   - Deploy web app to staging
   - Test staging environment

4. **Production Deployment**
   - Deploy functions to production
   - Deploy web app to production
   - Verify production environment

5. **Monitoring**
   - Set up error monitoring (Sentry)
   - Set up analytics (Firebase Analytics)
   - Set up performance monitoring

**Deliverables**: Deployed application to staging and production

---

## Implementation Notes

### Firebase Functions (Server-Authoritative)
All complex computing should be done in Firebase Functions:
- Progress calculations
- Quiz scoring
- Certificate generation
- Badge awarding
- Points calculations
- Analytics aggregation

### Security Rules
- Deny by default
- Users can only read their own data
- Writes go through callable functions
- Admin-only access to admin features

### Data Consistency
- Use Firestore transactions for critical operations
- Use server timestamps for all timestamps
- Validate all inputs with Zod schemas

### Performance
- Use Firestore indexes for all queries
- Implement pagination for large lists
- Cache frequently accessed data
- Use Firestore real-time listeners sparingly

### Error Handling
- All functions should have try-catch blocks
- Return user-friendly error messages
- Log errors for debugging
- Use error boundaries in React components

---

## Success Criteria

1. ✅ All features from UI scaffolding are implemented
2. ✅ All Firebase Functions are working correctly
3. ✅ All security rules are in place
4. ✅ All edge cases are handled
5. ✅ Application is deployed to staging and production
6. ✅ No critical bugs remain
7. ✅ Performance is acceptable
8. ✅ Analytics are tracking correctly

---

## Next Steps

Start with **PHASE 1: Foundation & Integration** and proceed sequentially through each phase. Each phase should be completed and tested before moving to the next.
