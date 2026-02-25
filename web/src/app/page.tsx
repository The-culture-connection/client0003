"use client";

import {useState, useEffect} from "react";
import {signIn, signUp, signOutUser, getCurrentUserWithRoles, onAuthChange, UserWithRoles} from "@/lib/auth";
import "./globals.css";

export default function Home() {
  const [user, setUser] = useState<UserWithRoles | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthChange(async (authUser) => {
      if (authUser) {
        const userWithRoles = await getCurrentUserWithRoles();
        setUser(userWithRoles);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      // Auth state will update via onAuthChange
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err: any) {
      setError(err.message || "Sign out failed");
    }
  };

  if (loading) {
    return (
      <div style={{padding: "2rem", textAlign: "center"}}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <main style={{maxWidth: "800px", margin: "0 auto", padding: "2rem"}}>
      <h1 style={{marginBottom: "2rem"}}>MORTAR - Phase 0</h1>
      
      {!user ? (
        <div style={{background: "white", padding: "2rem", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)"}}>
          <h2 style={{marginBottom: "1rem"}}>{isSignUp ? "Sign Up" : "Sign In"}</h2>
          
          {error && (
            <div style={{background: "#fee", color: "#c33", padding: "1rem", borderRadius: "4px", marginBottom: "1rem"}}>
              {error}
            </div>
          )}

          <form onSubmit={handleAuth}>
            <div style={{marginBottom: "1rem"}}>
              <label style={{display: "block", marginBottom: "0.5rem"}}>
                Email:
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{width: "100%", padding: "0.5rem", marginTop: "0.25rem", border: "1px solid #ddd", borderRadius: "4px"}}
                />
              </label>
            </div>
            
            <div style={{marginBottom: "1rem"}}>
              <label style={{display: "block", marginBottom: "0.5rem"}}>
                Password:
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{width: "100%", padding: "0.5rem", marginTop: "0.25rem", border: "1px solid #ddd", borderRadius: "4px"}}
                />
              </label>
            </div>

            <button
              type="submit"
              style={{width: "100%", padding: "0.75rem", background: "#0070f3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginBottom: "1rem"}}
            >
              {isSignUp ? "Sign Up" : "Sign In"}
            </button>
          </form>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{width: "100%", padding: "0.5rem", background: "transparent", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer"}}
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>
      ) : (
        <div style={{background: "white", padding: "2rem", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)"}}>
          <h2 style={{marginBottom: "1rem"}}>Welcome!</h2>
          
          <div style={{marginBottom: "1rem"}}>
            <p><strong>UID:</strong> {user.uid}</p>
            <p><strong>Email:</strong> {user.email || "N/A"}</p>
            <p><strong>Display Name:</strong> {user.displayName || "N/A"}</p>
            <p><strong>Roles:</strong> {user.roles && user.roles.length > 0 ? user.roles.join(", ") : "None"}</p>
          </div>

          <button
            onClick={handleSignOut}
            style={{padding: "0.75rem 1.5rem", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer"}}
          >
            Sign Out
          </button>
        </div>
      )}

      <div style={{marginTop: "2rem", padding: "1rem", background: "#f0f0f0", borderRadius: "4px", fontSize: "0.9rem"}}>
        <p><strong>Environment:</strong> {process.env.NEXT_PUBLIC_FIREBASE_ENV || "dev"}</p>
        <p><strong>Project ID:</strong> {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mortar-dev"}</p>
        <p><strong>Emulator:</strong> {process.env.NEXT_PUBLIC_USE_EMULATOR === "true" ? "Enabled" : "Disabled"}</p>
      </div>
    </main>
  );
}
