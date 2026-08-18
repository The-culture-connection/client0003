import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { createBrowserRouter, redirect } from "react-router";
import { Root } from "./pages/Root";
import { LoginPage } from "./pages/Login";
// Dashboard stays in the entry bundle on purpose: it is the landing page after
// login, so an extra lazy-chunk round trip there would slow the common path.
import { WebDashboard } from "./pages/web/Dashboard";
import { AuthGuard } from "./components/auth/AuthGuard";
import { OnboardingGate } from "./components/auth/OnboardingGate";
import { RoleGate } from "./components/auth/RoleGate";

/** Minimal branded fallback shown while a lazy route chunk downloads. */
function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div
        className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}

/**
 * Route-level code splitting: wrap a named page export in React.lazy +
 * Suspense. Everything except the login page, the shell (Root) and the
 * Dashboard is split out of the entry bundle — most importantly the admin
 * course builder (react-dnd, pptx import), the lesson player (pdfjs-dist /
 * react-pdf), the Data Room (jszip) and analytics panels (recharts).
 */
function lazyPage<M extends Record<string, unknown>>(
  load: () => Promise<M>,
  name: keyof M & string
): ComponentType {
  const LazyComponent = lazy(async () => {
    const mod = await load();
    return { default: mod[name] as ComponentType };
  });
  return function LazyRoute() {
    return (
      <Suspense fallback={<PageLoader />}>
        <LazyComponent />
      </Suspense>
    );
  };
}

const JoinPage = lazyPage(() => import("./pages/Join"), "JoinPage");
const VerifyEmailPage = lazyPage(() => import("./pages/VerifyEmail"), "VerifyEmailPage");
const WebCurriculum = lazyPage(() => import("./pages/web/Curriculum"), "WebCurriculum");
const WebQuizzes = lazyPage(() => import("./pages/web/Quizzes"), "WebQuizzes");
const WebDataRoom = lazyPage(() => import("./pages/web/DataRoom"), "WebDataRoom");
const WebEvents = lazyPage(() => import("./pages/web/Events"), "WebEvents");
const WebCommunityHub = lazyPage(() => import("./pages/web/CommunityHub"), "WebCommunityHub");
const WebShop = lazyPage(() => import("./pages/web/Shop"), "WebShop");
const ModuleDetail = lazyPage(() => import("./pages/web/ModuleDetail"), "ModuleDetail");
const CourseDetail = lazyPage(() => import("./pages/web/CourseDetail"), "CourseDetail");
const MobileFeed = lazyPage(() => import("./pages/mobile/Feed"), "MobileFeed");
const MobileGroups = lazyPage(() => import("./pages/mobile/Groups"), "MobileGroups");
const MobileEvents = lazyPage(() => import("./pages/mobile/Events"), "MobileEvents");
const MobileExplore = lazyPage(() => import("./pages/mobile/Explore"), "MobileExplore");
const MobileMatching = lazyPage(() => import("./pages/mobile/Matching"), "MobileMatching");
const MobileProfile = lazyPage(() => import("./pages/mobile/Profile"), "MobileProfile");
const MobileOnboarding = lazyPage(() => import("./pages/mobile/Onboarding"), "MobileOnboarding");
const OnboardingPage = lazyPage(() => import("./pages/Onboarding"), "OnboardingPage");
const MortarInfoPage = lazyPage(() => import("./pages/MortarInfo"), "MortarInfoPage");
const DiscussionsPage = lazyPage(() => import("./pages/Discussions"), "DiscussionsPage");
const DiscussionDetailPage = lazyPage(() => import("./pages/DiscussionDetail"), "DiscussionDetailPage");
const GroupDetailPage = lazyPage(() => import("./pages/GroupDetail"), "GroupDetailPage");
const EventDetailPage = lazyPage(() => import("./pages/EventDetail"), "EventDetailPage");
const PaymentSuccessPage = lazyPage(() => import("./pages/PaymentResult"), "PaymentSuccessPage");
const PaymentCancelPage = lazyPage(() => import("./pages/PaymentResult"), "PaymentCancelPage");
const AdminPage = lazyPage(() => import("./pages/Admin"), "AdminPage");
const AdminAuthPage = lazyPage(() => import("./pages/AdminAuth"), "AdminAuthPage");
const LessonDeckBuilder = lazyPage(() => import("./pages/admin/LessonDeckBuilder"), "LessonDeckBuilder");
const LessonPlayer = lazyPage(() => import("./pages/learn/LessonPlayer"), "LessonPlayer");
const CourseCreationWizard = lazyPage(() => import("./pages/admin/CourseCreationWizard"), "CourseCreationWizard");
const CourseBuilder = lazyPage(() => import("./pages/admin/CourseBuilder"), "CourseBuilder");
const AdminCommandCenter = lazyPage(() => import("./pages/admin/AdminCommandCenter"), "AdminCommandCenter");
const AdminDocs = lazyPage(() => import("./pages/admin/AdminDocs"), "AdminDocs");
const AdminLayout = lazyPage(() => import("./layouts/AdminLayout"), "AdminLayout");
const PublicCertificatePage = lazyPage(() => import("./pages/PublicCertificate"), "PublicCertificatePage");
const DeleteAccountPage = lazyPage(() => import("./pages/DeleteAccount"), "DeleteAccountPage");
const ChildSafetyPage = lazyPage(() => import("./pages/ChildSafety"), "ChildSafetyPage");
const GetTheAppPage = lazyPage(() => import("./pages/GetTheApp"), "GetTheAppPage");

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
  // Public on purpose: Google Play requires the deletion request page to be
  // reachable without signing in or installing the app. Keep it outside
  // AuthGuard, and keep the URL stable — it is registered in Play Console.
  {
    path: "/delete-account",
    Component: DeleteAccountPage,
  },
  // Public on purpose: Google Play's Child Safety Standards policy requires the
  // published CSAE standards to be reachable without an account, and the URL is
  // registered in Play Console — keep it stable.
  {
    path: "/child-safety",
    Component: ChildSafetyPage,
  },
  // Public on purpose: this is the link we hand out in emails, socials and QR
  // codes, so it has to work for someone who has neither the app nor an
  // account. Keep the URL stable once it is in circulation.
  {
    path: "/get-the-app",
    Component: GetTheAppPage,
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
      { path: "mortar-info", Component: MortarInfoPage },
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
      { path: "payment/success", Component: PaymentSuccessPage },
      { path: "payment/cancel", Component: PaymentCancelPage },
      { path: "analytics", loader: () => redirect("/dashboard") },
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
          // Docs live on their own route rather than as a `panel/:tab` entry:
          // the content is static Markdown and does not belong in Admin.tsx.
          { path: "docs", Component: AdminDocs },
          { path: "docs/:categoryId/:slug", Component: AdminDocs },
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
