import { useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { BUSINESS_GOALS, type BusinessGoal } from "../../lib/onboardingData";

interface Step2GoalsProps {
  selectedGoals: BusinessGoal[];
  onUpdate: (goals: BusinessGoal[]) => void;
  onNext: () => void;
}

export function Step2Goals({ selectedGoals, onUpdate, onNext }: Step2GoalsProps) {
  const [goals, setGoals] = useState<BusinessGoal[]>(selectedGoals);

  const toggleGoal = (goal: BusinessGoal) => {
    const newGoals = goals.includes(goal)
      ? goals.filter((g) => g !== goal)
      : [...goals, goal];
    setGoals(newGoals);
    onUpdate(newGoals);
  };

  const canContinue = goals.length > 0;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Step 2: How can we help your business grow?</h1>
        <p className="text-muted-foreground">Select all that apply (required)</p>
      </div>

      <Card className="p-6 space-y-4">
        {BUSINESS_GOALS.map((goal) => (
          <div key={goal} className="flex items-start space-x-3">
            <Checkbox
              id={goal}
              checked={goals.includes(goal)}
              onCheckedChange={() => toggleGoal(goal)}
              className="mt-1"
            />
            <label
              htmlFor={goal}
              className="flex-1 text-foreground cursor-pointer leading-relaxed"
            >
              {goal}
            </label>
          </div>
        ))}
      </Card>

      <div className="mt-8 flex justify-end">
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
