/**
 * Simple emoji grid picker for slide popups and text fields
 */

import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Smile } from "lucide-react";

const COMMON_EMOJIS = [
  "😀", "😊", "🎉", "💡", "✅", "❤️", "🔥", "⭐",
  "👍", "👏", "🚀", "📌", "💪", "🎯", "📚", "✨",
  "🤔", "⚠️", "❓", "💬", "🏆", "🎓", "💼", "🌟",
];

interface EmojiPickerProps {
  value?: string;
  onSelect: (emoji: string) => void;
  triggerLabel?: string;
  size?: "sm" | "default";
}

export function EmojiPicker({
  value,
  onSelect,
  triggerLabel = "Pick emoji",
  size = "default",
}: EmojiPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size === "sm" ? "sm" : "default"}
          className="gap-1"
        >
          {value ? (
            <span className="text-lg leading-none">{value}</span>
          ) : (
            <Smile className="w-4 h-4" />
          )}
          <span className="text-xs">{value ? "Change" : triggerLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 z-[200]" align="start">
        <div className="grid grid-cols-8 gap-1">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="text-xl p-1 rounded hover:bg-accent transition-colors"
              onClick={() => onSelect(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
