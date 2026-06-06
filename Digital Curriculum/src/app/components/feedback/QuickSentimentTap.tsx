interface SentimentOption {
  value: string;
  emoji: string;
  label: string;
}

const DEFAULT_OPTIONS: SentimentOption[] = [
  { value: "great", emoji: "😊", label: "Great" },
  { value: "okay", emoji: "😐", label: "Okay" },
  { value: "struggling", emoji: "😕", label: "Struggling" },
  { value: "frustrated", emoji: "😤", label: "Frustrated" },
];

interface QuickSentimentTapProps {
  options?: SentimentOption[];
  onSelect: (option: SentimentOption) => void;
  disabled?: boolean;
}

export function QuickSentimentTap({
  options = DEFAULT_OPTIONS,
  onSelect,
  disabled,
}: QuickSentimentTapProps) {
  return (
    <div className="flex gap-3 justify-center">
      {options.map((opt) => (
        <button
          key={opt.value}
          disabled={disabled}
          onClick={() => onSelect(opt)}
          className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
          aria-label={opt.label}
        >
          <span className="text-3xl leading-none">{opt.emoji}</span>
          <span className="text-xs text-muted-foreground font-medium">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

export type { SentimentOption };
