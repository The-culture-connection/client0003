import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "firebase/auth";
import {
  signIn as firebaseSignIn,
  signUp as firebaseSignUp,
  signOutUser,
  getCurrentUserWithRoles,
  onAuthChange,
  UserWithRoles,
} from "../../lib/auth";

interface AuthContextType {
  user: UserWithRoles | null;
  loading: boolean;
  refreshRoles: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<UserWithRoles>;
  signUp: (email: string, password: string) => Promise<UserWithRoles>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshRoles: async () => {},
  signIn: async () => ({ uid: "", email: null, displayName: null } as UserWithRoles),
  signUp: async () => ({ uid: "", email: null, displayName: null } as UserWithRoles),
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithRoles | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshRoles = async () => {
    if (user) {
      const userWithRoles = await getCurrentUserWithRoles({ fresh: true });
      if (userWithRoles) {
        setUser(userWithRoles);
      }
    }
  };

  const signIn = async (email: string, password: string): Promise<UserWithRoles> => {
    await firebaseSignIn(email, password);
    const userWithRoles = await getCurrentUserWithRoles({ fresh: true });
    if (!userWithRoles) {
      throw new Error("Failed to get user with roles");
    }
    setUser(userWithRoles);
    return userWithRoles;
  };

  const signUp = async (email: string, password: string): Promise<UserWithRoles> => {
    await firebaseSignUp(email, password);
    const userWithRoles = await getCurrentUserWithRoles({ fresh: true });
    if (!userWithRoles) {
      throw new Error("Failed to get user with roles");
    }
    setUser(userWithRoles);
    return userWithRoles;
  };

  const signOut = async (): Promise<void> => {
    await signOutUser();
    setUser(null);
  };

  // Listen to auth state changes
  useEffect(() => {
    // Tracks the latest auth event so a slow role lookup from an earlier
    // event can't overwrite a newer one.
    let latest = 0;
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      const seq = ++latest;
      try {
        if (firebaseUser) {
          const userWithRoles = await getCurrentUserWithRoles({ fresh: true });
          if (seq === latest) setUser(userWithRoles);
        } else if (seq === latest) {
          setUser(null);
        }
      } catch (error) {
        // Previously an error here left `loading` true forever: a spinner
        // that only a refresh could clear.
        console.error("Auth state handling failed:", error);
        if (seq === latest) setUser(null);
      } finally {
        if (seq === latest) setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      refreshRoles, 
      signIn, 
      signUp, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}
