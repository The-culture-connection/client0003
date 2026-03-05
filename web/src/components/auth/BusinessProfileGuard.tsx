"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "./AuthProvider";
import {hasBusinessProfile} from "@/lib/auth";

export function BusinessProfileGuard({children}: {children: React.ReactNode}) {
  const {user, loading} = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkProfile() {
      if (loading) return;
      
      if (!user) {
        router.push("/login");
        return;
      }

      const hasProfile = await hasBusinessProfile();
      if (!hasProfile) {
        router.push("/onboarding");
        return;
      }

      setChecking(false);
    }

    checkProfile();
  }, [user, loading, router]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
