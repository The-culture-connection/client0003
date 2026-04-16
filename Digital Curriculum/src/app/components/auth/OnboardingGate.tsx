import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "./AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { trackEvent } from "../../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (loading || !user?.uid) {
        setChecking(false);
        return;
      }

      // Don't redirect if already on onboarding page
      if (location.pathname === "/onboarding") {
        setChecking(false);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          // User document doesn't exist, redirect to onboarding
          trackEvent(WEB_ANALYTICS_EVENTS.ONBOARDING_GATE_REDIRECT_INCOMPLETE_PROFILE, {
            reason: "missing_user_doc",
            from_path: location.pathname,
          });
          navigate("/onboarding", { replace: true });
          setChecking(false);
          return;
        }

        const userData = userDoc.data();
        const status = userData?.onboarding_status || "needs_profile";

        // If status is "complete", allow access (trust the status)
        if (status === "complete") {
          setChecking(false);
          return;
        }

        // If status is "partial", also allow access (user can complete later)
        if (status === "partial") {
          setChecking(false);
          return;
        }

        // If status is not complete, check if required fields are missing
        const hasIdentity = !!(
          userData?.first_name &&
          userData?.last_name &&
          userData?.city &&
          userData?.state &&
          (userData?.cohort_id || userData?.not_in_cohort === true)
        );
        const hasBusinessGoals = userData?.business_goals && userData.business_goals.length > 0;
        const hasConfidentSkills = userData?.confident_skills && userData.confident_skills.length >= 3;
        const hasDesiredSkills = userData?.desired_skills && userData.desired_skills.length >= 3;
        const hasIndustry = !!userData?.industry;

        // If ALL required fields are present, treat as complete (even if status isn't set)
        if (hasIdentity && hasBusinessGoals && hasConfidentSkills && hasDesiredSkills && hasIndustry) {
          // User has all required fields, allow access
          setChecking(false);
          return;
        }

        // If required fields are missing, redirect to onboarding (unless already there)
        if (location.pathname !== "/onboarding") {
          trackEvent(WEB_ANALYTICS_EVENTS.ONBOARDING_GATE_REDIRECT_INCOMPLETE_PROFILE, {
            reason: "incomplete_profile",
            from_path: location.pathname,
          });
          navigate("/onboarding", { replace: true });
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        // On error, allow access (don't block user)
      } finally {
        setChecking(false);
      }
    };

    checkOnboardingStatus();
  }, [user, loading, navigate, location.pathname]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
