import { createBrowserRouter, redirect } from "react-router";

// Import all page components directly (no lazy loading to avoid module fetch errors)
import { Root } from "./pages/Root";

import { WebDashboard } from "./pages/web/Dashboard";
import { WebCurriculum } from "./pages/web/Curriculum";
import { WebQuizzes } from "./pages/web/Quizzes";
import { WebDataRoom } from "./pages/web/DataRoom";
import { WebEvents } from "./pages/web/Events";
import { WebAnalytics } from "./pages/web/Analytics";
import { WebCommunityHub } from "./pages/web/CommunityHub";
import { CourseDetail } from "./pages/web/CourseDetail";

import { MobileFeed } from "./pages/mobile/Feed";
import { MobileGroups } from "./pages/mobile/Groups";
import { MobileEvents } from "./pages/mobile/Events";
import { MobileExplore } from "./pages/mobile/Explore";
import { MobileMatching } from "./pages/mobile/Matching";
import { MobileProfile } from "./pages/mobile/Profile";
import { MobileOnboarding } from "./pages/mobile/Onboarding";

// Admin pages
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { UserAnalytics } from "./pages/admin/UserAnalytics";
import { CurriculumAdmin } from "./pages/admin/CurriculumAdmin";
import { EventModeration } from "./pages/admin/EventModeration";
import { RoleAssignment } from "./pages/admin/RoleAssignment";
import { Reports } from "./pages/admin/Reports";
import { PaymentManager } from "./pages/admin/PaymentManager";
import { AlumniUpload } from "./pages/admin/AlumniUpload";
import { Integrations } from "./pages/admin/Integrations";
import { BadgeManagement } from "./pages/admin/BadgeManagement";
import { GroupManagement } from "./pages/admin/GroupManagement";
import { AppAccessHub } from "./pages/admin/AppAccessHub";
import { ExpansionMobile } from "./pages/admin/ExpansionMobile";
import { MortarInfo } from "./pages/admin/MortarInfo";
import { DirectMessages } from "./pages/admin/DirectMessages";
import { ShopManagement } from "./pages/admin/ShopManagement";
import { UnifiedDashboard } from "./pages/UnifiedDashboard";

export const router = createBrowserRouter([
  // All routes (no authentication required)
  {
    path: "/",
    Component: Root,
    children: [
      // Default to admin dashboard
      { index: true, loader: () => redirect("/admin") },
      { path: "dashboard", Component: WebDashboard },
      { path: "curriculum", Component: WebCurriculum },
      { path: "course/:courseId", Component: CourseDetail },
      { path: "quizzes", Component: WebQuizzes },
      { path: "data-room", Component: WebDataRoom },
      { path: "certificates", loader: () => redirect("/curriculum") },
      { path: "community", Component: WebCommunityHub },
      { path: "events", Component: WebEvents },
      { path: "analytics", Component: WebAnalytics },
      
      // Mobile routes
      { path: "mobile/feed", Component: MobileFeed },
      { path: "mobile/groups", Component: MobileGroups },
      { path: "mobile/events", Component: MobileEvents },
      { path: "mobile/explore", Component: MobileExplore },
      { path: "mobile/matching", Component: MobileMatching },
      { path: "mobile/profile", Component: MobileProfile },
      { path: "mobile/onboarding", Component: MobileOnboarding },

      // Admin routes
      { path: "admin", Component: UnifiedDashboard },
      { path: "admin/dashboard", Component: AdminDashboard },
      { path: "admin/groups", Component: GroupManagement },
      { path: "admin/events", Component: EventModeration },
      { path: "admin/alumni", Component: AlumniUpload },
      { path: "admin/roles", Component: RoleAssignment },
      { path: "admin/analytics", Component: UserAnalytics },
      { path: "admin/badges", Component: BadgeManagement },
      { path: "admin/app-access", Component: AppAccessHub },
      { path: "admin/expansion-mobile", Component: ExpansionMobile },
      { path: "admin/mortar-info", Component: MortarInfo },
      { path: "admin/messages", Component: DirectMessages },
      { path: "admin/curriculum", Component: CurriculumAdmin },
      { path: "admin/shop", Component: ShopManagement },
      { path: "admin/reports", Component: Reports },
      { path: "admin/payments", Component: PaymentManager },
      { path: "admin/integrations", Component: Integrations },
    ],
  },
]);