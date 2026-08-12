import { useState } from "react";
import { Compass } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Slider } from "../ui/slider";
import { Label } from "../ui/label";

interface Step4WorkStructureProps {
  workStructure: {
    flexibility?: number;
    weekly_hours?: number;
    ownership?: number;
  };
  onUpdate: (workStructure: {
    flexibility?: number;
    weekly_hours?: number;
    ownership?: number;
  }) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step4WorkStructure({
  workStructure,
  onUpdate,
  onNext,
  onBack,
}: Step4WorkStructureProps) {
  const [flexibility, setFlexibility] = useState<number>(workStructure.flexibility || 5);
  const [weeklyHours, setWeeklyHours] = useState<number>(workStructure.weekly_hours || 40);
  const [ownership, setOwnership] = useState<number>(workStructure.ownership || 5);

  const handleFlexibilityChange = (value: number[]) => {
    const newValue = value[0];
    setFlexibility(newValue);
    onUpdate({ flexibility: newValue, weekly_hours: weeklyHours, ownership });
  };

  const handleHoursChange = (value: number[]) => {
    const newValue = value[0];
    setWeeklyHours(newValue);
    onUpdate({ flexibility, weekly_hours: newValue, ownership });
  };

  const handleOwnershipChange = (value: number[]) => {
    const newValue = value[0];
    setOwnership(newValue);
    onUpdate({ flexibility, weekly_hours: weeklyHours, ownership: newValue });
  };

  const getFlexibilityLabel = (value: number) => {
    if (value <= 2) return "Strict 9-5";
    if (value <= 4) return "Mostly structured";
    if (value <= 6) return "Some flexibility";
    if (value <= 8) return "Very flexible";
    return "No set schedule";
  };

  const getOwnershipLabel = (value: number) => {
    if (value <= 2) return "Employee";
    if (value <= 4) return "Contractor/Freelancer";
    if (value <= 6) return "Co-founder/Partner";
    if (value <= 8) return "Majority owner";
    return "Full company owner";
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-8">
        <div className="mb-4 flex items-start gap-3 rounded-lg border-2 border-mortar-brick/70 bg-mortar-brick/10 p-4">
          <Compass className="w-6 h-6 text-mortar-brick shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="font-bold text-foreground uppercase tracking-wide text-sm">
              How you want to work
            </p>
            <p className="text-sm text-foreground/80 mt-1">
              There are no wrong answers here — drag each slider to where you'd like your
              work life to be, not where it is today. We use this to tailor your curriculum
              and to match you with alumni, mentors, and opportunities that fit the way you
              want to build.
            </p>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">What is your ideal work structure?</h1>
        <p className="text-muted-foreground">Adjust the sliders to match your preferences</p>
      </div>

      <Card className="p-6 space-y-8">
        {/* Flexibility */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-foreground font-semibold">Flexibility</Label>
            <span className="text-sm text-muted-foreground">{getFlexibilityLabel(flexibility)}</span>
          </div>
          <p className="text-xs text-muted-foreground">How structured do you want your schedule to be?</p>
          <Slider
            value={[flexibility]}
            onValueChange={handleFlexibilityChange}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 - Strict 9-5</span>
            <span>10 - No set schedule</span>
          </div>
        </div>

        {/* Weekly Hours */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-foreground font-semibold">Weekly Hours</Label>
            <span className="text-sm text-muted-foreground">{weeklyHours} hours/week</span>
          </div>
          <p className="text-xs text-muted-foreground">How many hours a week do you want to put into your work?</p>
          <Slider
            value={[weeklyHours]}
            onValueChange={handleHoursChange}
            min={20}
            max={80}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>20 hours</span>
            <span>80 hours</span>
          </div>
        </div>

        {/* Ownership */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-foreground font-semibold">Ownership</Label>
            <span className="text-sm text-muted-foreground">{getOwnershipLabel(ownership)}</span>
          </div>
          <p className="text-xs text-muted-foreground">How much of the business you work in do you want to own?</p>
          <Slider
            value={[ownership]}
            onValueChange={handleOwnershipChange}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 - Employee</span>
            <span>10 - Company owner</span>
          </div>
        </div>
      </Card>

      <div className="mt-8 flex justify-between">
        <Button onClick={onBack} variant="outline">
          Back
        </Button>
        <Button
          onClick={onNext}
          className="bg-mortar-brick hover:bg-mortar-brick/90 text-white font-bold"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
