import { Outlet, useLocation } from "react-router";
import { WebNavigation } from "../components/web/WebNavigation";
import { verseThemeStyle } from "../lib/verseTheme";
import { MobileNavigation } from "../components/mobile/MobileNavigation";
import { ImplicitFeedbackWidget } from "../components/feedback/ImplicitFeedbackWidget";

export function Root() {
  const location = useLocation();
  const isMobile = location.pathname.startsWith("/mobile");

  return (
    // Site-wide "Mortarverse" shell: black space surface, starfield,
    // blueprint grid, brick auras, grunge wash. Pages render transparent
    // containers on top (see UI overhaul design system).
    <div className="relative min-h-screen overflow-x-clip space-surface">
      <div aria-hidden className="starfield absolute inset-0 pointer-events-none" />
      <div aria-hidden className="blueprint-grid absolute inset-0 pointer-events-none" />
      <div aria-hidden className="aura-glow w-[420px] h-[420px] -top-28 -right-24 opacity-40" />
      <div aria-hidden className="aura-glow w-[360px] h-[360px] top-[60%] -left-32 opacity-25" />
      <div aria-hidden className="verse-texture-bottom opacity-25" style={verseThemeStyle("#a01f10")} />
      <div className="relative z-10">
        {isMobile ? <MobileNavigation /> : <WebNavigation />}
        <main className={isMobile ? "pb-20" : ""}>
          <Outlet />
        </main>
        <ImplicitFeedbackWidget />
      </div>
    </div>
  );
}
