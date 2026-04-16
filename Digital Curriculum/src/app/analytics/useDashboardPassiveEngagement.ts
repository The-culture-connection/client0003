import { useEffect, useRef } from "react";
import { trackEvent } from "./trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";

/** Emit at most one event per this many seconds of tab-visible time on the dashboard (visibility-gated). */
const WINDOW_SECONDS = 30;

/**
 * Passive engaged time on dashboard: Visibility API + interval (no spam).
 * Fires `dashboard_passive_time_on_screen` with `engaged_window_seconds` while the tab is visible.
 */
export function useDashboardPassiveEngagement(): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const clear = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const startTicking = () => {
      clear();
      if (typeof document === "undefined" || document.hidden) return;
      intervalRef.current = setInterval(() => {
        if (document.hidden) return;
        trackEvent(WEB_ANALYTICS_EVENTS.DASHBOARD_PASSIVE_TIME_ON_SCREEN, {
          engaged_window_seconds: WINDOW_SECONDS,
        });
      }, WINDOW_SECONDS * 1000);
    };

    const onVisibility = () => {
      if (document.hidden) {
        clear();
      } else {
        startTicking();
      }
    };

    startTicking();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clear();
    };
  }, []);
}
