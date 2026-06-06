import { useState } from "react";
import { Slider } from "../ui/slider";
import { Button } from "../ui/button";

const SLIDER_LABELS: Record<number, { emoji: string; label: string }> = {
  1: { emoji: "😩", label: "Overwhelmed" },
  2: { emoji: "😕", label: "Struggling" },
  3: { emoji: "😐", label: "Neutral" },
  4: { emoji: "🙂", label: "Confident" },
  5: { emoji: "🚀", label: "Thriving" },
};

interface EmotionalSliderProps {
  onSubmit: (value: number, label: string) => void;
  disabled?: boolean;
}

export function EmotionalSlider({ onSubmit, disabled }: EmotionalSliderProps) {
  const [value, setValue] = useState(3);
  const current = SLIDER_LABELS[value] ?? SLIDER_LABELS[3];

  return (
    <div className="flex flex-col items-center gap-4 w-full px-2">
      <div className="text-center">
        <span className="text-4xl">{current.emoji}</span>
        <p className="text-sm font-medium text-foreground mt-1">{current.label}</p>
      </div>
      <div className="w-full px-2">
        <Slider
          min={1}
          max={5}
          step={1}
          value={[value]}
          onValueChange={([v]) => setValue(v)}
          disabled={disabled}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-0.5">
          <span>Overwhelmed</span>
          <span>Thriving</span>
        </div>
      </div>
      <Button
        size="sm"
        onClick={() => onSubmit(value, current.label)}
        disabled={disabled}
        className="mt-1"
      >
        Submit
      </Button>
    </div>
  );
}
