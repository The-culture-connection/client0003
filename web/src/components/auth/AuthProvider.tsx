"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { UserWithRoles, getCurrentUserWithRoles } from "@/lib/auth";

interface AuthContextType {
  user: UserWithRoles | null;
  loading: boolean;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshRoles: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithRoles | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshRoles = async () => {
    if (auth.currentUser) {
      const userWithRoles = await getCurrentUserWithRoles();
      setUser(userWithRoles);
    }
  };

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        const userWithRoles = await getCurrentUserWithRoles();
        setUser(userWithRoles);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Route to onboarding if needed (only on client side, after auth state is set)
  useEffect(() => {
    if (!loading && user) {
      // Check onboarding status in the background
      import("@/lib/onboarding").then(({ checkOnboardingStatus }) => {
        checkOnboardingStatus().then((status) => {
          if (status !== "complete" && typeof window !== "undefined") {
            const pathname = window.location.pathname;
            // Only redirect if not already on onboarding or login page
            if (!pathname.startsWith("/onboarding") && !pathname.startsWith("/login")) {
              window.location.href = "/onboarding";
            }
          }
        });
      });
    }
  }, [user, loading]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshRoles }}>
      {children}
    </AuthContext.Provider>
  );
}
