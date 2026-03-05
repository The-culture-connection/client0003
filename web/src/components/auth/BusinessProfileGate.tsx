"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function BusinessProfileGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!loading && user) {
      checkProfileComplete();
    } else if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const checkProfileComplete = async () => {
    if (!user?.uid) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userDoc = await userRef.get();
      const userData = userDoc.data();
      
      const complete = userData?.profile_completed === true && 
                      userData?.business_profile?.cohort_name &&
                      userData?.business_profile?.city &&
                      userData?.business_profile?.connection_intents?.length > 0;
      
      setProfileComplete(complete || false);
    } catch (error) {
      console.error("Error checking profile:", error);
      setProfileComplete(false);
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

  if (!profileComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl text-foreground mb-2">Complete Your Business Profile</h1>
            <p className="text-muted-foreground">
              Before accessing the curriculum, please complete your business profile.
            </p>
          </div>
          <Link href="/onboarding">
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              Complete Profile
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
