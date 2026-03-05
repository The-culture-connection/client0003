"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowLeft, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { type MatchProfile, type MatchingGoal } from "@/lib/matchProfile";
import { getSkills, getIndustries, getRoles, groupSkillsByCategory, type SkillCategory } from "@/lib/taxonomies";
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { debounce } from "@/lib/utils";

// Analytics removed - not using callable functions
const logAnalyticsEvent = (_eventType: string, _metadata?: Record<string, any>) => {
  // No-op - analytics disabled
};

// Calculate total steps: 5 base steps, but step 4 (Job Preferences) is conditional
// So we'll dynamically calculate based on whether job prefs are shown
const BASE_STEPS = 5;

const GOALS: { value: MatchingGoal; label: string }[] = [
  { value: "buy_skills", label: "Find experts to help build my business" },
  { value: "mentor", label: "Connect with experienced mentors" },
  { value: "peer", label: "Network with fellow entrepreneurs" },
  { value: "sell_skills", label: "Offer my services to other entrepreneurs" },
  { value: "partner", label: "Find business partners and collaborators" },
  { value: "develop_skills", label: "Develop professional skills and strategic competencies" },
  { value: "enhance_capabilities", label: "Enhance my business capabilities and expertise" },
  { value: "find_job", label: "Find opportunities to grow my career" },
  { value: "hire", label: "Hire talent for my business" },
];

export function MatchingOnboardingPage() {
  console.log("🚀 [COMPONENT] MatchingOnboardingPage component rendered");
  
  const [step, setStep] = useState(1);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  
  console.log("🚀 [COMPONENT] MatchingOnboardingPage RENDERED");
  console.log("🚀 [COMPONENT] State:", { step, hasUser: !!user, userUid: user?.uid, authLoading, saving });
  
  // Test alert on component mount
  useEffect(() => {
    console.log("🚀 [COMPONENT] Component mounted/updated");
    if (typeof window !== "undefined") {
      console.log("🚀 [COMPONENT] Window is available, console should work");
    }
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Scroll to top when step changes (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  // Step 1: Identity + Location
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [cohort, setCohort] = useState("");

  // Step 2: Goals
  const [selectedGoals, setSelectedGoals] = useState<MatchingGoal[]>([]);

  // Step 3: Skills I'm Looking to Gain
  const [skillsWant, setSkillsWant] = useState<string[]>([]);
  const [skillSearchWant, setSkillSearchWant] = useState("");
  
  // Step 4: Skills I Can Offer
  const [skillsOffer, setSkillsOffer] = useState<string[]>([]);
  const [skillSearchOffer, setSkillSearchOffer] = useState("");
  
  // Step 5: Industries (multi-select, up to 3) and Role Titles (text field)
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [roleTitlesText, setRoleTitlesText] = useState<string>("");
  
  const [availableSkills, setAvailableSkills] = useState<any[]>([]);
  const [skillCategories, setSkillCategories] = useState<SkillCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Hardcoded industries list
  const INDUSTRIES = [
    "Food & Beverage",
    "Retail",
    "Health, Wellness & Personal Care",
    "Professional Services",
    "Creative & Media Services",
    "Education & Training",
    "Childcare & Family Services",
    "Home & Property Services",
    "Construction & Skilled Trades",
    "Automotive Services",
    "Hospitality & Lodging",
    "Entertainment & Recreation",
    "Event & Wedding Services",
    "Logistics & Transportation",
    "Manufacturing & Production",
    "Agriculture & Food Production",
    "Community & Cultural Organizations",
  ];

  // Step 6: Job Preferences
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [workMode, setWorkMode] = useState<"remote" | "hybrid" | "on_site" | "">("");
  const [compMin, setCompMin] = useState("");
  const [compMax, setCompMax] = useState("");

  // Step 7: Links + Visibility (if needed, but we'll keep it as step 6)
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [visibility, setVisibility] = useState({
    discovery: true,
    jobs: true,
    marketplace: true,
  });
  const [consent, setConsent] = useState({
    matching: false,
    marketing: false,
  });

  // Calculate if job preferences step should be shown
  const showJobPrefs = selectedGoals.includes("find_job") || selectedGoals.includes("hire");
  
  // Total steps: 1=Identity, 2=Goals, 3=Skills Offer, 4=Skills Want, 5=Industries+Roles, 6=Job Prefs (conditional), 7=Links+Visibility
  const TOTAL_STEPS = showJobPrefs ? 7 : 6;

  // Load taxonomies
  useEffect(() => {
    loadTaxonomies();
  }, []);

  const loadTaxonomies = async () => {
    setLoading(true);
    try {
      const skills = await getSkills();
      setAvailableSkills(skills);
      // Categories are now generated on-demand with groupSkillsByCategory
      console.log("Loaded taxonomies:", { skills: skills.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      // Log to browser console
      console.error("Error loading taxonomies:", error);
      
      // In development, log to terminal via console.error (Next.js will show this)
      if (process.env.NODE_ENV === "development") {
        console.error("[DEV] Taxonomy loading error:", {
          message: errorMessage,
          stack: errorStack,
          error,
        });
      }
      
      // Set empty arrays on error to prevent undefined issues
      setAvailableSkills([]);
      setSkillCategories([]);
    } finally {
      setLoading(false);
    }
  };

  // Autosave removed - saving directly to Firestore on completion only

  // Validate step before proceeding (5-step structure)
  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        // Identity + Location (required)
        return !!(firstName && lastName && city && state);
      case 2:
        // Goals (required)
        return selectedGoals.length > 0;
      case 3:
        // Skills I Can Offer (required minimum: 5)
        return skillsOffer.length >= 5;
      case 4:
        // Skills I Want (required minimum: 5)
        return skillsWant.length >= 5;
      case 5:
        // Industries + Role Titles (required: at least one industry)
        return selectedIndustries.length > 0;
      case 6:
        // Job Preferences (conditional, only if find_job or hire selected)
        if (showJobPrefs) {
          return jobTypes.length > 0 && !!workMode;
        }
        // If job prefs not shown, this step is skipped
        return true;
      case 7:
        // Profile Links + Visibility (optional, but consent.matching is required)
        return consent.matching; // Required consent
      default:
        return true;
    }
  };

  const handleContinue = async () => {
    if (!canProceed()) {
      setError("Please fill in all required fields");
      return;
    }

    setError(null);

    // Log step completion
        logAnalyticsEvent("onboarding_step_completed", {
      step_number: step,
      step_name: step === 1 ? "identity_location" :
                 step === 2 ? "goals" :
                 step === 3 ? "skills_offer" :
                 step === 4 ? "skills_want" :
                 step === 5 ? "industries_roles" :
                 step === 6 ? "job_preferences" :
                 "profile_links_visibility",
    });

    // Skip step 6 (Job Preferences) if not needed
    if (step === 5 && !showJobPrefs) {
      // Skip to step 7 (final step)
      await saveStepData();
      setStep(7);
    } else if (step === TOTAL_STEPS) {
      // Final step - move to completion screen first, then save
      console.log("🔄 [FLOW] Final step reached! Moving to completion screen. Step:", step, "TOTAL_STEPS:", TOTAL_STEPS);
      setStep(8); // Move to completion screen
      // Then handle completion in the background
      handleComplete();
    } else {
      // Save current step data
      await saveStepData();
      setStep(step + 1);
    }
  };

  const saveStepData = async () => {
    if (!user?.uid) return;

    const profileData: Partial<MatchProfile> = {};

    if (step >= 1) {
      profileData.location = { city, state };
    }

    if (step >= 2) {
      profileData.goals = selectedGoals;
    }

    if (step >= 3) {
      profileData.skills_offer = skillsOffer;
    }

    if (step >= 4) {
      profileData.skills_want = skillsWant;
    }

    if (step >= 5) {
      profileData.industries = selectedIndustries;
      // Parse role titles text into array (split by comma)
      profileData.role_titles = roleTitlesText
        .split(",")
        .map((r) => r.trim())
        .filter((r) => r.length > 0);
    }

    if (step >= 6 && showJobPrefs) {
      // Step 4: Job Preferences (conditional)
      profileData.work_mode = workMode as any;
      if (compMin || compMax) {
        profileData.compensation = {
          min: compMin ? parseInt(compMin) : undefined,
          max: compMax ? parseInt(compMax) : undefined,
          currency: "USD",
        };
      }
    }

    if (step >= 7) {
      // Step 7: Profile Links + Visibility
      profileData.links = {
        linkedin_url: linkedinUrl,
        portfolio_url: portfolioUrl,
      };
      profileData.visibility = visibility;
      profileData.consent = consent;
    }

    // Data will be saved on completion
  };

  const handleComplete = async () => {
    console.log("🖱️ [CLICK] Complete Profile button clicked!");
    console.log("=== ONBOARDING COMPLETION STARTED ===");
    
    // Debug: Check authentication
    console.log("🔐 [AUTH CHECK] User object:", user);
    console.log("🔐 [AUTH CHECK] User UID:", user?.uid);
    console.log("🔐 [AUTH CHECK] User email:", user?.email);
    console.log("🔐 [AUTH CHECK] Auth current user:", auth.currentUser?.uid);
    
    if (!user?.uid) {
      console.error("❌ [AUTH ERROR] User not authenticated. User object:", user);
      setError("User not authenticated. Please sign in again.");
      return;
    }

    console.log("✅ [AUTH SUCCESS] User is authenticated:", user.uid);

    setSaving(true);
    setError(null);

    try {
      const uid = user.uid;
      console.log("📝 [ONBOARDING] Starting completion for user:", uid);

      // Debug: Log all form data
      console.log("📋 [FORM DATA] First Name:", firstName);
      console.log("📋 [FORM DATA] Last Name:", lastName);
      console.log("📋 [FORM DATA] Company:", company);
      console.log("📋 [FORM DATA] City:", city);
      console.log("📋 [FORM DATA] State:", state);
      console.log("📋 [FORM DATA] Cohort:", cohort);
      console.log("📋 [FORM DATA] Goals:", selectedGoals);
      console.log("📋 [FORM DATA] Skills Offer:", skillsOffer);
      console.log("📋 [FORM DATA] Skills Want:", skillsWant);
      console.log("📋 [FORM DATA] Industries:", selectedIndustries);
      console.log("📋 [FORM DATA] Role Titles:", roleTitlesText);
      console.log("📋 [FORM DATA] Work Mode:", workMode);
      console.log("📋 [FORM DATA] LinkedIn URL:", linkedinUrl);
      console.log("📋 [FORM DATA] Portfolio URL:", portfolioUrl);

      // 1. Update user document with basic info
      console.log("💾 [FIRESTORE] Step 1: Updating user document...");
      const userRef = doc(db, "users", uid);
      const userUpdateData = {
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`,
        company: company || null,
        business_profile: {
          cohort_id: cohort || null,
          cohort_name: cohort || "Not in cohort",
          city,
          state,
          connection_intents: selectedGoals,
        },
        onboarding_status: "complete",
        profile_completed: true,
        updated_at: serverTimestamp(),
      };
      
      console.log("💾 [FIRESTORE] User update data:", JSON.stringify(userUpdateData, null, 2));
      console.log("💾 [FIRESTORE] User document path: users/", uid);
      
      await updateDoc(userRef, userUpdateData);
      console.log("✅ [FIRESTORE] User document updated successfully");
      
      // Set the flag IMMEDIATELY after update (before verification) so OnboardingGate knows to allow access
      if (typeof window !== "undefined") {
        sessionStorage.setItem("onboarding_just_completed", "true");
        console.log("🏁 [FLAG] Set onboarding_just_completed flag in sessionStorage");
      }
      
      // Also call the updateOnboardingStatus callable function to ensure it's properly set
      try {
        const { updateOnboardingStatus } = await import("@/lib/onboarding");
        await updateOnboardingStatus("complete");
        console.log("✅ [CALLABLE] updateOnboardingStatus callable executed");
      } catch (callableError) {
        console.warn("⚠️ [CALLABLE] updateOnboardingStatus callable failed (non-critical):", callableError);
        // Non-critical, the updateDoc above should be sufficient
      }

      // Verify the update
      const { getDoc } = await import("firebase/firestore");
      const updatedUserDoc = await getDoc(userRef);
      if (updatedUserDoc.exists()) {
        const updatedData = updatedUserDoc.data();
        console.log("✅ [VERIFY] User document after update:", {
          onboarding_status: updatedData.onboarding_status,
          profile_completed: updatedData.profile_completed,
          first_name: updatedData.first_name,
          last_name: updatedData.last_name,
        });
      } else {
        console.error("❌ [VERIFY] User document does not exist after update!");
      }

      // 2. Create/update match profile
      console.log("💾 [FIRESTORE] Step 2: Saving match profile...");
      const matchProfileRef = doc(db, "match_profiles", uid);
      
      // Calculate completeness score
      let completenessScore = 0;
      if (firstName && lastName && city && state) completenessScore += 20;
      if (selectedGoals.length > 0) completenessScore += 15;
      if (skillsOffer.length > 0) completenessScore += 15;
      if (skillsWant.length > 0) completenessScore += 15;
      if (selectedIndustries.length > 0) completenessScore += 15;
      if (workMode) completenessScore += 10;
      if (linkedinUrl || portfolioUrl) completenessScore += 10;
      completenessScore = Math.min(completenessScore, 100);
      
      console.log("📊 [SCORE] Calculated completeness score:", completenessScore);
      
      const matchProfileData: Record<string, any> = {
        uid,
        location: { city, state },
        goals: selectedGoals,
        skills_offer: skillsOffer,
        skills_want: skillsWant,
        industries: selectedIndustries,
        role_titles: roleTitlesText
          .split(",")
          .map((r) => r.trim())
          .filter((r) => r.length > 0),
        work_mode: workMode || null,
        links: {
          linkedin_url: linkedinUrl || null,
          portfolio_url: portfolioUrl || null,
        },
        visibility: visibility || {
          discovery: true,
          jobs: true,
          marketplace: true,
        },
        consent: consent || {
          matching: true,
          marketing: false,
        },
        completeness_score: completenessScore,
        updated_at: serverTimestamp(),
      };

      if (compMin || compMax) {
        matchProfileData.compensation = {
          min: compMin ? parseInt(compMin) : undefined,
          max: compMax ? parseInt(compMax) : undefined,
          currency: "USD",
        };
        console.log("💰 [FORM DATA] Compensation:", matchProfileData.compensation);
      }

      console.log("💾 [FIRESTORE] Match profile data:", JSON.stringify(matchProfileData, null, 2));
      console.log("💾 [FIRESTORE] Match profile document path: match_profiles/", uid);

      await setDoc(matchProfileRef, matchProfileData, { merge: true });
      console.log("✅ [FIRESTORE] Match profile saved successfully");

      // Verify the match profile
      const updatedMatchDoc = await getDoc(matchProfileRef);
      if (updatedMatchDoc.exists()) {
        const matchData = updatedMatchDoc.data();
        console.log("✅ [VERIFY] Match profile after save:", {
          uid: matchData.uid,
          completeness_score: matchData.completeness_score,
          goals_count: matchData.goals?.length || 0,
          skills_offer_count: matchData.skills_offer?.length || 0,
          skills_want_count: matchData.skills_want?.length || 0,
        });
      } else {
        console.error("❌ [VERIFY] Match profile document does not exist after save!");
      }

      console.log("✅ [ONBOARDING] All data saved successfully!");
      
      // Verify the update was successful by reading the document back
      console.log("🔍 [VERIFY] Verifying onboarding status update...");
      const verifyUserDoc = await getDoc(userRef);
      if (verifyUserDoc.exists()) {
        const verifiedData = verifyUserDoc.data();
        console.log("✅ [VERIFY] Verified onboarding_status:", verifiedData.onboarding_status);
        
        if (verifiedData.onboarding_status === "complete") {
          console.log("🔄 [REDIRECT] Status verified as complete. Redirecting to dashboard...");
          // Flag already set above, just redirect
          // Use window.location for a hard redirect to bypass any caching
          window.location.href = "/dashboard";
        } else {
          console.warn("⚠️ [VERIFY] Status not complete yet, but flag is set. Redirecting anyway...");
          // Flag already set above, redirect anyway (OnboardingGate will allow access)
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1000);
        }
      } else {
        console.error("❌ [VERIFY] User document not found after update!");
        // Flag already set above, redirect anyway
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
      }
      
      console.log("=== ONBOARDING COMPLETION FINISHED ===");
    } catch (err: any) {
      console.error("=== ONBOARDING COMPLETION ERROR ===");
      console.error("❌ [ERROR] Error type:", err?.constructor?.name);
      console.error("❌ [ERROR] Error code:", err?.code);
      console.error("❌ [ERROR] Error message:", err?.message);
      console.error("❌ [ERROR] Error details:", err?.details);
      console.error("❌ [ERROR] Full error object:", err);
      console.error("❌ [ERROR] Stack trace:", err?.stack);
      
      // Check if it's a Firestore permission error
      if (err?.code === "permission-denied") {
        console.error("🔒 [PERMISSION] Firestore permission denied!");
        console.error("🔒 [PERMISSION] User UID:", user?.uid);
        console.error("🔒 [PERMISSION] Auth current user:", auth.currentUser?.uid);
        console.error("🔒 [PERMISSION] Check Firestore rules for:");
        console.error("   - users/", user?.uid);
        console.error("   - match_profiles/", user?.uid);
      }
      
      // Check if it's an authentication error
      if (err?.code === "unauthenticated" || err?.code?.includes("auth")) {
        console.error("🔐 [AUTH ERROR] Authentication issue!");
        console.error("🔐 [AUTH ERROR] User object:", user);
        console.error("🔐 [AUTH ERROR] Auth current user:", auth.currentUser);
        console.error("🔐 [AUTH ERROR] Auth current user UID:", auth.currentUser?.uid);
      }
      
      const errorMessage = err?.message || err?.code || "Unknown error";
      const errorDetails = err?.details || "";
      
      // Show user-friendly error message
      let userMessage = "Failed to complete onboarding. ";
      
      // Still redirect to dashboard even on error (as requested)
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 3000);
      if (err?.code === "permission-denied") {
        userMessage += "You don't have permission to perform this action. Check console for details.";
      } else if (err?.code === "unauthenticated" || err?.code === "auth/argument-error") {
        userMessage += "Authentication error. Please sign out and sign in again.";
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch") || errorMessage.includes("CORS")) {
        userMessage += "Network error. Check console for details.";
      } else if (err?.code === "internal") {
        userMessage += `Server error. Check console for details.`;
      } else {
        userMessage += `${errorMessage} (Code: ${err?.code || "unknown"})`;
      }
      
      console.error("❌ [ERROR] User-facing message:", userMessage);
      setError(userMessage);
      setSaving(false);
    }
  };

  const toggleGoal = (goal: MatchingGoal) => {
    const isAdding = !selectedGoals.includes(goal);
    setSelectedGoals((prev) => {
      const newGoals = prev.includes(goal)
        ? prev.filter((g) => g !== goal)
        : [...prev, goal];
      
      // Log goal selection
      if (isAdding) {
        logAnalyticsEvent("onboarding_goal_selected", {
          goal_value: goal,
        });
      }
      
      return newGoals;
    });
  };

  const toggleSkill = (skillId: string, type: "offer" | "want") => {
    const isAdding = type === "offer" 
      ? !skillsOffer.includes(skillId)
      : !skillsWant.includes(skillId);
    
    if (type === "offer") {
      setSkillsOffer((prev) => {
        const newSkills = prev.includes(skillId)
          ? prev.filter((id) => id !== skillId)
          : prev.length < 10
            ? [...prev, skillId]
            : prev;
        
        // Log skill selection
        if (isAdding && newSkills.includes(skillId)) {
          logAnalyticsEvent("onboarding_skill_selected", {
            skill_id: skillId,
            type: "offer",
          });
        }
        
        return newSkills;
      });
    } else {
      setSkillsWant((prev) => {
        const newSkills = prev.includes(skillId)
          ? prev.filter((id) => id !== skillId)
          : prev.length < 10
            ? [...prev, skillId]
            : prev;
        
        // Log skill selection
        if (isAdding && newSkills.includes(skillId)) {
          logAnalyticsEvent("onboarding_skill_selected", {
            skill_id: skillId,
            type: "want",
          });
        }
        
        return newSkills;
      });
    }
  };

  // Filter skills by search term
  const getFilteredSkills = (searchTerm: string, skills: any[]) => {
    if (!searchTerm) return skills;
    const term = searchTerm.toLowerCase();
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.synonyms?.some((syn: string) =>
          syn.toLowerCase().includes(term)
        )
    );
  };

  // Toggle category expansion (accordion behavior - only one open at a time)
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev: Set<string>) => {
      const newSet = new Set<string>();
      // If clicking the same category, close it; otherwise open the new one
      if (prev.has(categoryId)) {
        return newSet; // Close all
      }
      newSet.add(categoryId); // Open only this one
      return newSet;
    });
  };

  // Get filtered skill categories (no search filtering)
  const getFilteredSkillCategories = (): SkillCategory[] => {
    // Use groupSkillsByCategory which handles both Firestore skills and predefined categories
    return groupSkillsByCategory(availableSkills);
  };


  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Render steps
  if (step === 1) {
    return (
      <div className="p-8 max-w-2xl mx-auto min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl text-foreground mb-2">Welcome to MORTAR!</h1>
          <p className="text-muted-foreground">
            Let's build your entrepreneur profile so we can connect you with the right business opportunities, mentors, and partners
          </p>
        </div>

        <div className="flex gap-1 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i + 1 <= step ? "bg-accent" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <Card className="p-8 bg-card border-border">
          <h2 className="text-xl text-foreground mb-6">Tell Us About Yourself</h2>
          <p className="text-sm text-muted-foreground mb-6">
            This helps us connect you with other entrepreneurs in your area and from your cohort
          </p>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-2"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="company">Company (optional)</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="mt-2"
                placeholder="Your company name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-2"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cohort">Cohort</Label>
              <select
                id="cohort"
                value={cohort}
                onChange={(e) => setCohort(e.target.value)}
                className="mt-2 flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-base text-gray-900"
              >
                <option value="">Not in a cohort</option>
                <option value="Class of 2024">Class of 2024</option>
                <option value="Class of 2025">Class of 2025</option>
                <option value="Class of 2026">Class of 2026</option>
                <option value="Class of 2027">Class of 2027</option>
                <option value="Alumni">Alumni</option>
              </select>
            </div>
          </div>
        </Card>

        {error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button
          onClick={handleContinue}
          disabled={!canProceed()}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mt-6"
        >
          Continue <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="p-8 max-w-5xl mx-auto min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl text-foreground mb-2">What Are You Building?</h1>
          <p className="text-muted-foreground">
            Tell us what you're looking for as you start your business journey (select all that apply)
          </p>
        </div>

        <div className="flex gap-1 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i + 1 <= step ? "bg-accent" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <Card className="p-8 bg-card border-border">
          <div className="grid grid-cols-2 gap-6">
            {GOALS.map((goal) => (
              <Badge
                key={goal.value}
                onClick={() => toggleGoal(goal.value)}
                className={`cursor-pointer p-5 text-center transition-colors ${
                  selectedGoals.includes(goal.value)
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {selectedGoals.includes(goal.value) && (
                  <CheckCircle2 className="w-4 h-4 mr-2 inline" />
                )}
                {goal.label}
              </Badge>
            ))}
          </div>
        </Card>

        {error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="flex-1 border-border text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!canProceed()}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Helper function for industries
  const toggleIndustry = (industryName: string) => {
    setSelectedIndustries((prev) => {
      if (prev.includes(industryName)) {
        return prev.filter((name) => name !== industryName);
      } else if (prev.length < 3) {
        return [...prev, industryName];
      }
      return prev;
    });
  };

  // Step 3: Skills I Can Offer
  if (step === 3) {
    const filteredCategories = getFilteredSkillCategories();
    
    return (
      <div className="p-8 max-w-4xl mx-auto min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl text-foreground mb-2">Skills I Can Offer</h1>
          <p className="text-muted-foreground">
            What expertise can you share? Select at least 5 skills to help us match you with the right opportunities.
          </p>
        </div>

        <div className="flex gap-1 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i + 1 <= step ? "bg-accent" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <Card className="p-6 bg-card border-border">
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading skills...</p>
            ) : filteredCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No skills available.</p>
            ) : (
              filteredCategories.map((category) => {
                const isExpanded = expandedCategories.has(category.id);
                return (
                  <div key={category.id} className="border border-border rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      className="w-full p-4 bg-muted/50 hover:bg-muted/70 transition-colors flex items-center justify-between text-left"
                    >
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-1">{category.name}</h3>
                        {category.description && (
                          <p className="text-xs text-muted-foreground">{category.description}</p>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground ml-4 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground ml-4 flex-shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="p-4 bg-card border-t border-border">
                        <div className="flex flex-wrap gap-2">
                          {category.skills.map((skill) => (
                            <Badge
                              key={skill.id}
                              onClick={() => toggleSkill(skill.id, "offer")}
                              className={`cursor-pointer transition-colors ${
                                skillsOffer.includes(skill.id)
                                  ? "bg-accent text-accent-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {skillsOffer.includes(skill.id) && (
                                <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                              )}
                              {skill.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Selected: <span className="font-semibold text-foreground">{skillsOffer.length}/5 minimum</span>
            </p>
          </div>
        </Card>

        {error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="flex-1 border-border text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!canProceed()}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Step 4: Skills I Want
  if (step === 4) {
    const filteredCategories = getFilteredSkillCategories();
    
    return (
      <div className="p-8 max-w-4xl mx-auto min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl text-foreground mb-2">Skills I Want to Learn</h1>
          <p className="text-muted-foreground">
            What skills do you want to develop? Select at least 5 skills to help us match you with the right opportunities and mentors.
          </p>
        </div>

        <div className="flex gap-1 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i + 1 <= step ? "bg-accent" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <Card className="p-6 bg-card border-border">
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading skills...</p>
            ) : filteredCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No skills available.</p>
            ) : (
              filteredCategories.map((category) => {
                const isExpanded = expandedCategories.has(category.id);
                return (
                  <div key={category.id} className="border border-border rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      className="w-full p-4 bg-muted/50 hover:bg-muted/70 transition-colors flex items-center justify-between text-left"
                    >
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-1">{category.name}</h3>
                        {category.description && (
                          <p className="text-xs text-muted-foreground">{category.description}</p>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground ml-4 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground ml-4 flex-shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="p-4 bg-card border-t border-border">
                        <div className="flex flex-wrap gap-2">
                          {category.skills.map((skill) => (
                            <Badge
                              key={skill.id}
                              onClick={() => toggleSkill(skill.id, "want")}
                              className={`cursor-pointer transition-colors ${
                                skillsWant.includes(skill.id)
                                  ? "bg-accent text-accent-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {skillsWant.includes(skill.id) && (
                                <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                              )}
                              {skill.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Selected: <span className="font-semibold text-foreground">{skillsWant.length}/5 minimum</span>
            </p>
          </div>
        </Card>

        {error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="flex-1 border-border text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!canProceed()}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Step 5: Industries + Role Titles
  if (step === 5) {
    return (
      <div className="p-8 max-w-4xl mx-auto min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl text-foreground mb-2">Industries & Role</h1>
          <p className="text-muted-foreground">
            Select your industries and enter your role titles to help us match you better.
          </p>
        </div>

        <div className="flex gap-1 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i + 1 <= step ? "bg-accent" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="space-y-6">
          {/* Industries */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-3">Industries (up to 3)</h2>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((industry: string) => (
                <Badge
                  key={industry}
                  onClick={() => toggleIndustry(industry)}
                  className={`cursor-pointer transition-colors ${
                    selectedIndustries.includes(industry)
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {selectedIndustries.includes(industry) && (
                    <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                  )}
                  {industry}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Selected: {selectedIndustries.length}/3
            </p>
          </Card>

          {/* Role Titles (Text Field) */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Role Titles (optional)
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              Enter your role titles separated by commas (e.g., "CEO, Founder, Product Manager")
            </p>
            <Input
              type="text"
              value={roleTitlesText}
              onChange={(e) => setRoleTitlesText(e.target.value)}
              placeholder="CEO, Founder, Product Manager"
              className="w-full"
            />
          </Card>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="flex-1 border-border text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!canProceed()}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Step 6: Job Preferences (conditional, only if find_job or hire selected)
  if (step === 6 && showJobPrefs) {

    return (
      <div className="p-8 max-w-2xl mx-auto min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl text-foreground mb-2">Ideal Schedule</h1>
          <p className="text-muted-foreground">
            Tell us about your work style and preferences to help us match you with the right opportunities
          </p>
        </div>

        <div className="flex gap-1 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i + 1 <= step ? "bg-accent" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <Card className="p-8 bg-card border-border space-y-6">
          <div>
            <Label>Style *</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Full-time", "Part-time", "Contract", "Internship", "Freelance"].map((type) => (
                <Badge
                  key={type}
                  onClick={() =>
                    setJobTypes((prev) =>
                      prev.includes(type)
                        ? prev.filter((t) => t !== type)
                        : [...prev, type]
                    )
                  }
                  className={`cursor-pointer ${
                    jobTypes.includes(type)
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted"
                  }`}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Preferred Work Location *</Label>
            <p className="text-xs text-muted-foreground mb-2">
              How do you prefer to work?
            </p>
            <div className="mt-2 flex gap-2">
              {([
                { value: "remote", label: "Fully Remote" },
                { value: "hybrid", label: "Hybrid" },
                { value: "on_site", label: "On-Site" },
              ] as const).map(({ value, label }) => (
                <Badge
                  key={value}
                  onClick={() => setWorkMode(value)}
                  className={`cursor-pointer transition-colors ${
                    workMode === value
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {workMode === value && (
                    <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                  )}
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Min Compensation (USD, optional)</Label>
              <Input
                type="number"
                value={compMin}
                onChange={(e) => setCompMin(e.target.value)}
                className="mt-2"
                placeholder="50000"
              />
            </div>
            <div>
              <Label>Max Compensation (USD, optional)</Label>
              <Input
                type="number"
                value={compMax}
                onChange={(e) => setCompMax(e.target.value)}
                className="mt-2"
                placeholder="100000"
              />
            </div>
          </div>
        </Card>

        {error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="flex-1 border-border text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!canProceed()}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Step 7: Profile Links + Visibility (final step)
  if (step === 7) {
    return (
      <div className="p-8 max-w-2xl mx-auto min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl text-foreground mb-2">Complete Your Profile</h1>
          <p className="text-muted-foreground">
            Add your professional links and control how others can discover you on the platform
          </p>
        </div>

        <div className="flex gap-1 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i + 1 <= step ? "bg-accent" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <Card className="p-8 bg-card border-border space-y-6">
          <div>
            <Label>LinkedIn URL (optional)</Label>
            <Input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className="mt-2"
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>

          <div>
            <Label>Portfolio URL (optional)</Label>
            <Input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              className="mt-2"
              placeholder="https://yourportfolio.com"
            />
          </div>

          <div>
            <Label>Visibility Settings</Label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={visibility.discovery}
                  onChange={(e) =>
                    setVisibility((prev) => ({ ...prev, discovery: e.target.checked }))
                  }
                />
                <span>Show in user discovery</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={visibility.jobs}
                  onChange={(e) =>
                    setVisibility((prev) => ({ ...prev, jobs: e.target.checked }))
                  }
                />
                <span>Show in job matching</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={visibility.marketplace}
                  onChange={(e) =>
                    setVisibility((prev) => ({ ...prev, marketplace: e.target.checked }))
                  }
                />
                <span>Show in skill marketplace</span>
              </label>
            </div>
          </div>

          <div>
            <Label>Privacy & Matching Consent *</Label>
            <div className="mt-2 space-y-3">
              <label className="flex items-start gap-3 p-3 border border-border rounded-lg hover:border-accent transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent.matching}
                  onChange={(e) =>
                    setConsent((prev) => ({ ...prev, matching: e.target.checked }))
                  }
                  required
                  className="mt-1"
                />
                <div>
                  <span className="text-foreground font-medium">Allow MORTAR to match me with opportunities *</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    We'll use your profile to connect you with relevant entrepreneurs, job opportunities, and business partners
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border border-border rounded-lg hover:border-accent transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent.marketing}
                  onChange={(e) =>
                    setConsent((prev) => ({ ...prev, marketing: e.target.checked }))
                  }
                  className="mt-1"
                />
                <div>
                  <span className="text-foreground font-medium">Receive updates and business tips (optional)</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Get helpful resources, event invitations, and tips for growing your business
                  </p>
                </div>
              </label>
            </div>
          </div>
        </Card>

        {error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive font-medium mb-1">Error</p>
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Please check the browser console (F12) for more details.
            </p>
          </div>
        )}

        {saving && (
          <div className="mt-4 p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-foreground">Saving your profile... Please wait.</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={saving}
            className="flex-1 border-border text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button
            onClick={() => {
              handleContinue();
            }}
            disabled={!canProceed() || saving}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {saving ? "Saving..." : "Complete Setup"}
          </Button>
        </div>
      </div>
    );
  }

  // Step 8: Completion screen (shows while processing and after completion)
  if (step === 8) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center min-h-screen flex flex-col items-center justify-center">
        {saving ? (
          <>
            <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6 mx-auto">
              <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h1 className="text-3xl text-foreground mb-2">Completing Your Profile...</h1>
            <p className="text-muted-foreground mb-8">
              Please wait while we save your information.
            </p>
          </>
        ) : error ? (
          <>
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6 mx-auto">
              <CheckCircle2 className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-3xl text-foreground mb-2">Onboarding Complete</h1>
            <p className="text-muted-foreground mb-4">
              You've completed the onboarding steps. You can update your profile later from the dashboard.
            </p>
            {error && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg max-w-md mx-auto">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground mb-4">
              Redirecting to dashboard in a few seconds...
            </p>
            <Button
              onClick={() => {
                window.location.href = "/dashboard";
              }}
              className="bg-accent hover:bg-accent/90 text-accent-foreground px-8"
            >
              Go to Dashboard Now
            </Button>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6 mx-auto">
              <CheckCircle2 className="w-10 h-10 text-accent" />
            </div>
            <h1 className="text-3xl text-foreground mb-2">You're all set!</h1>
            <p className="text-muted-foreground mb-8">
              Welcome to the Mortar community. Your profile has been saved successfully.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Redirecting to dashboard in a few seconds...
            </p>
            <Button
              onClick={() => {
                window.location.href = "/dashboard";
              }}
              className="bg-accent hover:bg-accent/90 text-accent-foreground px-8"
            >
              Go to Dashboard Now
            </Button>
          </>
        )}
      </div>
    );
  }

  return null;
}
