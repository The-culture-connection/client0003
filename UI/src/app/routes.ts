import { createBrowserRouter } from "react-router";
import { Root } from "./pages/Root";
import { WebDashboard } from "./pages/web/Dashboard";
import { WebCurriculum } from "./pages/web/Curriculum";
import { WebQuizzes } from "./pages/web/Quizzes";
import { WebDataRoom } from "./pages/web/DataRoom";
import { WebCertificates } from "./pages/web/Certificates";
import { WebEvents } from "./pages/web/Events";
import { WebAnalytics } from "./pages/web/Analytics";
import { MobileFeed } from "./pages/mobile/Feed";
import { MobileGroups } from "./pages/mobile/Groups";
import { MobileEvents } from "./pages/mobile/Events";
import { MobileExplore } from "./pages/mobile/Explore";
import { MobileProfile } from "./pages/mobile/Profile";
import { MobileOnboarding } from "./pages/mobile/Onboarding";
import { MobileMatching } from "./pages/mobile/Matching";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: WebDashboard },
      { path: "curriculum", Component: WebCurriculum },
      { path: "quizzes", Component: WebQuizzes },
      { path: "data-room", Component: WebDataRoom },
      { path: "certificates", Component: WebCertificates },
      { path: "events", Component: WebEvents },
      { path: "analytics", Component: WebAnalytics },
      { path: "mobile", Component: MobileFeed },
      { path: "mobile/groups", Component: MobileGroups },
      { path: "mobile/events", Component: MobileEvents },
      { path: "mobile/explore", Component: MobileExplore },
      { path: "mobile/profile", Component: MobileProfile },
      { path: "mobile/onboarding", Component: MobileOnboarding },
      { path: "mobile/matching", Component: MobileMatching },
    ],
  },
]);
