"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { upsertBusinessProfile } from "@/lib/businessProfile";
import type { BusinessProfile } from "@/lib/types";

export function WebOnboardingPage() {
  const [step, setStep] = useState(1);
  const router = useRouter();
  const { user } = useAuth();

  const interests = [
    "Product Design",
    "Marketing",
    "Sales",
    "Finance",
    "Operations",
    "Technology",
    "Leadership",
    "Entrepreneurship",
    "Community",
    "Networking",
  ];

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form data state
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    company: "",
    city: "",
    cohort: "",
    connectionGoals: "",
  });

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const saveProfileData = async () => {
    if (!user?.uid) {
      throw new Error("User not authenticated");
    }

    // Validate required fields
    if (!formData.cohort || !formData.city || selectedInterests.length === 0) {
      throw new Error("Please fill in all required fields: cohort, city, and at least one interest");
    }

    try {
      const businessProfile: BusinessProfile = {
        cohort_name: formData.cohort,
        city: formData.city,
        connection_intents: selectedInterests,
      };
      
      await upsertBusinessProfile(businessProfile);
    } catch (error: any) {
      console.error("Error saving profile data:", error);
      // Re-throw with more user-friendly message
      const errorMessage = error?.message || error?.code || "Failed to save profile. Please try again.";
      throw new Error(errorMessage);
    }
  };

  const handleContinue = async () => {
    if (step === 2) {
      // Save profile data before moving to completion
      setError(null);
      setSaving(true);
      try {
        await saveProfileData();
        setStep(3);
      } catch (err: any) {
        setError(err.message || "Failed to save profile. Please try again.");
      } finally {
        setSaving(false);
      }
    } else {
      setStep(step + 1);
    }
  };

  const cohorts = [
    "Class of 2024",
    "Class of 2025",
    "Class of 2026",
    "Class of 2027",
    "Alumni",
    "Other",
  ];

  if (step === 1) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl text-foreground mb-2">Welcome to Mortar!</h1>
          <p className="text-muted-foreground">
            Let's set up your business profile to connect you with the right people
          </p>
        </div>

        <div className="flex gap-1 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                s === step ? "bg-accent" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <Card className="p-8 bg-card border-border">
          <h2 className="text-xl text-foreground mb-6">
            Tell us about yourself
          </h2>
          <div className="space-y-6">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                className="mt-2"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="role">Current Role</Label>
              <Input
                id="role"
                placeholder="e.g., Product Manager"
                className="mt-2"
                value={formData.role}
                onChange={(e) => handleInputChange("role", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                placeholder="Where do you work?"
                className="mt-2"
                value={formData.company}
                onChange={(e) => handleInputChange("company", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="e.g., San Francisco, CA"
                className="mt-2"
                value={formData.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cohort">Cohort</Label>
              <select
                id="cohort"
                className="mt-2 flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-base text-gray-900 transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
                value={formData.cohort}
                onChange={(e) => handleInputChange("cohort", e.target.value)}
              >
                <option value="">Select your cohort</option>
                {cohorts.map((cohort) => (
                  <option key={cohort} value={cohort}>
                    {cohort}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="connectionGoals">What are you looking for on the app?</Label>
              <textarea
                id="connectionGoals"
                placeholder="e.g., Looking to connect with other entrepreneurs, find mentors, or explore business opportunities..."
                className="mt-2 flex min-h-24 w-full rounded-md border border-input bg-white px-3 py-2 text-base text-gray-900 placeholder:text-muted-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm resize-none"
                value={formData.connectionGoals}
                onChange={(e) => handleInputChange("connectionGoals", e.target.value)}
                rows={4}
              />
            </div>
          </div>
        </Card>

        <Button
          onClick={() => setStep(2)}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mt-6"
        >
          Continue
        </Button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl text-foreground mb-2">Your Interests</h1>
          <p className="text-muted-foreground">
            Select topics you're interested in (choose at least 3)
          </p>
        </div>

        <div className="flex gap-1 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                s <= step ? "bg-accent" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          {interests.map((interest) => (
            <Badge
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`cursor-pointer text-sm py-2 px-4 ${
                selectedInterests.includes(interest)
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {selectedInterests.includes(interest) && (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {interest}
            </Badge>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setStep(1)}
            disabled={saving}
            className="flex-1 border-border text-foreground"
          >
            Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={selectedInterests.length < 3 || saving}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {saving ? "Saving..." : "Complete Setup"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto text-center">
      <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6 mx-auto">
        <CheckCircle2 className="w-10 h-10 text-accent" />
      </div>
      <h1 className="text-3xl text-foreground mb-2">You're all set!</h1>
      <p className="text-muted-foreground mb-8">
        Welcome to the Mortar community. Your business profile has been saved.
      </p>
      <Button
        onClick={() => router.push("/dashboard")}
        className="bg-accent hover:bg-accent/90 text-accent-foreground px-8"
      >
        Go to Dashboard
      </Button>
    </div>
  );
}
