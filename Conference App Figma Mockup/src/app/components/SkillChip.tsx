import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface SkillChipProps {
  label: string;
  selected?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  variant?: 'offer' | 'need' | 'default';
}

export function SkillChip({ label, selected, onRemove, onClick, variant = 'default' }: SkillChipProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all',
        onClick && 'cursor-pointer',
        {
          'bg-primary text-primary-foreground': selected,
          'bg-secondary text-secondary-foreground hover:bg-muted': !selected && variant === 'default',
          'bg-green-50 text-green-700 border border-green-200': variant === 'offer',
          'bg-amber-50 text-amber-700 border border-amber-200': variant === 'need',
        }
      )}
    >
      <span>{label}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
