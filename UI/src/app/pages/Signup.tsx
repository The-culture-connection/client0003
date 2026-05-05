import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../lib/auth-context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Chrome } from 'lucide-react';
import { Checkbox } from '../components/ui/checkbox';

export function Signup() {
  const navigate = useNavigate();
  const { signInWithGoogle, signUpWithEmail, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      await signInWithGoogle();
      navigate('/onboarding');
    } catch (err) {
      setError('Failed to sign up with Google');
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!agreeToTerms) {
      setError('Please agree to the Terms of Service');
      return;
    }

    try {
      setError('');
      await signUpWithEmail(email, password, name);
      navigate('/onboarding');
    } catch (err) {
      setError('Failed to create account');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafcfc] p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#1d1d1d] mb-2">MORTAR</h1>
          <p className="text-[#1d1d1d]/60">Join the entrepreneurial community</p>
        </div>

        <Card className="border-[#1d1d1d]/10">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1d1d1d]">Create Account</CardTitle>
            <CardDescription>
              Start your journey to business mastery
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Google Sign Up */}
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
                <span className="bg-white px-2 text-[#1d1d1d]/60">Or sign up with email</span>
              </div>
            </div>

            {/* Email Sign Up Form */}
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jordan Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="border-[#1d1d1d]/20"
                />
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="border-[#1d1d1d]/20"
                />
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreeToTerms}
                  onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                  disabled={isLoading}
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-[#1d1d1d]/60 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I agree to the{' '}
                  <a href="#" className="text-[#871002] hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-[#871002] hover:underline">
                    Privacy Policy
                  </a>
                </label>
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
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-center text-[#1d1d1d]/60">
              Already have an account?{' '}
              <Link to="/login" className="text-[#871002] hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Demo Notice */}
        <div className="mt-6 p-4 bg-[#1d1d1d]/5 rounded-lg text-center">
          <p className="text-xs text-[#1d1d1d]/60">
            <strong>Demo Mode:</strong> This is a prototype. Any information will work.
          </p>
        </div>
      </div>
    </div>
  );
}