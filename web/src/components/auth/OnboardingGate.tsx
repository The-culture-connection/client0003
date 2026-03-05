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
      // Check if onboarding was just completed (from sessionStorage)
      const justCompleted = typeof window !== "undefined" 
        ? sessionStorage.getItem("onboarding_just_completed") === "true"
        : false;
      
      console.log("🔍 [GATE] Checking onboarding status. justCompleted:", justCompleted, "pathname:", typeof window !== "undefined" ? window.location.pathname : "N/A");
      
      // If onboarding was just completed, allow access immediately without checking Firestore
      if (justCompleted) {
        console.log("✅ [GATE] Onboarding just completed - allowing access immediately (bypassing Firestore check)");
        setOnboardingStatus("complete");
        setChecking(false);
        // Clear the flag after a delay to allow Firestore to catch up
        setTimeout(() => {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("onboarding_just_completed");
            console.log("🧹 [GATE] Cleared onboarding_just_completed flag");
          }
        }, 10000); // Clear after 10 seconds
        return;
      }
      
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.log("⚠️ [GATE] User document does not exist");
        setOnboardingStatus("needs_profile");
        setChecking(false);
        return;
      }

      const userData = userDoc.data();
      const status = userData?.onboarding_status || "needs_profile";
      console.log("📊 [GATE] Onboarding status from Firestore:", status);
      
      setOnboardingStatus(status);

      // If onboarding not complete, redirect to onboarding
      if (status !== "complete") {
        // Only redirect if we're not already on the onboarding page
        const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
        if (!currentPath.startsWith("/onboarding")) {
          console.log("🔄 [GATE] Status not complete, redirecting to onboarding");
          router.push("/onboarding");
        } else {
          console.log("ℹ️ [GATE] Already on onboarding page, not redirecting");
        }
        setChecking(false);
        return;
      }
      
      console.log("✅ [GATE] Onboarding complete, allowing access");
      // Clear the flag if status is complete
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("onboarding_just_completed");
      }
    } catch (error) {
      console.error("❌ [GATE] Error checking onboarding status:", error);
      // If there's an error and we have the justCompleted flag, allow access anyway
      const justCompleted = typeof window !== "undefined" 
        ? sessionStorage.getItem("onboarding_just_completed") === "true"
        : false;
      if (justCompleted) {
        console.log("✅ [GATE] Error occurred but justCompleted flag is set - allowing access");
        setOnboardingStatus("complete");
      } else {
        setOnboardingStatus("needs_profile");
      }
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
