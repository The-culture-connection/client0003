import { createBrowserRouter, redirect } from "react-router";
import { Root } from "./pages/Root";
import { WebDashboard } from "./pages/web/Dashboard";
import { WebCurriculum } from "./pages/web/Curriculum";
import { WebQuizzes } from "./pages/web/Quizzes";
import { WebDataRoom } from "./pages/web/DataRoom";
import { WebEvents } from "./pages/web/Events";
import { WebAnalytics } from "./pages/web/Analytics";
import { WebCommunityHub } from "./pages/web/CommunityHub";
import { MobileFeed } from "./pages/mobile/Feed";
import { MobileGroups } from "./pages/mobile/Groups";
import { MobileEvents } from "./pages/mobile/Events";
import { MobileExplore } from "./pages/mobile/Explore";
import { MobileMatching } from "./pages/mobile/Matching";
import { MobileProfile } from "./pages/mobile/Profile";
import { MobileOnboarding } from "./pages/mobile/Onboarding";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      // Web routes
      { index: true, Component: WebDashboard },
      { path: "dashboard", Component: WebDashboard },
      { path: "curriculum", Component: WebCurriculum },
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
    ],
  },
]);
