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
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

export function MobileOnboardingPage() {
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
    if (!user?.uid) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        display_name: formData.name || null,
        role: formData.role || null,
        company: formData.company || null,
        city: formData.city || null,
        cohort: formData.cohort || null,
        connection_goals: formData.connectionGoals || null,
        interests: selectedInterests,
        profile_completed: true,
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error saving profile data:", error);
      throw error;
    }
  };

  const handleContinue = async () => {
    if (step === 3) {
      // Save profile data before moving to completion
      await saveProfileData();
      setStep(4);
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
      <div className="p-4 pb-24 min-h-screen flex flex-col">
        <div className="flex-1">
          <div className="mb-8 pt-8">
            <h1 className="text-2xl text-foreground mb-2">Welcome to Mortar!</h1>
            <p className="text-sm text-muted-foreground">
              Let&apos;s set up your business profile to connect you with the right people
            </p>
          </div>

          <div className="space-y-1 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 rounded-full ${
                  s === step ? "bg-accent" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg text-foreground mb-4">
              Tell us about yourself
            </h2>
            <div className="space-y-4">
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
                  className="mt-2 flex min-h-20 w-full rounded-md border border-input bg-white px-3 py-2 text-base text-gray-900 placeholder:text-muted-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm resize-none"
                  value={formData.connectionGoals}
                  onChange={(e) => handleInputChange("connectionGoals", e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </Card>
        </div>

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
      <div className="p-4 pb-24 min-h-screen flex flex-col">
        <div className="flex-1">
          <div className="mb-8 pt-8">
            <h1 className="text-2xl text-foreground mb-2">Your Interests</h1>
            <p className="text-sm text-muted-foreground">
              Select topics you&apos;re interested in (choose at least 3)
            </p>
          </div>

          <div className="space-y-1 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 rounded-full ${
                  s <= step ? "bg-accent" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
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
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setStep(1)}
            className="flex-1 border-border text-foreground"
          >
            Back
          </Button>
          <Button
            onClick={() => setStep(3)}
            disabled={selectedInterests.length < 3}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="p-4 pb-24 min-h-screen flex flex-col">
        <div className="flex-1">
          <div className="mb-8 pt-8">
            <h1 className="text-2xl text-foreground mb-2">
              Connect Your Accounts
            </h1>
            <p className="text-sm text-muted-foreground">
              Link your professional profiles (optional)
            </p>
          </div>

          <div className="space-y-1 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 rounded-full ${
                  s <= step ? "bg-accent" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="space-y-3">
            {[
              { name: "LinkedIn", icon: "in", color: "bg-blue-600" },
              { name: "Twitter", icon: "𝕏", color: "bg-black" },
              { name: "GitHub", icon: "GH", color: "bg-gray-800" },
            ].map((platform) => (
              <Card
                key={platform.name}
                className="p-4 bg-card border-border flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 ${platform.color} text-white rounded-lg flex items-center justify-center font-bold`}
                  >
                    {platform.icon}
                  </div>
                  <span className="text-foreground font-medium">
                    {platform.name}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-foreground"
                >
                  Connect
                </Button>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setStep(2)}
            className="flex-1 border-border text-foreground"
          >
            Back
          </Button>
          <Button
            onClick={handleContinue}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 min-h-screen flex flex-col justify-center items-center text-center">
      <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-accent" />
      </div>
      <h1 className="text-2xl text-foreground mb-2">You&apos;re all set!</h1>
      <p className="text-muted-foreground mb-8">
        Welcome to the Mortar community. Let&apos;s get started!
      </p>
      <Button
        onClick={() => router.push("/mobile/feed")}
        className="bg-accent hover:bg-accent/90 text-accent-foreground px-8"
      >
        Explore the App
      </Button>
    </div>
  );
}
