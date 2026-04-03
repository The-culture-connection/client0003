import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export function MobileOnboarding() {
  const [step, setStep] = useState(1);

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

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  if (step === 1) {
    return (
      <div className="p-4 pb-24 min-h-screen flex flex-col">
        <div className="flex-1">
          <div className="mb-8 pt-8">
            <h1 className="text-2xl text-foreground mb-2">Welcome to Mortar!</h1>
            <p className="text-sm text-muted-foreground">
              Let's set up your profile to connect you with the right people
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
                />
              </div>
              <div>
                <Label htmlFor="role">Current Role</Label>
                <Input
                  id="role"
                  placeholder="e.g., Product Manager"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Where do you work?"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="City, State"
                  className="mt-2"
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
              Select topics you're interested in (choose at least 3)
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
            onClick={() => setStep(4)}
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
      <h1 className="text-2xl text-foreground mb-2">You're all set!</h1>
      <p className="text-muted-foreground mb-8">
        Welcome to the Mortar community. Let's get started!
      </p>
      <Button
        onClick={() => (window.location.href = "/mobile/feed")}
        className="bg-accent hover:bg-accent/90 text-accent-foreground px-8"
      >
        Explore the App
      </Button>
    </div>
  );
}
