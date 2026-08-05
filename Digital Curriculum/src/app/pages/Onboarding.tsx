import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../components/auth/AuthProvider";
import { useScreenAnalytics } from "../analytics/useScreenAnalytics";
import { trackEvent } from "../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Step0TermsAndEmail, TERMS_VERSION } from "../components/onboarding/Step0TermsAndEmail";
import { Step1Identity } from "../components/onboarding/Step1Identity";
import { Step2Goals } from "../components/onboarding/Step2Goals";
import { Step3ConfidentSkills } from "../components/onboarding/Step3ConfidentSkills";
import { Step3DesiredSkills } from "../components/onboarding/Step3DesiredSkills";
import { Step3Industry } from "../components/onboarding/Step3Industry";
import { Step4WorkStructure } from "../components/onboarding/Step4WorkStructure";
import { Step5ProfileLinks } from "../components/onboarding/Step5ProfileLinks";
import type { OnboardingData, BusinessGoal, Industry } from "../lib/onboardingData";
import { Button } from "../components/ui/button";
import { SpaceBackdrop } from "../components/SpaceBackdrop";
import { Card } from "../components/ui/card";

export function OnboardingPage() {
  useScreenAnalytics("onboarding");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Step 0 = Terms & Email consent; steps 1-7 = profile steps; step 8 = completion
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [emailOptIn, setEmailOptIn] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (currentStep >= 1 && currentStep <= 7) {
      trackEvent(WEB_ANALYTICS_EVENTS.ONBOARDING_STEP_VIEWED, { step: currentStep });
    }
  }, [currentStep, loading]);

  useEffect(() => {
    if (currentStep === 8) {
      trackEvent(WEB_ANALYTICS_EVENTS.ONBOARDING_COMPLETION_VIEWED, {});
    }
  }, [currentStep]);

  // If user already accepted terms (resumed session), skip step 0
  useEffect(() => {
    if (!loading && currentStep === 0) {
      const alreadyAccepted = onboardingData.onboarding_status && onboardingData.onboarding_status !== "needs_profile";
      if (alreadyAccepted) setCurrentStep(1);
    }
  }, [loading, currentStep, onboardingData.onboarding_status]);

  // Load existing onboarding data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.uid) return;

      try {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setOnboardingData({
            first_name: data.first_name,
            last_name: data.last_name,
            city: data.city,
            state: data.state,
            cohort_id: data.cohort_id,
            not_in_cohort: data.not_in_cohort,
            business_goals: data.business_goals || [],
            confident_skills: data.confident_skills || [],
            desired_skills: data.desired_skills || [],
            industry: data.industry,
            work_structure: data.work_structure || {},
            profile_links: data.profile_links || {},
            onboarding_status: data.onboarding_status || "needs_profile",
          });

          // Determine which step to show based on what's completed.
          // Step 0 (terms) is always skipped on resume since user already agreed.
          if (!data.first_name || !data.last_name || !data.city || !data.state) {
            setCurrentStep(1);
          } else if (!data.business_goals || data.business_goals.length === 0) {
            setCurrentStep(2);
          } else if (!data.confident_skills || data.confident_skills.length < 3) {
            setCurrentStep(3);
          } else if (!data.desired_skills || data.desired_skills.length < 3) {
            setCurrentStep(4);
          } else if (!data.industry) {
            setCurrentStep(5);
          } else if (!data.work_structure) {
            setCurrentStep(6);
          } else {
            setCurrentStep(7); // Profile links
          }
          // Restore email opt-in preference if previously saved
          if (typeof data.email_opt_out_all === "boolean") {
            setEmailOptIn(!data.email_opt_out_all);
          }
        }
      } catch (error) {
        console.error("Error loading onboarding data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const saveData = async (partial = false) => {
    if (!user?.uid) {
      throw new Error("User not authenticated");
    }

    setSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const status = partial ? "partial" : "complete";

      // Prepare data for saving, ensuring all fields are properly formatted
      const dataToSave: any = {
        ...onboardingData,
        onboarding_status: status,
        updated_at: serverTimestamp(),
      };

      // On final completion, save email preferences based on user's opt-in choice.
      if (!partial) {
        dataToSave.email_opt_out_all = !emailOptIn;
        dataToSave.email_pref_course_nudges = emailOptIn;
        dataToSave.email_pref_graduation_updates = emailOptIn;
        dataToSave.email_pref_events = emailOptIn;
        dataToSave.email_pref_admin_messages = emailOptIn;
        dataToSave.terms_accepted = true;
        dataToSave.terms_version = TERMS_VERSION;
        dataToSave.terms_accepted_at = serverTimestamp();
      }

      // Remove undefined values to avoid Firestore issues
      Object.keys(dataToSave).forEach((key) => {
        if (dataToSave[key] === undefined) {
          delete dataToSave[key];
        }
      });

      await setDoc(userRef, dataToSave, { merge: true });

      if (partial) {
        trackEvent(WEB_ANALYTICS_EVENTS.ONBOARDING_PARTIAL_SAVE_SUCCEEDED, {});
      } else {
        trackEvent(WEB_ANALYTICS_EVENTS.ONBOARDING_FINAL_SAVE_SUCCEEDED, {});
      }

      if (!partial) {
        // Show completion screen first, then navigate after a delay
        setCurrentStep(8);
        setTimeout(() => {
          navigate("/mortar-info");
        }, 3000);
      }
    } catch (error: any) {
      console.error("Error saving onboarding data:", error);
      const errorMessage = error?.message || "Failed to save profile. Please try again.";
      alert(errorMessage);
      throw error; // Re-throw so handleNext can catch it
    } finally {
      setSaving(false);
    }
  };

  const handleTermsAccepted = (optIn: boolean) => {
    setEmailOptIn(optIn);
    setCurrentStep(1);
  };

  const handleStep1Update = (identityData: {
    first_name?: string;
    last_name?: string;
    city?: string;
    state?: string;
    cohort_id?: string;
    not_in_cohort?: boolean;
  }) => {
    setOnboardingData({ ...onboardingData, ...identityData });
  };

  const handleStep2Update = (goals: BusinessGoal[]) => {
    setOnboardingData({ ...onboardingData, business_goals: goals });
  };

  const handleStep3aUpdate = (skills: string[]) => {
    setOnboardingData({ ...onboardingData, confident_skills: skills });
  };

  const handleStep3bUpdate = (skills: string[]) => {
    setOnboardingData({ ...onboardingData, desired_skills: skills });
  };

  const handleStep3cUpdate = (industry: Industry) => {
    setOnboardingData({ ...onboardingData, industry });
  };

  const handleStep4Update = (workStructure: {
    flexibility?: number;
    weekly_hours?: number;
    ownership?: number;
  }) => {
    setOnboardingData({ ...onboardingData, work_structure: workStructure });
  };

  const handleStep5Update = (links: {
    linkedin?: string;
    portfolio?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  }) => {
    setOnboardingData({ ...onboardingData, profile_links: links });
  };

  const handleNext = async () => {
    // Save progress before moving to next step
    try {
      await saveData(true);
      setCurrentStep((prev) => prev + 1);
    } catch (error) {
      // Error is already handled in saveData
      console.error("Error in handleNext:", error);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleComplete = async () => {
    await saveData(false);
  };

  const handleSkip = () => {
    trackEvent(WEB_ANALYTICS_EVENTS.ONBOARDING_SKIP_CLICKED, {});
    // Save as partial and go to dashboard
    saveData(true);
  };

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-x-clip space-surface flex items-center justify-center">
        <SpaceBackdrop />
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Completion screen
  if (currentStep === 8) {
    return (
      <div className="relative min-h-screen overflow-x-clip space-surface flex items-center justify-center p-4">
        <SpaceBackdrop />
        <Card className="max-w-2xl w-full p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-accent-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="font-headline font-black uppercase tracking-tight text-3xl text-foreground mb-2">Profile Complete!</h1>
            <p className="text-muted-foreground mb-8">
              Your profile has been saved. You&apos;re all set to start your journey.
            </p>
          </div>
          <Button
            onClick={() => navigate("/mortar-info")}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Continue
          </Button>
        </Card>
      </div>
    );
  }

  // Step 0: Terms & Email consent — shown before the profile steps
  if (currentStep === 0) {
    return (
      <div className="relative min-h-screen overflow-x-clip space-surface">
        <SpaceBackdrop />
        <Step0TermsAndEmail onAccept={handleTermsAccepted} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-clip space-surface">
        <SpaceBackdrop />
      {/* Progress header — glass bar, headline title, segmented brick
          progress with a glowing current segment (industrial system) */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/brand/white-trowell.png"
                alt=""
                aria-hidden
                className="h-6 w-auto opacity-80 shrink-0"
              />
              <span className="font-headline font-black uppercase tracking-wider text-sm text-foreground truncate">
                Building your profile
              </span>
            </div>
            <Button
              onClick={handleSkip}
              variant="ghost"
              size="sm"
              className="rounded-none border-b-2 border-verse bg-transparent font-headline font-bold uppercase tracking-widest text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 shrink-0"
            >
              Skip for now
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-1 gap-1.5">
              {Array.from({ length: 7 }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 transition-all duration-300 ${
                    i < currentStep ? "bg-verse" : "bg-white/10"
                  } ${i === currentStep - 1 ? "glow-brick" : ""}`}
                />
              ))}
            </div>
            <span className="font-technical text-[11px] font-bold uppercase tracking-[0.2em] text-verse shrink-0">
              Step {String(currentStep).padStart(2, "0")} / 07
            </span>
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="py-8">
        {currentStep === 1 && (
          <Step1Identity
            identityData={{
              first_name: onboardingData.first_name,
              last_name: onboardingData.last_name,
              city: onboardingData.city,
              state: onboardingData.state,
              cohort_id: onboardingData.cohort_id,
              not_in_cohort: onboardingData.not_in_cohort,
            }}
            onUpdate={handleStep1Update}
            onNext={handleNext}
          />
        )}

        {currentStep === 2 && (
          <Step2Goals
            selectedGoals={onboardingData.business_goals || []}
            onUpdate={handleStep2Update}
            onNext={handleNext}
          />
        )}

        {currentStep === 3 && (
          <Step3ConfidentSkills
            selectedSkills={onboardingData.confident_skills || []}
            onUpdate={handleStep3aUpdate}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 4 && (
          <Step3DesiredSkills
            selectedSkills={onboardingData.desired_skills || []}
            onUpdate={handleStep3bUpdate}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 5 && (
          <Step3Industry
            selectedIndustry={onboardingData.industry}
            onUpdate={handleStep3cUpdate}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 6 && (
          <Step4WorkStructure
            workStructure={onboardingData.work_structure || {}}
            onUpdate={handleStep4Update}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 7 && (
          <Step5ProfileLinks
            profileLinks={onboardingData.profile_links || {}}
            onUpdate={handleStep5Update}
            onNext={handleComplete}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}
