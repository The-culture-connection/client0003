import { useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Rocket } from "lucide-react";
import { SKILL_CATEGORIES, ALL_SKILLS, type SkillCategory } from "../../lib/onboardingData";

interface Step3DesiredSkillsProps {
  selectedSkills: string[];
  onUpdate: (skills: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step3DesiredSkills({
  selectedSkills,
  onUpdate,
  onNext,
  onBack,
}: Step3DesiredSkillsProps) {
  const [skills, setSkills] = useState<string[]>(selectedSkills);
  const [expandedCategory, setExpandedCategory] = useState<SkillCategory | null>(null);

  const toggleSkill = (skill: string) => {
    const newSkills = skills.includes(skill)
      ? skills.filter((s) => s !== skill)
      : [...skills, skill];
    setSkills(newSkills);
    onUpdate(newSkills);
  };

  const canContinue = skills.length >= 3;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <div className="mb-4 flex items-start gap-3 rounded-lg border-2 border-mortar-yellow/70 bg-mortar-yellow/10 p-4">
          <Rocket className="w-6 h-6 text-mortar-yellow shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="font-bold text-foreground uppercase tracking-wide text-sm">
              Skills you WANT TO LEARN — different from the last step!
            </p>
            <p className="text-sm text-foreground/80 mt-1">
              The previous step was what you already know. This one is what you'd like to grow into —
              it shapes what we teach you and powers the matching algorithm in the alumni app.
            </p>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">What skills do you want to acquire?</h1>
        <p className="text-muted-foreground">Select a minimum of 3 skills (required)</p>
        <p className="text-sm text-muted-foreground mt-1">
          Selected: {skills.length} {skills.length === 1 ? "skill" : "skills"}
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(SKILL_CATEGORIES).map(([category, data]) => {
          const isExpanded = expandedCategory === category;
          const categorySkills = ALL_SKILLS.filter((s) => s.category === category);

          return (
            <Card key={category} className="p-6">
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : (category as SkillCategory))}
                className="w-full text-left flex items-center justify-between mb-2"
              >
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{category}</h3>
                  <p className="text-sm text-muted-foreground">{data.description}</p>
                </div>
                <span className="text-muted-foreground">
                  {isExpanded ? "−" : "+"}
                </span>
              </button>

              {isExpanded && (
                <div className="mt-4 space-y-3 pl-4 border-l-2 border-border">
                  {categorySkills.map(({ skill }) => (
                    <div key={skill} className="flex items-start space-x-3">
                      <Checkbox
                        id={`desired-${skill}`}
                        checked={skills.includes(skill)}
                        onCheckedChange={() => toggleSkill(skill)}
                        className="mt-1 border-white/50 data-[state=checked]:bg-mortar-brick data-[state=checked]:border-mortar-brick data-[state=checked]:text-white"
                      />
                      <label
                        htmlFor={`desired-${skill}`}
                        className="flex-1 text-foreground cursor-pointer"
                      >
                        {skill}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="mt-8 flex justify-between">
        <Button onClick={onBack} variant="outline">
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="bg-mortar-brick hover:bg-mortar-brick/90 text-white font-bold"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
