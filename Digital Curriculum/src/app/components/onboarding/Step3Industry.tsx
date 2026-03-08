import { useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { INDUSTRIES, type Industry } from "../../lib/onboardingData";

interface Step3IndustryProps {
  selectedIndustry: Industry | undefined;
  onUpdate: (industry: Industry) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step3Industry({
  selectedIndustry,
  onUpdate,
  onNext,
  onBack,
}: Step3IndustryProps) {
  const [industry, setIndustry] = useState<Industry | undefined>(selectedIndustry);

  const handleChange = (value: string) => {
    const selected = value as Industry;
    setIndustry(selected);
    onUpdate(selected);
  };

  const canContinue = !!industry;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">What industry are you in?</h1>
        <p className="text-muted-foreground">Select one (required)</p>
      </div>

      <Card className="p-6">
        <RadioGroup value={industry} onValueChange={handleChange} className="space-y-3">
          {INDUSTRIES.map((ind) => (
            <div key={ind} className="flex items-center space-x-2">
              <RadioGroupItem value={ind} id={ind} />
              <Label htmlFor={ind} className="cursor-pointer text-foreground">
                {ind}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </Card>

      <div className="mt-8 flex justify-between">
        <Button onClick={onBack} variant="outline">
          Back
        </Button>
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
