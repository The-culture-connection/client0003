import { useState, useEffect, FormEvent } from "react";
import { Lock } from "lucide-react";

interface PasswordGateProps {
  children: React.ReactNode;
}

export function PasswordGate({ children }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem("mortar_authenticated");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password === "Mortar2026") {
      setIsAuthenticated(true);
      sessionStorage.setItem("mortar_authenticated", "true");
      setError(false);
    } else {
      setError(true);
      setPassword("");
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#1d1d1d] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#fafcfc] rounded-lg shadow-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#871002] rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-[#fafcfc]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1d1d1d] mb-2">Mortar</h1>
            <p className="text-sm text-[#1d1d1d]/60 text-center">
              Enter password to access the platform
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#1d1d1d] mb-2"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                className="w-full px-4 py-3 border border-[#1d1d1d]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#871002] bg-white"
                placeholder="Enter password"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-[#871002]">
                  Incorrect password. Please try again.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-[#871002] text-[#fafcfc] py-3 rounded-lg font-medium hover:bg-[#6b0d02] transition-colors"
            >
              Access Platform
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
