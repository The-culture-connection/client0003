"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const ROLES = [
  { value: "Digital Curriculum Students", label: "Digital Curriculum Student" },
  { value: "Digital Curriculum Alumni", label: "Digital Curriculum Alumni" },
  { value: "In Person Curriculum Students", label: "In Person Curriculum Student" },
  { value: "In Person Curriculum Alumni", label: "In Person Curriculum Alumni" },
  { value: "Admin", label: "Admin" },
];

export function SimpleOnboardingPage() {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user, loading: authLoading, refreshRoles } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const handleComplete = async () => {
    if (!selectedRole) {
      setError("Please select a role");
      return;
    }

    if (!user?.uid) {
      setError("User not authenticated");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if user document exists, create or update as needed
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        // Document exists, update it
        await updateDoc(userRef, {
          roles: [selectedRole],
          onboarding_status: "complete",
        });
      } else {
        // Document doesn't exist, create it
        // This can happen if the onUserCreated trigger hasn't run yet
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || null,
          display_name: user.displayName || null,
          photo_url: user.photoURL || null,
          roles: [selectedRole],
          onboarding_status: "complete",
          email_verified: user.emailVerified || false,
          badges: {
            earned: [],
            visible: [],
          },
          membership: {
            status: "active",
            paid_modules: [],
          },
          permissions: {
            hidden_videos: [],
          },
          points: {
            balance: 0,
            history_summary: [],
          },
          profile_completed: false,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      }

      // Refresh user roles to get updated data
      await refreshRoles();

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Error completing onboarding:", err);
      setError(err.message || "Failed to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Complete Your Profile
          </h1>
          <p className="text-muted-foreground">
            Select your role to get started
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-8">
          <Label className="text-base font-semibold text-foreground">
            Select Your Role
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ROLES.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => setSelectedRole(role.value)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedRole === role.value
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">
                    {role.label}
                  </span>
                  {selectedRole === role.value && (
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            You can change this later in your profile settings
          </div>
          <Button
            onClick={handleComplete}
            disabled={!selectedRole || loading}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {loading ? "Completing..." : "Complete Setup"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
