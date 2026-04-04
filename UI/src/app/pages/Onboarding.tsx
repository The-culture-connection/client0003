import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { SkillChip } from '../components/SkillChip';
import { CheckCircle2 } from 'lucide-react';

const availableSkills = [
  'React', 'Python', 'Design', 'Marketing', 'Sales', 'Product Management',
  'Data Science', 'iOS Development', 'Android', 'UI/UX', 'Leadership', 'Strategy'
];

const networkingGoals = [
  { id: 'mentorship', label: 'Mentorship', icon: '🎓' },
  { id: 'career', label: 'Career Growth', icon: '🚀' },
  { id: 'social', label: 'Social', icon: '🤝' },
  { id: 'collaboration', label: 'Collaboration', icon: '💡' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    gradYear: '',
    organization: '',
    skillsOffered: [] as string[],
    skillsNeeded: [] as string[],
    goals: [] as string[],
  });

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Save to localStorage for demo
      localStorage.setItem('userProfile', JSON.stringify(formData));
      navigate('/home');
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const toggleSkill = (skill: string, type: 'offered' | 'needed') => {
    const key = type === 'offered' ? 'skillsOffered' : 'skillsNeeded';
    const current = formData[key];
    setFormData({
      ...formData,
      [key]: current.includes(skill)
        ? current.filter(s => s !== skill)
        : [...current, skill],
    });
  };

  const toggleGoal = (goalId: string) => {
    setFormData({
      ...formData,
      goals: formData.goals.includes(goalId)
        ? formData.goals.filter(g => g !== goalId)
        : [...formData.goals, goalId],
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Progress Bar */}
      <div className="sticky top-0 bg-background z-10 pt-4 px-6">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground text-center mt-2">
          Step {step} of {totalSteps}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8">
        {step === 1 && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto">
              <span className="text-4xl">🎓</span>
            </div>
            <div>
              <h1 className="text-3xl mb-3">Welcome to Alumni Connect</h1>
              <p className="text-muted-foreground">
                Build meaningful connections with fellow alumni. Network, mentor, and grow together.
              </p>
            </div>
            <div className="space-y-3 text-left bg-secondary rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <h4 className="font-medium">Smart Matching</h4>
                  <p className="text-sm text-muted-foreground">Connect based on skills and goals</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <h4 className="font-medium">Community Groups</h4>
                  <p className="text-sm text-muted-foreground">Join groups aligned with your interests</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <h4 className="font-medium">Exclusive Events</h4>
                  <p className="text-sm text-muted-foreground">Access alumni-only networking events</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl mb-2">Tell us about yourself</h2>
              <p className="text-muted-foreground">We'll use this to personalize your experience</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-accent outline-none transition-colors"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block mb-2">Graduation Year</label>
                <input
                  type="text"
                  value={formData.gradYear}
                  onChange={(e) => setFormData({ ...formData, gradYear: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-accent outline-none transition-colors"
                  placeholder="e.g., 2020"
                />
              </div>
              <div>
                <label className="block mb-2">Current Organization</label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-accent outline-none transition-colors"
                  placeholder="Where do you work?"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl mb-2">Your skills</h2>
              <p className="text-muted-foreground">Select skills you can offer and skills you're looking to learn</p>
            </div>
            <div>
              <h3 className="font-medium mb-3">Skills I can offer</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {availableSkills.map((skill) => (
                  <SkillChip
                    key={skill}
                    label={skill}
                    selected={formData.skillsOffered.includes(skill)}
                    onClick={() => toggleSkill(skill, 'offered')}
                  />
                ))}
              </div>
              <h3 className="font-medium mb-3">Skills I need</h3>
              <div className="flex flex-wrap gap-2">
                {availableSkills.map((skill) => (
                  <SkillChip
                    key={skill}
                    label={skill}
                    selected={formData.skillsNeeded.includes(skill)}
                    onClick={() => toggleSkill(skill, 'needed')}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl mb-2">Networking goals</h2>
              <p className="text-muted-foreground">What are you looking to achieve?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {networkingGoals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className={`p-6 rounded-2xl border-2 transition-all ${
                    formData.goals.includes(goal.id)
                      ? 'border-accent bg-accent/5'
                      : 'border-border hover:border-muted'
                  }`}
                >
                  <div className="text-4xl mb-2">{goal.icon}</div>
                  <div className="font-medium">{goal.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 bg-background border-t border-border p-6">
        <div className="flex gap-3">
          {step > 1 && (
            <Button onClick={handleBack} variant="outline" className="flex-1">
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            variant="primary"
            className="flex-1"
            disabled={
              (step === 2 && (!formData.name || !formData.gradYear || !formData.organization)) ||
              (step === 3 && formData.skillsOffered.length === 0 && formData.skillsNeeded.length === 0) ||
              (step === 4 && formData.goals.length === 0)
            }
          >
            {step === totalSteps ? 'Join the Network' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
