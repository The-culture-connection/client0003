# MORTAR MASTERS Online - Full Implementation Guide

## Overview
Complete curriculum-driven learning platform with freemium model, quiz gating, asset gating, and graduation system.

## Firestore Data Model

### Collections Structure

```
/users/{uid}
  - roles: string[]
  - business_profile: {
      cohort_name: string
      city: string
      connection_intents: string[]
    }
  - badges: {earned: string[], visible: string[]}
  - membership: {status: string, paid_modules: string[]}
  - permissions: {hidden_videos: string[]}
  - points: {balance: number, history_summary: object}
  - profile_completed: boolean

/curricula/{curriculum_id}/modules/{module_id}/chapters/{chapter_id}/lessons/{lesson_id}
  - lesson_id, chapter_id, module_id
  - title, content, video_url, external_url
  - order_index, duration_minutes
  - is_free: boolean (first 5 chapters per module)

/quizzes/{quiz_id}
  - chapter_id, module_id
  - passing_score: number (default 70)
  - variant_count: number
  - /variants/{variant_id}/questions/{question_id}
    - question_text, options[], correct_answer, points

/quiz_attempts/{attempt_id}
  - user_id, quiz_id, variant_id
  - answers: {question_id: answer_index}
  - score, passed, attempt_number
  - created_at

/user_progress/{uid}
  - /lesson_progress/{lesson_id}
    - time_spent_seconds, completed, completed_at
  - /chapter_results/{chapter_id}
    - lessons_completed, total_lessons
    - quiz_passed, quiz_attempts
  - /module_results/{module_id}
    - completed, assets_finalized, chapters_completed
  - /curriculum_results/{curriculum_id}
    - graduated, graduated_at, certificate_id, badges_awarded

/document_templates/{template_id}
  - name, module_id, schema (form fields)
  - template_type: "business_plan" | "financial_model" | etc.

/data_rooms/{uid}/documents/{doc_id}
  - template_id, template_name
  - form_data, file_path, file_url
  - is_final, finalized_at

/module_asset_requirements/{module_id}/requirements/{req_id}
  - template_id (required), order_index

/events/{event_id}
  - title, description, event_date, event_end_date
  - event_type, organizer_id, status
  - /rsvps/{uid}
    - rsvp_status, rsvp_at

/discussion_threads/{thread_id}
  - title, content, author_id
  - created_at, updated_at
  - /comments/{comment_id}
    - content, author_id, created_at

/meeting_proposals/{proposal_id}
  - proposer_id, topic, description
  - proposed_time_slots: [{start_time, end_time}]
  - status: "pending" | "approved" | "rejected"
  - event_id (if approved)

/certificates/{cert_id}
  - user_id, curriculum_id, certificate_type
  - issued_at, verification_url, pdf_url

/badges/{badge_id}
  - name, description, icon_url, badge_type

/analytics_events/{event_id}
  - event_type, user_id, timestamp
  - metadata: object

/points_ledger/{entry_id}
  - user_id, event_type, points, metadata
  - created_at
```

## Cloud Functions

### Exported Functions

1. **onUserCreated** (trigger)
   - Creates /users, /data_rooms, /user_progress defaults

2. **setUserRole** (callable)
   - Admin only
   - Updates custom claims and Firestore roles

3. **upsertBusinessProfile** (callable)
   - Updates business_profile in /users/{uid}
   - Sets profile_completed flag

4. **logAnalyticsEvent** (callable)
   - Normalizes and logs analytics events

5. **trackLessonTime** (callable)
   - Server-authoritative time tracking
   - Clamps delta_seconds (max 3600 per call)

6. **markLessonComplete** (callable)
   - Marks lesson complete
   - Updates chapter progress
   - Checks chapter completion

7. **submitQuizAttempt** (callable)
   - Server-authoritative quiz scoring
   - Deterministic variant selection
   - Email notification on 2nd failure
   - Enforces quiz wall

8. **generateDocumentPDF** (callable)
   - Generates PDF from template
   - Stores in Storage
   - Creates /data_rooms document

9. **finalizeAssetDocument** (callable)
   - Marks asset as final
   - Checks module completion

10. **grantHiddenTrainingVideo** (callable)
    - Admin only
    - Grants video access permissions

11. **proposeMeeting** (callable)
    - Creates meeting proposal

12. **approveMeeting** (callable)
    - Admin only
    - Approves proposal and creates event

13. **adminAnalyticsReport** (callable)
    - Admin only
    - Generates analytics reports

## Frontend Routes

### Authentication
- `/login` - Login page
- `/signup` - Signup page
- `/forgot-password` - Password reset
- `/verify-email` - Email verification
- `/join/{code}` - Invite code join

### Onboarding
- `/onboarding` - Business profile setup (gated)
- `/mobile/onboarding` - Mobile onboarding

### Dashboard
- `/dashboard` - Main dashboard
  - Next lesson
  - Progress across 4 modules
  - Quiz status
  - Asset completion
  - Badges
  - Upcoming events

### Curriculum
- `/curriculum` - Curriculum catalog
- `/curriculum/modules/{moduleId}` - Module detail
- `/curriculum/modules/{moduleId}/chapters/{chapterId}` - Chapter detail
- `/curriculum/modules/{moduleId}/chapters/{chapterId}/lessons/{lessonId}` - Lesson viewer
- `/curriculum/hidden-videos` - Hidden training videos (permission-gated)

### Quizzes
- `/quizzes` - Quiz list
- `/quizzes/{quizId}` - Quiz runner
- `/quizzes/{quizId}/results` - Quiz results

### Data Room
- `/data-room` - Data Room home
- `/data-room/templates` - Document templates
- `/data-room/documents/{docId}` - Document viewer/editor
- `/data-room/generate/{templateId}` - Document generator

### Certificates
- `/certificates` - Certificate center
- `/certificates/{certId}` - Certificate detail

### Events
- `/events` - Events hub (list + calendar)
- `/events/{eventId}` - Event detail
- `/events/{eventId}/rsvp` - RSVP page

### Discussion
- `/discussion` - Discussion board
- `/discussion/threads/{threadId}` - Thread detail

### Meetings
- `/meetings` - Meeting proposals
- `/meetings/propose` - Propose meeting

### Admin
- `/admin` - Admin dashboard
- `/admin/analytics` - Analytics suite
- `/admin/users` - User management
- `/admin/content` - Content management
- `/admin/events` - Event management

### Store
- `/store` - Shopify store integration
- `/points` - Points system

### Mobile
- `/mobile/feed` - Mobile feed
- `/mobile/groups` - Groups
- `/mobile/events` - Mobile events
- `/mobile/explore` - Explore
- `/mobile/profile` - Mobile profile
- `/mobile/matching` - Matching

## Component Inventory

### Pages
- `DashboardPage` - Main dashboard
- `CurriculumCatalogPage` - Module listing
- `ModuleDetailPage` - Module chapters
- `ChapterDetailPage` - Chapter lessons
- `LessonViewerPage` - Lesson content
- `QuizListPage` - Available quizzes
- `QuizRunnerPage` - Active quiz
- `QuizResultsPage` - Quiz results
- `DataRoomPage` - Data room home
- `DocumentGeneratorPage` - PDF generation
- `CertificateCenterPage` - Certificates
- `EventsHubPage` - Events list/calendar
- `EventDetailPage` - Event details
- `DiscussionBoardPage` - Discussion threads
- `ThreadDetailPage` - Thread with comments
- `MeetingProposalsPage` - Meeting proposals
- `AdminDashboardPage` - Admin overview
- `AdminAnalyticsPage` - Analytics reports
- `StorePage` - Shopify store
- `PointsPage` - Points system

### Components
- `BusinessProfileGate` - Blocks curriculum access until profile complete
- `RoleGate` - Role-based access control
- `PrivilegeGate` - Permission-based access control
- `PaywallBanner` - Module purchase prompt
- `QuizGate` - Blocks chapter progress until quiz passed
- `AssetGate` - Blocks module completion until assets finalized
- `ProgressTracker` - Visual progress indicator
- `ModuleCard` - Module display card
- `ChapterCard` - Chapter display card
- `LessonCard` - Lesson display card
- `QuizCard` - Quiz display card
- `AssetChecklist` - Required assets checklist
- `DocumentBuilder` - Form-based document generator
- `CertificateViewer` - Certificate display
- `EventCalendar` - Calendar view
- `DiscussionThread` - Thread component
- `MeetingProposalForm` - Meeting proposal form
- `AnalyticsChart` - Chart component
- `AdminUserTable` - User management table

## Verification Checklist

### Backend
- [ ] All Cloud Functions deployed
- [ ] Firestore indexes created
- [ ] Security rules deployed
- [ ] Test user creation flow
- [ ] Test quiz submission and scoring
- [ ] Test document generation
- [ ] Test graduation flow
- [ ] Test analytics reporting

### Frontend
- [ ] Business profile gating works
- [ ] Curriculum catalog displays correctly
- [ ] Freemium paywall shows for locked content
- [ ] Quiz gating prevents chapter progress
- [ ] Asset gating prevents module completion
- [ ] Graduation triggers certificate and badges
- [ ] Admin dashboard accessible
- [ ] Analytics reports generate
- [ ] Discussion board functional
- [ ] Meeting proposals work
- [ ] Events calendar displays
- [ ] Mobile integration maintained

## Next Steps
1. Build frontend components
2. Integrate with Firebase
3. Add PDF generation library
4. Implement email service
5. Add Shopify integration
6. Test end-to-end flows
