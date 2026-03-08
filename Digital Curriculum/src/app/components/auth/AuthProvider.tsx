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
      const userWithRoles = await getCurrentUserWithRoles();
      if (userWithRoles) {
        setUser(userWithRoles);
      }
    }
  };

  const signIn = async (email: string, password: string): Promise<UserWithRoles> => {
    const firebaseUser = await firebaseSignIn(email, password);
    const userWithRoles = await getCurrentUserWithRoles();
    if (!userWithRoles) {
      throw new Error("Failed to get user with roles");
    }
    setUser(userWithRoles);
    return userWithRoles;
  };

  const signUp = async (email: string, password: string): Promise<UserWithRoles> => {
    const firebaseUser = await firebaseSignUp(email, password);
    const userWithRoles = await getCurrentUserWithRoles();
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
    const unsubscribe = onAuthChange(async (firebaseUser) => {
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
