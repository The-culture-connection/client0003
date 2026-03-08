import { Outlet, useLocation } from "react-router";
import { WebNavigation } from "../components/web/WebNavigation";
import { MobileNavigation } from "../components/mobile/MobileNavigation";
import { MortarDMWidget } from "../components/dm/MortarDMWidget";

export function Root() {
  const location = useLocation();
  const isMobile = location.pathname.startsWith("/mobile");

  return (
    <div className="min-h-screen bg-background">
      {isMobile ? <MobileNavigation /> : <WebNavigation />}
      <main className={isMobile ? "pb-20" : ""}>
        <Outlet />
      </main>
      <MortarDMWidget />
    </div>
  );
}
