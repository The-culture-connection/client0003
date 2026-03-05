# MORTAR MASTERS Online - Complete Route Map

## Authentication Routes
- `/login` - Email/password + Google sign-in
- `/signup` - User registration
- `/forgot-password` - Password reset
- `/verify-email` - Email verification
- `/join/{code}` - Invite code registration

## Onboarding Routes
- `/onboarding` - Business profile setup (web)
- `/mobile/onboarding` - Business profile setup (mobile)

## Main Application Routes

### Dashboard
- `/dashboard` - Main dashboard
  - Next lesson
  - Module progress (4 modules)
  - Quiz status
  - Asset completion
  - Badges earned
  - Upcoming events

### Curriculum
- `/curriculum` - Curriculum catalog (all 4 modules)
- `/curriculum/modules/{moduleId}` - Module detail with chapters
- `/curriculum/modules/{moduleId}/chapters/{chapterId}` - Chapter detail with lessons
- `/curriculum/modules/{moduleId}/chapters/{chapterId}/lessons/{lessonId}` - Lesson viewer
- `/curriculum/hidden-videos` - Hidden training videos (permission-gated)

### Quizzes
- `/quizzes` - Quiz list (by chapter)
- `/quizzes/{quizId}` - Quiz runner
- `/quizzes/{quizId}/results` - Quiz results

### Data Room
- `/data-room` - Data Room home
  - Templates list
  - Generated documents
  - Asset requirements per module
- `/data-room/templates/{templateId}` - Template detail
- `/data-room/generate/{templateId}` - Document generator form
- `/data-room/documents/{docId}` - Document viewer/editor

### Certificates & Badges
- `/certificates` - Certificate center
- `/certificates/{certId}` - Certificate detail with download

### Events
- `/events` - Events hub
  - List view
  - Calendar view
- `/events/{eventId}` - Event detail with RSVP

### Discussion
- `/discussion` - Discussion board (threaded posts)
- `/discussion/threads/{threadId}` - Thread detail with comments

### Meetings
- `/meetings` - Meeting proposals list
- `/meetings/propose` - Propose new meeting

### Admin
- `/admin` - Admin dashboard
- `/admin/analytics` - Analytics suite
- `/admin/users` - User management
- `/admin/content` - Content management (curriculum, quizzes)
- `/admin/events` - Event management
- `/admin/moderation` - Discussion moderation

### Store & Points
- `/store` - Shopify store integration
- `/points` - Points system dashboard

### Mobile Routes (existing)
- `/mobile/feed` - Mobile feed
- `/mobile/groups` - Groups
- `/mobile/events` - Mobile events
- `/mobile/explore` - Explore
- `/mobile/profile` - Mobile profile
- `/mobile/matching` - Matching

## Component Files Structure

```
web/src/
├── components/
│   ├── auth/
│   │   ├── AuthProvider.tsx
│   │   ├── AuthGuard.tsx
│   │   ├── BusinessProfileGate.tsx (NEW)
│   │   ├── RoleGate.tsx (NEW)
│   │   └── PrivilegeGate.tsx (NEW)
│   ├── curriculum/
│   │   ├── ModuleCard.tsx (NEW)
│   │   ├── ChapterCard.tsx (NEW)
│   │   ├── LessonCard.tsx (NEW)
│   │   ├── PaywallBanner.tsx (NEW)
│   │   ├── QuizGate.tsx (NEW)
│   │   └── AssetGate.tsx (NEW)
│   ├── quiz/
│   │   ├── QuizRunner.tsx (NEW)
│   │   ├── QuizResults.tsx (NEW)
│   │   └── QuizCard.tsx (NEW)
│   ├── data-room/
│   │   ├── DocumentBuilder.tsx (NEW)
│   │   ├── AssetChecklist.tsx (NEW)
│   │   └── DocumentViewer.tsx (NEW)
│   ├── certificates/
│   │   └── CertificateViewer.tsx (NEW)
│   ├── events/
│   │   ├── EventCalendar.tsx (NEW)
│   │   └── EventCard.tsx (NEW)
│   ├── discussion/
│   │   ├── DiscussionThread.tsx (NEW)
│   │   └── ThreadCard.tsx (NEW)
│   ├── admin/
│   │   ├── AdminDashboard.tsx (NEW)
│   │   ├── AnalyticsChart.tsx (NEW)
│   │   └── UserTable.tsx (NEW)
│   └── pages/ (existing pages)
├── lib/
│   ├── firebase.ts
│   ├── auth.ts
│   ├── permissions.ts
│   ├── curriculum.ts (NEW)
│   ├── quiz.ts (NEW)
│   ├── dataRoom.ts (NEW)
│   └── analytics.ts (NEW)
└── app/
    ├── (dashboard)/
    │   ├── dashboard/
    │   ├── curriculum/
    │   │   ├── modules/
    │   │   │   └── [moduleId]/
    │   │   │       └── chapters/
    │   │   │           └── [chapterId]/
    │   │   │               └── lessons/
    │   │   │                   └── [lessonId]/
    │   ├── quizzes/
    │   ├── data-room/
    │   ├── certificates/
    │   ├── events/
    │   ├── discussion/
    │   ├── meetings/
    │   ├── admin/
    │   ├── store/
    │   └── points/
    └── login/
```
