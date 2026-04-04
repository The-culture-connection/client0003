import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../components/auth/AuthProvider";
import { arrayUnion, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Step1Identity } from "../components/onboarding/Step1Identity";
import { Step2Goals } from "../components/onboarding/Step2Goals";
import { Step3ConfidentSkills } from "../components/onboarding/Step3ConfidentSkills";
import { Step3DesiredSkills } from "../components/onboarding/Step3DesiredSkills";
import { Step3Industry } from "../components/onboarding/Step3Industry";
import { Step4WorkStructure } from "../components/onboarding/Step4WorkStructure";
import { Step5ProfileLinks } from "../components/onboarding/Step5ProfileLinks";
import type { OnboardingData, BusinessGoal, Industry } from "../lib/onboardingData";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

export function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});

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

          // Determine which step to show based on what's completed
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
      const dataToSave: Record<string, unknown> = {
        ...onboardingData,
        onboarding_status: status,
        updated_at: serverTimestamp(),
      };

      // Canonical curriculum learner role (matches `functions` CANONICAL_ROLES / Firestore `users.roles` array)
      if (!partial) {
        dataToSave.roles = arrayUnion("Digital Curriculum Students");
      }

      // Remove undefined values to avoid Firestore issues
      Object.keys(dataToSave).forEach((key) => {
        if (dataToSave[key] === undefined) {
          delete dataToSave[key];
        }
      });

      await setDoc(userRef, dataToSave, { merge: true });

      if (!partial) {
        // Show completion screen first, then navigate after a delay
        setCurrentStep(8);
        setTimeout(() => {
          navigate("/dashboard");
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
    // Save as partial and go to dashboard
    saveData(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Profile Complete!</h1>
            <p className="text-muted-foreground mb-8">
              Your profile has been saved. You&apos;re all set to start your journey.
            </p>
          </div>
          <Button
            onClick={() => navigate("/dashboard")}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Progress indicator */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of 7
            </span>
            <Button
              onClick={handleSkip}
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
            >
              Skip for now
            </Button>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 7) * 100}%` }}
            />
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
