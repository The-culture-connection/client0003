import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../lib/auth-context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { UserRole } from '../lib/store';

export function Onboarding() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user?.name || '');
  const [city, setCity] = useState('');
  const [cohort, setCohort] = useState('');
  const [role, setRole] = useState<UserRole>('digital-student');

  const handleComplete = () => {
    // Update user profile using auth context
    updateUser({
      name,
      city,
      cohort,
      role,
      completedBusinessProfile: true,
    });
    navigate('/dashboard');
  };

  const totalSteps = 3;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafcfc] p-4">
      <div className="w-full max-w-2xl">
        {/* Logo & Progress */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#1d1d1d] mb-4">MORTAR</h1>
          <div className="flex items-center justify-center gap-2 mb-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  s <= step
                    ? 'w-16 bg-[#871002]'
                    : 'w-8 bg-[#1d1d1d]/20'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-[#1d1d1d]/60">
            Step {step} of {totalSteps}
          </p>
        </div>

        <Card className="border-[#1d1d1d]/10">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1d1d1d]">
              {step === 1 && 'Welcome to MORTAR'}
              {step === 2 && 'Tell us about yourself'}
              {step === 3 && 'Choose your path'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Let\'s get you set up for success'}
              {step === 2 && 'Help us personalize your experience'}
              {step === 3 && 'Select your membership type'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Jordan Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-[#1d1d1d]/20"
                  />
                </div>

                <div className="p-4 bg-[#1d1d1d]/5 rounded-lg">
                  <h3 className="font-medium text-[#1d1d1d] mb-2">What to expect:</h3>
                  <ul className="space-y-2 text-sm text-[#1d1d1d]/70">
                    <li className="flex items-start gap-2">
                      <span className="text-[#871002]">✓</span>
                      <span>Structured curriculum with video lessons and quizzes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#871002]">✓</span>
                      <span>Build real business assets in your Data Room</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#871002]">✓</span>
                      <span>Connect with entrepreneurs in your city</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#871002]">✓</span>
                      <span>Earn badges and track your progress</span>
                    </li>
                  </ul>
                </div>

                <Button
                  onClick={() => setStep(2)}
                  disabled={!name}
                  className="w-full bg-[#871002] hover:bg-[#871002]/90 text-white"
                >
                  Continue
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger className="border-[#1d1d1d]/20">
                      <SelectValue placeholder="Select your city" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cincinnati">Cincinnati, OH</SelectItem>
                      <SelectItem value="Detroit">Detroit, MI</SelectItem>
                      <SelectItem value="Indianapolis">Indianapolis, IN</SelectItem>
                      <SelectItem value="Louisville">Louisville, KY</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cohort">Cohort (Optional)</Label>
                  <Select value={cohort} onValueChange={setCohort}>
                    <SelectTrigger className="border-[#1d1d1d]/20">
                      <SelectValue placeholder="Select your cohort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2026-Spring">2026 Spring</SelectItem>
                      <SelectItem value="2026-Fall">2026 Fall</SelectItem>
                      <SelectItem value="2025-Spring">2025 Spring</SelectItem>
                      <SelectItem value="2025-Fall">2025 Fall</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#1d1d1d]/60">
                    Select if you're part of an in-person cohort
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 border-[#1d1d1d]/20"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!city}
                    className="flex-1 bg-[#871002] hover:bg-[#871002]/90 text-white"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div
                    onClick={() => setRole('in-person-alumni')}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      role === 'in-person-alumni'
                        ? 'border-[#871002] bg-[#871002]/5'
                        : 'border-[#1d1d1d]/20 hover:border-[#1d1d1d]/40'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-[#1d1d1d]">In-Person Alumni</h3>
                      <Badge className="bg-[#871002] text-white">FREE</Badge>
                    </div>
                    <p className="text-sm text-[#1d1d1d]/70 mb-2">
                      Completed an in-person MORTAR program
                    </p>
                    <ul className="text-xs text-[#1d1d1d]/60 space-y-1">
                      <li>✓ Full access to all curriculum</li>
                      <li>✓ Alumni network & events</li>
                      <li>✓ Create groups & post opportunities</li>
                    </ul>
                  </div>

                  <div
                    onClick={() => setRole('digital-alumni')}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      role === 'digital-alumni'
                        ? 'border-[#871002] bg-[#871002]/5'
                        : 'border-[#1d1d1d]/20 hover:border-[#1d1d1d]/40'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-[#1d1d1d]">Digital Alumni</h3>
                      <Badge variant="outline" className="border-[#1d1d1d]/20">PAID</Badge>
                    </div>
                    <p className="text-sm text-[#1d1d1d]/70 mb-2">
                      Completed paid digital curriculum
                    </p>
                    <ul className="text-xs text-[#1d1d1d]/60 space-y-1">
                      <li>✓ Access to purchased bundles</li>
                      <li>✓ Alumni network access</li>
                      <li>✓ Community participation</li>
                    </ul>
                  </div>

                  <div
                    onClick={() => setRole('digital-student')}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      role === 'digital-student'
                        ? 'border-[#871002] bg-[#871002]/5'
                        : 'border-[#1d1d1d]/20 hover:border-[#1d1d1d]/40'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-[#1d1d1d]">Digital Student</h3>
                      <Badge variant="outline" className="border-[#1d1d1d]/20">PAID</Badge>
                    </div>
                    <p className="text-sm text-[#1d1d1d]/70 mb-2">
                      New to MORTAR, starting digital curriculum
                    </p>
                    <ul className="text-xs text-[#1d1d1d]/60 space-y-1">
                      <li>✓ Purchase curriculum bundles</li>
                      <li>✓ Community participation</li>
                      <li>✓ Track progress & earn badges</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1 border-[#1d1d1d]/20"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleComplete}
                    className="flex-1 bg-[#871002] hover:bg-[#871002]/90 text-white"
                  >
                    Complete Setup
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}