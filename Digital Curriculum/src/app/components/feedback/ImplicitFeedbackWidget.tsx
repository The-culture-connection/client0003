/**
 * Persistent floating feedback button.
 *
 * First appearance: pulses for 8 seconds to attract attention.
 * After 8s (or after session has seen it): static button, always visible.
 * Repulse: re-triggers a 3s pulse when meaningful context changes
 * (e.g. lesson abandonment, quiz confusion).
 */

import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useFeedback } from "../../contexts/FeedbackContext";
import { FeedbackModal } from "./FeedbackModal";
import { trackFeedbackShown } from "../../analytics/trackImplicitFeedback";

const PULSED_STORAGE_KEY = "mortar_feedback_widget_pulsed";
const INITIAL_PULSE_DURATION_MS = 8_000;
const REPULSE_DURATION_MS = 3_000;

export function ImplicitFeedbackWidget() {
  const { feedbackState, isOpen, openModal, closeModal, clearRepulse } = useFeedback();

  const [showPulse, setShowPulse] = useState(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: decide whether to start the initial pulse
  useEffect(() => {
    const alreadyPulsed = (() => {
      try {
        return sessionStorage.getItem(PULSED_STORAGE_KEY) === "1";
      } catch {
        return false;
      }
    })();

    if (!alreadyPulsed) {
      setShowPulse(true);
      pulseTimerRef.current = setTimeout(() => {
        setShowPulse(false);
        try {
          sessionStorage.setItem(PULSED_STORAGE_KEY, "1");
        } catch {
          /* ignore */
        }
      }, INITIAL_PULSE_DURATION_MS);
    }

    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, []);

  // Repulse when context changes and repulse flag is set
  useEffect(() => {
    if (!feedbackState.repulse) return;

    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    setShowPulse(true);
    clearRepulse();

    pulseTimerRef.current = setTimeout(() => {
      setShowPulse(false);
    }, REPULSE_DURATION_MS);

    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, [feedbackState.repulse, clearRepulse]);

  function handleButtonClick() {
    trackFeedbackShown(feedbackState.context_type, feedbackState.trigger_event);
    openModal();
  }

  return (
    <>
      {/* Floating button — fixed bottom-right, always visible */}
      <div className="fixed bottom-6 right-6 z-50" aria-label="Share feedback">
        <div className="relative flex items-center justify-center">
          {/* Pulse ring — only shown during pulse window */}
          {showPulse && (
            <span
              className="absolute inline-flex h-full w-full rounded-full bg-primary/40 animate-ping"
              aria-hidden
            />
          )}
          <button
            onClick={handleButtonClick}
            className="relative flex items-center justify-center w-12 h-12 rounded-full bg-primary shadow-lg hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Share feedback"
            title="Share feedback"
          >
            <MessageCircle className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>
      </div>

      {/* Feedback sheet modal */}
      <FeedbackModal
        open={isOpen}
        onClose={closeModal}
        context_type={feedbackState.context_type}
        trigger_event={feedbackState.trigger_event}
        metadata={feedbackState.metadata}
      />
    </>
  );
}
