import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../components/auth/AuthProvider";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Mock email verification - no actual functionality
    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode");

    if (mode === "verifyEmail" && oobCode) {
      // Simulate verification process
      setTimeout(() => {
        setVerifying(false);
        setVerified(true);
        // In real implementation, would verify email here
        // For now, just show success message
      }, 2000);
    } else {
      setVerifying(false);
      setError("Invalid verification link");
    }
  }, [searchParams]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl text-foreground mb-2">Verifying Email</h1>
          <p className="text-muted-foreground">
            Please wait while we verify your email address...
          </p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive">
            <p className="text-sm">{error}</p>
          </div>
          <Button
            onClick={() => navigate("/login")}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-accent"
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
          <h1 className="text-2xl text-foreground mb-2">Email Verified!</h1>
          <p className="text-muted-foreground mb-4">
            Your email has been verified. Redirecting to onboarding...
          </p>
        </div>
        <Button
          onClick={() => navigate("/onboarding")}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          Continue to Onboarding
        </Button>
      </Card>
    </div>
  );
}
