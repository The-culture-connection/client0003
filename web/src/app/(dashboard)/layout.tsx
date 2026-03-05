"use client";

import { usePathname } from "next/navigation";
import { WebNavigation } from "@/components/navigation/WebNavigation";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { OnboardingGate } from "@/components/auth/OnboardingGate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMobile = pathname?.startsWith("/mobile");
  const isOnboarding = pathname?.startsWith("/onboarding");

  return (
    <AuthGuard>
      {!isOnboarding && (
        <OnboardingGate>
          <div className="min-h-screen bg-background">
            {isMobile ? <MobileNavigation /> : <WebNavigation />}
            <main className={isMobile ? "pb-20" : ""}>
              {children}
            </main>
          </div>
        </OnboardingGate>
      )}
      {isOnboarding && (
        <div className="min-h-screen bg-background">
          {children}
        </div>
      )}
    </AuthGuard>
  );
}
