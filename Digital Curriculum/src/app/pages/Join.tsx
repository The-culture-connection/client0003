import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { useAuth } from "../components/auth/AuthProvider";
import { useScreenAnalytics } from "../analytics/useScreenAnalytics";
import { trackEvent } from "../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";

export function JoinPage() {
  useScreenAnalytics("join");
  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    trackEvent(WEB_ANALYTICS_EVENTS.LOGIN_SUBMIT_ATTEMPTED, { mode: "invite_sign_up" });

    try {
      // Validate invite code (mock - any code works for UI)
      if (!inviteCode.trim()) {
        setError("Please enter an invite code");
        setLoading(false);
        return;
      }

      // Create account with invite code
      await signUp(email, password);
      trackEvent(WEB_ANALYTICS_EVENTS.LOGIN_SIGN_UP_SUCCEEDED, { mode: "invite_sign_up" });
      // Route to dashboard (in real app, would route to onboarding for new users)
      navigate("/dashboard");
    } catch (err: any) {
      trackEvent(WEB_ANALYTICS_EVENTS.LOGIN_SIGN_IN_FAILED, { mode: "invite_sign_up" });
      setError(err.message || "Failed to join");
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
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}
