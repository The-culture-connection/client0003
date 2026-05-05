import type { ReactNode } from "react";
import { createBrowserRouter, redirect } from "react-router";
import { Root } from "./pages/Root";
import { LoginPage } from "./pages/Login";
import { JoinPage } from "./pages/Join";
import { VerifyEmailPage } from "./pages/VerifyEmail";
import { WebDashboard } from "./pages/web/Dashboard";
import { WebCurriculum } from "./pages/web/Curriculum";
import { WebQuizzes } from "./pages/web/Quizzes";
import { WebDataRoom } from "./pages/web/DataRoom";
import { WebEvents } from "./pages/web/Events";
import { WebAnalytics } from "./pages/web/Analytics";
import { WebCommunityHub } from "./pages/web/CommunityHub";
import { WebShop } from "./pages/web/Shop";
import { ModuleDetail } from "./pages/web/ModuleDetail";
import { CourseDetail } from "./pages/web/CourseDetail";
import { MobileFeed } from "./pages/mobile/Feed";
import { MobileGroups } from "./pages/mobile/Groups";
import { MobileEvents } from "./pages/mobile/Events";
import { MobileExplore } from "./pages/mobile/Explore";
import { MobileMatching } from "./pages/mobile/Matching";
import { MobileProfile } from "./pages/mobile/Profile";
import { MobileOnboarding } from "./pages/mobile/Onboarding";
import { OnboardingPage } from "./pages/Onboarding";
import { DiscussionsPage } from "./pages/Discussions";
import { DiscussionDetailPage } from "./pages/DiscussionDetail";
import { GroupDetailPage } from "./pages/GroupDetail";
import { EventDetailPage } from "./pages/EventDetail";
import { AdminPage } from "./pages/Admin";
import { AdminAuthPage } from "./pages/AdminAuth";
import { LessonDeckBuilder } from "./pages/admin/LessonDeckBuilder";
import { LessonPlayer } from "./pages/learn/LessonPlayer";
import { CourseCreationWizard } from "./pages/admin/CourseCreationWizard";
import { CourseBuilder } from "./pages/admin/CourseBuilder";
import { AdminCommandCenter } from "./pages/admin/AdminCommandCenter";
import { AdminLayout } from "./layouts/AdminLayout";
import { PublicCertificatePage } from "./pages/PublicCertificate";
import { AuthGuard } from "./components/auth/AuthGuard";
import { OnboardingGate } from "./components/auth/OnboardingGate";
import { RoleGate } from "./components/auth/RoleGate";

function StaffAdminGate({ children }: { children: ReactNode }) {
  return <RoleGate allowedRoles={["superAdmin", "Admin"]}>{children}</RoleGate>;
}

function AdminRoutesLayout() {
  return (
    <StaffAdminGate>
      <AdminLayout />
    </StaffAdminGate>
  );
}

// Wrapper component for protected routes
function ProtectedRoot() {
  return (
    <AuthGuard>
      <OnboardingGate>
        <Root />
      </OnboardingGate>
    </AuthGuard>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    loader: () => redirect("/login"),
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/join",
    Component: JoinPage,
  },
  {
    path: "/verify-email",
    Component: VerifyEmailPage,
  },
  {
    path: "/certificate/:shareId",
    Component: PublicCertificatePage,
  },
  {
    path: "/onboarding",
    Component: () => (
      <AuthGuard>
        <OnboardingPage />
      </AuthGuard>
    ),
  },
  {
    path: "/",
    Component: ProtectedRoot,
    children: [
      { index: true, loader: () => redirect("/dashboard") },
      { path: "dashboard", Component: WebDashboard },
      { path: "curriculum", Component: WebCurriculum },
      { path: "curriculum/:moduleId", Component: ModuleDetail },
      { path: "courses/:courseId", Component: CourseDetail },
      { path: "quizzes", Component: WebQuizzes },
      { path: "data-room", Component: WebDataRoom },
      { path: "certificates", loader: () => redirect("/curriculum") },
      { path: "community", Component: WebCommunityHub },
      { path: "shop", Component: WebShop },
      { path: "discussions", Component: DiscussionsPage },
      { path: "discussions/:id", Component: DiscussionDetailPage },
      { path: "groups/:id", Component: GroupDetailPage },
      { path: "events", Component: WebEvents },
      { path: "events/:id", Component: EventDetailPage },
      {
        path: "analytics",
        Component: () => (
          <RoleGate deniedRoles={["Digital Curriculum Students"]}>
            <WebAnalytics />
          </RoleGate>
        ),
      },
      {
        path: "admin/auth",
        Component: () => (
          <StaffAdminGate>
            <AdminAuthPage />
          </StaffAdminGate>
        ),
      },
      {
        path: "admin",
        Component: AdminRoutesLayout,
        children: [
          { index: true, Component: AdminCommandCenter },
          { path: "panel/:tab", Component: AdminPage },
          { path: "courses/create", Component: CourseCreationWizard },
          { path: "courses/builder", Component: CourseBuilder },
          { path: "courses/:courseId", Component: CourseBuilder },
          {
            path: "curriculum/:curriculumId/module/:moduleId/chapter/:chapterId/lesson/:lessonId/builder",
            Component: LessonDeckBuilder,
          },
        ],
      },
      {
        path: "learn/lesson/:lessonId",
        Component: LessonPlayer,
      },
      { path: "mobile/feed", Component: MobileFeed },
      { path: "mobile/groups", Component: MobileGroups },
      { path: "mobile/events", Component: MobileEvents },
      { path: "mobile/explore", Component: MobileExplore },
      { path: "mobile/matching", Component: MobileMatching },
      { path: "mobile/profile", Component: MobileProfile },
      { path: "mobile/onboarding", Component: MobileOnboarding },
    ],
  },
]);
