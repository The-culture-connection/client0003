"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

export default function JoinPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate invite code
      const inviteCodesRef = collection(db, "invite_codes");
      const q = query(inviteCodesRef, where("code", "==", inviteCode), where("used", "==", false));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("Invalid or already used invite code");
        setLoading(false);
        return;
      }

      const inviteDoc = snapshot.docs[0];
      
      // Create account
      const user = await signUp(email, password);
      
      // Mark invite code as used
      await updateDoc(doc(db, "invite_codes", inviteDoc.id), {
        used: true,
        used_by: user.uid,
        used_at: new Date(),
      });

      router.push("/onboarding");
    } catch (err: any) {
      setError(err.message || "Failed to join");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl text-foreground mb-2">Join MORTAR</h1>
          <p className="text-muted-foreground">
            Enter your invite code to create an account
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive text-destructive text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label htmlFor="inviteCode" className="block text-sm font-medium text-foreground mb-2">
              Invite Code
            </label>
            <Input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              required
              placeholder="ABC123"
              className="uppercase"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {loading ? "Creating Account..." : "Join with Code"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Already have an account? Sign in
          </a>
        </div>
      </Card>
    </div>
  );
}
