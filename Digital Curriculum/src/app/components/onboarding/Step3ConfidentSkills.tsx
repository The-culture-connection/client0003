import { useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { SKILL_CATEGORIES, ALL_SKILLS, type SkillCategory } from "../../lib/onboardingData";

interface Step3ConfidentSkillsProps {
  selectedSkills: string[];
  onUpdate: (skills: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step3ConfidentSkills({
  selectedSkills,
  onUpdate,
  onNext,
  onBack,
}: Step3ConfidentSkillsProps) {
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
        <h1 className="text-3xl font-bold text-foreground mb-2">What skills are you confident in?</h1>
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
                        id={`confident-${skill}`}
                        checked={skills.includes(skill)}
                        onCheckedChange={() => toggleSkill(skill)}
                        className="mt-1"
                      />
                      <label
                        htmlFor={`confident-${skill}`}
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
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
