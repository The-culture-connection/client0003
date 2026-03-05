"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { sendEmailVerificationEmail } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail } from "lucide-react";

export default function VerifyEmailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [emailSent, setEmailSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user?.emailVerified) {
      router.push("/onboarding");
    }
  }, [user, router]);

  const handleResend = async () => {
    setSending(true);
    try {
      await sendEmailVerificationEmail();
      setEmailSent(true);
    } catch (error) {
      console.error("Error sending verification email:", error);
    } finally {
      setSending(false);
    }
  };

  if (user?.emailVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-accent mx-auto mb-4" />
          <h1 className="text-2xl text-foreground mb-2">Email Verified!</h1>
          <p className="text-muted-foreground mb-6">
            Your email has been verified. Redirecting to onboarding...
          </p>
          <Button
            onClick={() => router.push("/onboarding")}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Continue to Onboarding
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <Mail className="w-16 h-16 text-accent mx-auto mb-4" />
          <h1 className="text-2xl text-foreground mb-2">Verify Your Email</h1>
          <p className="text-muted-foreground">
            We&apos;ve sent a verification link to <strong>{user?.email}</strong>
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Please check your inbox and click the link to verify your email address.
          </p>
        </div>

        {emailSent && (
          <div className="mb-4 p-3 rounded-lg bg-accent/10 border border-accent text-accent text-sm text-center">
            Verification email sent! Check your inbox.
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleResend}
            disabled={sending || emailSent}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {sending ? "Sending..." : emailSent ? "Email Sent!" : "Resend Verification Email"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/login")}
            className="w-full border-border text-foreground"
          >
            Back to Login
          </Button>
        </div>
      </Card>
    </div>
  );
}
