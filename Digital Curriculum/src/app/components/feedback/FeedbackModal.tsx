import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { ReactionChipPanel, type ReactionChip } from "./ReactionChipPanel";
import { QuickSentimentTap, type SentimentOption } from "./QuickSentimentTap";
import { EmotionalSlider } from "./EmotionalSlider";
import { trackImplicitFeedback, trackFeedbackDismissed } from "../../analytics/trackImplicitFeedback";
import type { FeedbackContextType } from "../../analytics/trackImplicitFeedback";
import { CheckCircle2 } from "lucide-react";

const CONTEXT_CONFIG: Record<
  FeedbackContextType,
  {
    prompt: string;
    component: "chips" | "sentiment" | "slider";
    chips?: ReactionChip[];
  }
> = {
  lesson: {
    prompt: "How's this lesson going?",
    component: "chips",
    chips: [
      { value: "helpful", label: "Helpful", emoji: "👍" },
      { value: "confusing", label: "Confusing", emoji: "🤔" },
      { value: "too_fast", label: "Too Fast", emoji: "⚡" },
      { value: "just_right", label: "Just Right", emoji: "✅" },
    ],
  },
  quiz: {
    prompt: "What made this tricky?",
    component: "chips",
    chips: [
      { value: "examples_unclear", label: "Examples unclear", emoji: "❓" },
      { value: "moved_too_fast", label: "Moved too fast", emoji: "⚡" },
      { value: "need_more_practice", label: "Need more practice", emoji: "🔄" },
      { value: "question_confusing", label: "Question confusing", emoji: "😕" },
    ],
  },
  checkout: {
    prompt: "What stopped you?",
    component: "chips",
    chips: [
      { value: "price", label: "Price", emoji: "💰" },
      { value: "just_browsing", label: "Just browsing", emoji: "👀" },
      { value: "need_more_info", label: "Need more info", emoji: "📋" },
      { value: "not_ready", label: "Not ready yet", emoji: "⏰" },
    ],
  },
  navigation: {
    prompt: "Did you find what you needed?",
    component: "sentiment",
  },
  community: {
    prompt: "How comfortable do you feel here?",
    component: "slider",
  },
  general: {
    prompt: "How are you feeling about MORTAR?",
    component: "sentiment",
  },
};

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  context_type: FeedbackContextType;
  trigger_event: string;
  metadata?: {
    lesson_id?: string;
    course_id?: string;
    slide_index?: number;
    quiz_attempt_count?: number;
  };
}

export function FeedbackModal({
  open,
  onClose,
  context_type,
  trigger_event,
  metadata,
}: FeedbackModalProps) {
  const [submitted, setSubmitted] = useState(false);

  const config = CONTEXT_CONFIG[context_type] ?? CONTEXT_CONFIG.general;

  function handleClose(responded: boolean) {
    if (!responded && !submitted) {
      trackFeedbackDismissed(context_type, trigger_event);
    }
    setSubmitted(false);
    onClose();
  }

  function handleReactionSelect(chip: ReactionChip) {
    trackImplicitFeedback({
      context_type,
      trigger_event,
      response: { type: "reaction", value: chip.value, label: chip.label },
      metadata,
    });
    setSubmitted(true);
    setTimeout(() => handleClose(true), 1200);
  }

  function handleSentimentSelect(opt: SentimentOption) {
    trackImplicitFeedback({
      context_type,
      trigger_event,
      response: { type: "sentiment", value: opt.value, label: opt.label },
      metadata,
    });
    setSubmitted(true);
    setTimeout(() => handleClose(true), 1200);
  }

  function handleSliderSubmit(value: number, label: string) {
    trackImplicitFeedback({
      context_type,
      trigger_event,
      response: { type: "slider", value, label },
      metadata,
    });
    setSubmitted(true);
    setTimeout(() => handleClose(true), 1200);
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose(false); }}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-h-[55vh]">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base font-semibold text-center">
            {submitted ? "Thanks for sharing! 🙏" : config.prompt}
          </SheetTitle>
        </SheetHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
            <p className="text-sm text-muted-foreground">Your feedback helps us improve.</p>
          </div>
        ) : (
          <div className="px-2">
            {config.component === "chips" && config.chips && (
              <ReactionChipPanel chips={config.chips} onSelect={handleReactionSelect} />
            )}
            {config.component === "sentiment" && (
              <QuickSentimentTap onSelect={handleSentimentSelect} />
            )}
            {config.component === "slider" && (
              <EmotionalSlider onSubmit={handleSliderSubmit} />
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
