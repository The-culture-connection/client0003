import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Shield, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "../components/auth/AuthProvider";
import { useAdminViewMode } from "../contexts/AdminViewModeContext";

export function AdminAuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setAdminViewMode } = useAdminViewMode();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Admin password - In production, this should be stored securely (environment variable or backend)
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "mortar2024";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password.trim()) {
      setError("Please enter the admin password");
      return;
    }

    setLoading(true);
    
    // Simulate authentication check (in production, verify against backend)
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        // Store admin auth in sessionStorage
        sessionStorage.setItem("admin_authenticated", "true");
        sessionStorage.setItem("admin_auth_time", Date.now().toString());
        setAdminViewMode("admin");
        navigate("/admin");
      } else {
        setError("Invalid password. Please try again.");
        setPassword("");
      }
      setLoading(false);
    }, 500);
  };

  // Check if user has admin access (superAdmin or Admin)
  const hasAdminAccess = user?.roles?.some(
    (r) => String(r).trim().toLowerCase() === "superadmin" || String(r).trim().toLowerCase() === "admin"
  );

  // Check if already authenticated and redirect
  useEffect(() => {
    if (hasAdminAccess) {
      const isAdminAuthenticated = sessionStorage.getItem("admin_authenticated");
      const authTime = sessionStorage.getItem("admin_auth_time");
      
      if (isAdminAuthenticated && authTime) {
        const timeDiff = Date.now() - parseInt(authTime);
        const eightHours = 8 * 60 * 60 * 1000;
        
        if (timeDiff < eightHours) {
          setAdminViewMode("admin");
          navigate("/admin", { replace: true });
        } else {
          // Session expired, clear it
          sessionStorage.removeItem("admin_authenticated");
          sessionStorage.removeItem("admin_auth_time");
        }
      }
    }
  }, [hasAdminAccess, navigate, setAdminViewMode]);

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              You do not have permission to access the admin panel.
            </p>
            <Button onClick={() => navigate("/dashboard")} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Admin Authentication</h1>
          <p className="text-sm text-muted-foreground">
            Please enter the admin password to access the admin panel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              Admin Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className="pl-10"
                autoFocus
                disabled={loading}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Authenticate
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="w-full text-muted-foreground"
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
