import { useEffect, useRef } from "react";
import { useAuth } from "./AuthProvider";
import { BrandedLoading } from "../BrandedLoading";
import { Navigate, useLocation } from "react-router";
import { trackEvent } from "../../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const loggedRedirect = useRef(false);

  useEffect(() => {
    if (loading || user) {
      loggedRedirect.current = false;
      return;
    }
    if (loggedRedirect.current) return;
    loggedRedirect.current = true;
    trackEvent(WEB_ANALYTICS_EVENTS.AUTH_GUARD_REDIRECT_UNAUTHENTICATED, {
      attempted_path: location.pathname,
    });
  }, [loading, user, location.pathname]);

  if (loading) {
    return (
      <BrandedLoading />
    );
  }

  if (!user) {
    // Remember where they were headed so login/sign-up can bring them back.
    const target = `${location.pathname}${location.search}`;
    const to = target && target !== "/" ? `/login?redirect=${encodeURIComponent(target)}` : "/login";
    return <Navigate to={to} replace />;
  }

  return <>{children}</>;
}
