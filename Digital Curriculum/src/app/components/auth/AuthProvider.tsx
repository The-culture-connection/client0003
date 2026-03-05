import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Mock user type (no Firebase) - matches web structure
interface MockUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  roles?: string[];
}

interface AuthContextType {
  user: MockUser | null;
  loading: boolean;
  refreshRoles: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<MockUser>;
  signUp: (email: string, password: string) => Promise<MockUser>;
  signInWithGoogle: () => Promise<MockUser>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshRoles: async () => {},
  signIn: async () => ({ uid: "", email: null, displayName: null }),
  signUp: async () => ({ uid: "", email: null, displayName: null }),
  signInWithGoogle: async () => ({ uid: "", email: null, displayName: null }),
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Mock state - no actual authentication
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshRoles = async () => {
    // Mock function - no functionality
    if (user) {
      // In real implementation, would refresh roles here
    }
  };

  const signIn = async (email: string, password: string): Promise<MockUser> => {
    // Mock sign in - creates a mock user
    const mockUser: MockUser = {
      uid: `mock-${Date.now()}`,
      email: email,
      displayName: email.split("@")[0],
      roles: ["user"],
    };
    setUser(mockUser);
    return mockUser;
  };

  const signUp = async (email: string, password: string): Promise<MockUser> => {
    // Mock sign up - creates a mock user
    const mockUser: MockUser = {
      uid: `mock-${Date.now()}`,
      email: email,
      displayName: email.split("@")[0],
      roles: ["user"],
    };
    setUser(mockUser);
    return mockUser;
  };

  const signInWithGoogle = async (): Promise<MockUser> => {
    // Mock Google sign in - creates a mock user
    const mockUser: MockUser = {
      uid: `mock-google-${Date.now()}`,
      email: "user@gmail.com",
      displayName: "Google User",
      roles: ["user"],
    };
    setUser(mockUser);
    return mockUser;
  };

  const signOut = async (): Promise<void> => {
    setUser(null);
  };

  // Simulate initial auth check (like Firebase onAuthStateChanged)
  useEffect(() => {
    // Simulate loading delay
    setTimeout(() => {
      setLoading(false);
      // No user set by default (UI only - no actual auth)
    }, 500);
  }, []);

  // Mock onboarding check (like web version)
  useEffect(() => {
    if (!loading && user) {
      // In real implementation, would check onboarding status here
      // For UI only, we skip this
    }
  }, [user, loading]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshRoles, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
