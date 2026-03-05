"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!loading && user) {
      checkOnboardingStatus();
    } else if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const checkOnboardingStatus = async () => {
    if (!user?.uid) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        setOnboardingStatus("needs_profile");
        return;
      }

      const userData = userDoc.data();
      const status = userData?.onboarding_status || "needs_profile";
      setOnboardingStatus(status);

      // If onboarding not complete, redirect to onboarding
      if (status !== "complete") {
        router.push("/onboarding");
        return;
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      setOnboardingStatus("needs_profile");
    } finally {
      setChecking(false);
    }
  };

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (onboardingStatus !== "complete") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl text-foreground mb-2">Complete Your Profile</h1>
            <p className="text-muted-foreground">
              Please complete your onboarding to access the platform.
            </p>
          </div>
          <Link href="/onboarding">
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              Complete Onboarding
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
