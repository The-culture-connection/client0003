import { Outlet, useLocation } from "react-router";
import { WebNavigation } from "../components/web/WebNavigation";
import { MobileNavigation } from "../components/mobile/MobileNavigation";

export function Root() {
  const location = useLocation();
  const isMobile = location.pathname.startsWith("/mobile");

  return (
    <div className="min-h-screen bg-background">
      {isMobile ? (
        <div className="max-w-md mx-auto min-h-screen flex flex-col bg-background">
          <main className="flex-1 pb-16">
            <Outlet />
          </main>
          <MobileNavigation />
        </div>
      ) : (
        <div className="flex min-h-screen">
          <WebNavigation />
          <main className="flex-1 ml-64">
            <Outlet />
          </main>
        </div>
      )}
    </div>
  );
}
