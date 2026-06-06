import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { FeedbackContextType } from "../analytics/trackImplicitFeedback";

interface FeedbackMeta {
  lesson_id?: string;
  course_id?: string;
  slide_index?: number;
  quiz_attempt_count?: number;
}

interface FeedbackContextState {
  context_type: FeedbackContextType;
  trigger_event: string;
  metadata: FeedbackMeta;
  /** When true the widget re-pulses briefly to re-attract attention. */
  repulse: boolean;
}

interface FeedbackContextValue {
  feedbackState: FeedbackContextState;
  setFeedbackContext(opts: {
    context_type: FeedbackContextType;
    trigger_event?: string;
    metadata?: FeedbackMeta;
  }): void;
  clearFeedbackContext(): void;
  triggerRepulse(): void;
  clearRepulse(): void;
  /** Whether the feedback modal is open. */
  isOpen: boolean;
  openModal(): void;
  closeModal(): void;
}

const DEFAULT_STATE: FeedbackContextState = {
  context_type: "general",
  trigger_event: "implicit_feedback_shown",
  metadata: {},
  repulse: false,
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [feedbackState, setFeedbackState] = useState<FeedbackContextState>(DEFAULT_STATE);
  const [isOpen, setIsOpen] = useState(false);

  const setFeedbackContext = useCallback(
    (opts: { context_type: FeedbackContextType; trigger_event?: string; metadata?: FeedbackMeta }) => {
      setFeedbackState((prev) => ({
        ...prev,
        context_type: opts.context_type,
        trigger_event: opts.trigger_event ?? `${opts.context_type}_feedback_shown`,
        metadata: opts.metadata ?? {},
      }));
    },
    []
  );

  const clearFeedbackContext = useCallback(() => {
    setFeedbackState(DEFAULT_STATE);
  }, []);

  const triggerRepulse = useCallback(() => {
    setFeedbackState((prev) => ({ ...prev, repulse: true }));
  }, []);

  const clearRepulse = useCallback(() => {
    setFeedbackState((prev) => ({ ...prev, repulse: false }));
  }, []);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({
      feedbackState,
      setFeedbackContext,
      clearFeedbackContext,
      triggerRepulse,
      clearRepulse,
      isOpen,
      openModal,
      closeModal,
    }),
    [feedbackState, setFeedbackContext, clearFeedbackContext, triggerRepulse, clearRepulse, isOpen, openModal, closeModal]
  );

  return <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>;
}

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error("useFeedback must be used within FeedbackProvider");
  }
  return ctx;
}
