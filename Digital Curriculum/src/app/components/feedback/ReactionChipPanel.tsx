import { Button } from "../ui/button";

export interface ReactionChip {
  value: string;
  label: string;
  emoji?: string;
}

interface ReactionChipPanelProps {
  chips: ReactionChip[];
  onSelect: (chip: ReactionChip) => void;
  disabled?: boolean;
}

export function ReactionChipPanel({ chips, onSelect, disabled }: ReactionChipPanelProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {chips.map((chip) => (
        <Button
          key={chip.value}
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onSelect(chip)}
          className="rounded-full text-sm font-medium px-4 py-2 hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          {chip.emoji && <span className="mr-1.5">{chip.emoji}</span>}
          {chip.label}
        </Button>
      ))}
    </div>
  );
}
