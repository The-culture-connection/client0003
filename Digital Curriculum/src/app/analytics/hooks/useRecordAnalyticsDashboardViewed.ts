import { useEffect } from "react";
import { mortarWebAnalytics } from "../intents";

/** Fires once when the learner analytics dashboard screen mounts. */
export function useRecordAnalyticsDashboardViewed(): void {
  useEffect(() => {
    void mortarWebAnalytics.analyticsDashboardViewed();
  }, []);
}
