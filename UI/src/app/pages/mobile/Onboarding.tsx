import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router";

export function MobileOnboarding() {
  const [step, setStep] = useState(0);
  const [userType, setUserType] = useState<"alumni" | "paid" | null>(null);
  const navigate = useNavigate();

  const renderWelcome = () => (
    <div className="p-6">
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
          <span className="text-4xl">🎓</span>
        </div>
        <h1 className="text-2xl text-foreground mb-2">Welcome to Mortar</h1>
        <p className="text-muted-foreground">
          Connect with alumni and discover opportunities
        </p>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => {
            setUserType("alumni");
            setStep(1);
          }}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-auto py-4"
        >
          <div className="text-left w-full">
            <div className="flex items-center justify-between">
              <span className="text-base">I'm an Alumni</span>
              <ChevronRight className="w-5 h-5" />
            </div>
            <p className="text-xs text-accent-foreground/80 mt-1">
              Free access with verification
            </p>
          </div>
        </Button>

        <Button
          onClick={() => {
            setUserType("paid");
            setStep(1);
          }}
          variant="outline"
          className="w-full border-border h-auto py-4"
        >
          <div className="text-left w-full">
            <div className="flex items-center justify-between">
              <span className="text-base">I'm a New User</span>
              <ChevronRight className="w-5 h-5" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Premium membership required
            </p>
          </div>
        </Button>
      </div>
    </div>
  );

  const renderReferral = () => (
    <div className="p-6">
      <h2 className="text-xl text-foreground mb-2">Referral Code</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {userType === "alumni"
          ? "Enter your alumni verification code to get free access"
          : "Who referred you to Mortar?"}
      </p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="referralCode">Referral Code</Label>
          <Input
            id="referralCode"
            type="text"
            placeholder="Enter code"
            className="mt-2"
          />
        </div>

        {userType === "alumni" && (
          <Card className="p-4 bg-accent/10 border-accent">
            <p className="text-xs text-muted-foreground">
              Your referral code determines your badge type. Alumni badges give
              you special recognition in the community.
            </p>
          </Card>
        )}

        <Button
          onClick={() => setStep(2)}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          Continue
        </Button>

        <Button
          onClick={() => setStep(2)}
          variant="ghost"
          className="w-full"
        >
          Skip for now
        </Button>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="p-6">
      <h2 className="text-xl text-foreground mb-2">Create Your Profile</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Tell us a bit about yourself
      </p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Enter your name"
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="role">Current Role</Label>
          <Input
            id="role"
            type="text"
            placeholder="e.g., Software Engineer"
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            type="text"
            placeholder="Where do you work?"
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            type="text"
            placeholder="City, State"
            className="mt-2"
          />
        </div>

        <Button
          onClick={() => setStep(3)}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          Continue
        </Button>
      </div>
    </div>
  );

  const renderTutorial = () => (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-accent" />
        </div>
        <h2 className="text-xl text-foreground mb-2">You're All Set!</h2>
        <p className="text-muted-foreground">
          Here's a quick tour of what you can do
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">📱</span>
            </div>
            <div>
              <h4 className="text-foreground mb-1">Feed</h4>
              <p className="text-sm text-muted-foreground">
                Share updates and connect with the community
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">👥</span>
            </div>
            <div>
              <h4 className="text-foreground mb-1">Groups</h4>
              <p className="text-sm text-muted-foreground">
                Join communities and participate in discussions
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🎯</span>
            </div>
            <div>
              <h4 className="text-foreground mb-1">Explore</h4>
              <p className="text-sm text-muted-foreground">
                Discover alumni matches and send intro messages
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">📅</span>
            </div>
            <div>
              <h4 className="text-foreground mb-1">Events</h4>
              <p className="text-sm text-muted-foreground">
                Attend meetups and networking events
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Button
        onClick={() => navigate("/mobile")}
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        Get Started
      </Button>
    </div>
  );

  return (
    <div className="bg-background min-h-screen flex flex-col">
      {/* Progress Bar */}
      {step > 0 && (
        <div className="p-4 border-b border-border">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Step {step} of 3
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          {step === 0 && renderWelcome()}
          {step === 1 && renderReferral()}
          {step === 2 && renderProfile()}
          {step === 3 && renderTutorial()}
        </div>
      </div>
    </div>
  );
}
