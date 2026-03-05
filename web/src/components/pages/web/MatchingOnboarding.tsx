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
import { upsertMatchProfile, type MatchProfile, type MatchingGoal } from "@/lib/matchProfile";
import { getSkills, getIndustries, getRoles, groupSkillsByCategory, type SkillCategory } from "@/lib/taxonomies";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { debounce } from "@/lib/utils";

const TOTAL_STEPS = 6;

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
  const [step, setStep] = useState(1);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

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
  
  // Step 5: Industries (single select)
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  
  const [availableSkills, setAvailableSkills] = useState<any[]>([]);
  const [availableIndustries, setAvailableIndustries] = useState<any[]>([]);
  const [skillCategories, setSkillCategories] = useState<SkillCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

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

  // Load taxonomies
  useEffect(() => {
    loadTaxonomies();
  }, []);

  const loadTaxonomies = async () => {
    setLoading(true);
    try {
      const [skills, industries] = await Promise.all([
        getSkills(),
        getIndustries(),
      ]);
      setAvailableSkills(skills);
      setAvailableIndustries(industries);
      // Categories are now generated on-demand with groupSkillsByCategory
      console.log("Loaded taxonomies:", { skills: skills.length, industries: industries.length });
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
      setAvailableIndustries([]);
      setSkillCategories([]);
    } finally {
      setLoading(false);
    }
  };

  // Autosave debounced
  const autosave = useCallback(
    debounce(async (profileData: Partial<MatchProfile>) => {
      if (!user?.uid) return;
      try {
        await upsertMatchProfile(profileData as MatchProfile);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Autosave error:", error);
        
        // In development, log to terminal
        if (process.env.NODE_ENV === "development") {
          console.error("[DEV] Autosave error:", {
            message: errorMessage,
            error,
          });
        }
      }
    }, 1000),
    [user]
  );

  // Validate step before proceeding
  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return !!(firstName && lastName && city && state);
      case 2:
        return selectedGoals.length > 0;
      case 3:
        return skillsWant.length >= 5;
      case 4:
        return skillsOffer.length >= 5;
      case 5:
        return selectedIndustry.length > 0;
      case 6:
        // Optional step, but if goals include job-related, validate
        if (selectedGoals.includes("find_job") || selectedGoals.includes("hire")) {
          return jobTypes.length > 0 && !!workMode;
        }
        return true;
      case 7:
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

    if (step === TOTAL_STEPS) {
      // Final step - save everything
      await handleComplete();
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
      profileData.skills_want = skillsWant;
    }

    if (step >= 4) {
      profileData.skills_offer = skillsOffer;
    }

    if (step >= 5) {
      profileData.industries = selectedIndustry ? [selectedIndustry] : [];
    }

    if (step >= 6 && showJobPrefs) {
      profileData.work_mode = workMode as any;
      if (compMin || compMax) {
        profileData.compensation = {
          min: compMin ? parseInt(compMin) : undefined,
          max: compMax ? parseInt(compMax) : undefined,
          currency: "USD",
        };
      }
    }

    // Final step (6 if no job prefs, 7 if job prefs shown)
    const finalStep = showJobPrefs ? 7 : 6;
    if (step >= finalStep) {
      profileData.links = {
        linkedin_url: linkedinUrl,
        portfolio_url: portfolioUrl,
      };
      profileData.visibility = visibility;
      profileData.consent = consent;
    }

    autosave(profileData);
  };

  const handleComplete = async () => {
    if (!user?.uid) return;

    setSaving(true);
    setError(null);

    try {
      // Save business profile
      const setBusinessProfile = httpsCallable(functions, "setUserBusinessProfile");
      await setBusinessProfile({
        first_name: firstName,
        last_name: lastName,
        cohort_name: cohort || "Not in cohort",
        city,
        state,
      });

      // Save match profile
      const profileData: MatchProfile = {
        location: { city, state },
        goals: selectedGoals,
        skills_offer: skillsOffer,
        skills_want: skillsWant,
        industries: selectedIndustry ? [selectedIndustry] : [],
        work_mode: workMode as any,
        links: {
          linkedin_url: linkedinUrl,
          portfolio_url: portfolioUrl,
        },
        visibility,
        consent,
      };

      if (compMin || compMax) {
        profileData.compensation = {
          min: compMin ? parseInt(compMin) : undefined,
          max: compMax ? parseInt(compMax) : undefined,
          currency: "USD",
        };
      }

      await upsertMatchProfile(profileData);

      // Mark onboarding complete
      const updateOnboarding = httpsCallable(functions, "updateOnboardingStatus");
      await updateOnboarding({ status: "complete" });

      // Small delay to ensure data is saved
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Redirect to dashboard
      router.push("/dashboard");
      router.refresh(); // Force refresh to update auth state
    } catch (err: any) {
      const errorMessage = err?.message || "Unknown error";
      const errorStack = err?.stack;
      
      console.error("Error completing onboarding:", err);
      
      // In development, log to terminal
      if (process.env.NODE_ENV === "development") {
        console.error("[DEV] Onboarding completion error:", {
          message: errorMessage,
          stack: errorStack,
          error: err,
        });
      }
      
      setError(errorMessage || "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleGoal = (goal: MatchingGoal) => {
    setSelectedGoals((prev) =>
      prev.includes(goal)
        ? prev.filter((g) => g !== goal)
        : [...prev, goal]
    );
  };

  const toggleSkill = (skillId: string, type: "offer" | "want") => {
    if (type === "offer") {
      setSkillsOffer((prev) =>
        prev.includes(skillId)
          ? prev.filter((id) => id !== skillId)
          : prev.length < 10
            ? [...prev, skillId]
            : prev
      );
    } else {
      setSkillsWant((prev) =>
        prev.includes(skillId)
          ? prev.filter((id) => id !== skillId)
          : prev.length < 10
            ? [...prev, skillId]
            : prev
      );
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

  // Step 3: Skills I'm Looking to Gain
  if (step === 3) {
    const filteredCategories = getFilteredSkillCategories();
    
    return (
      <div className="p-8 max-w-4xl mx-auto min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl text-foreground mb-2">Skills I'm Looking to Gain</h1>
          <p className="text-muted-foreground">
            What skills do you want to develop or learn? Select at least 5 skills to help us match you with the right opportunities and mentors.
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
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading skills...</p>
            ) : filteredCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No skills available. Please contact support.
              </p>
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

  // Step 4: Skills I Can Offer
  if (step === 4) {
    const filteredCategories = getFilteredSkillCategories();
    
    return (
      <div className="p-8 max-w-4xl mx-auto min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl text-foreground mb-2">Skills I Have</h1>
          <p className="text-muted-foreground">
            What expertise can you share with other entrepreneurs? Select at least 5 skills to help us match you with the right opportunities.
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
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading skills...</p>
            ) : filteredCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No skills available. Please contact support.
              </p>
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

  // Step 5: Industries (single select)
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

  if (step === 5) {
    return (
      <div className="p-8 max-w-4xl mx-auto min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl text-foreground mb-2">Industries I'm Interested In</h1>
          <p className="text-muted-foreground">
            What industry aligns with your business goals? Select one industry.
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
          <div className="space-y-2">
            {INDUSTRIES.map((industry) => (
              <button
                key={industry}
                type="button"
                onClick={() => setSelectedIndustry(industry)}
                className={`w-full p-4 text-left rounded-lg border transition-colors ${
                  selectedIndustry === industry
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted/70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{industry}</span>
                  {selectedIndustry === industry && (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
              </button>
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

  // Step 6: Job Preferences (only if job-related goals selected)
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

  // Final step: Links & Privacy (step 6 if no job prefs, step 7 if job prefs shown)
  if ((step === 6 && !showJobPrefs) || (step === 7 && showJobPrefs)) {
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
            disabled={!canProceed() || saving}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {saving ? "Saving..." : "Complete Setup"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
