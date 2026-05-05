import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../lib/auth-context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Chrome } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithEmail, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      await signInWithGoogle();
      navigate('/onboarding');
    } catch (err) {
      setError('Failed to sign in with Google');
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError('');
      await signInWithEmail(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to sign in');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafcfc] p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#1d1d1d] mb-2">MORTAR</h1>
          <p className="text-[#1d1d1d]/60">Welcome back to your entrepreneurial journey</p>
        </div>

        <Card className="border-[#1d1d1d]/10">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1d1d1d]">Sign In</CardTitle>
            <CardDescription>
              Access your learning dashboard and community
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Google Sign In */}
            <Button
              type="button"
              variant="outline"
              className="w-full border-[#1d1d1d]/20 hover:bg-[#1d1d1d]/5"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <Chrome className="w-5 h-5 mr-2" />
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#1d1d1d]/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-[#1d1d1d]/60">Or continue with email</span>
              </div>
            </div>

            {/* Email Sign In Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="border-[#1d1d1d]/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="border-[#1d1d1d]/20"
                />
              </div>

              {error && (
                <div className="text-sm text-[#871002] bg-[#871002]/10 p-3 rounded">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#871002] hover:bg-[#871002]/90 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="text-center text-sm">
              <Link to="/forgot-password" className="text-[#871002] hover:underline">
                Forgot your password?
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-center text-[#1d1d1d]/60">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#871002] hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Demo Notice */}
        <div className="mt-6 p-4 bg-[#1d1d1d]/5 rounded-lg text-center">
          <p className="text-xs text-[#1d1d1d]/60">
            <strong>Demo Mode:</strong> This is a prototype. Any email/password will work.
          </p>
        </div>
      </div>
    </div>
  );
}