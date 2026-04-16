import { useEffect } from "react";
import { beginScreenSessionForAnalytics, endScreenSessionForAnalytics } from "./screenSession";

/**
 * Start a screen analytics session on mount and end it on unmount.
 * Child events sent via {@link trackEvent} attach `screen_session_id` while active.
 */
export function useScreenAnalytics(screenName: string): void {
  useEffect(() => {
    beginScreenSessionForAnalytics(screenName);
    return () => {
      endScreenSessionForAnalytics();
    };
  }, [screenName]);
}
