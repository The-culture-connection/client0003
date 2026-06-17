/**
 * Track implicit / survey feedback: fires an analytics event AND persists to
 * survey_responses via the writeSurveyResponse callable.
 * Failures are silent — never throws to callers.
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import { trackEvent } from "./trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";
import { getOrCreateAnalyticsSessionId } from "./session";
import { getActiveScreenName } from "./screenSession";

export type FeedbackContextType =
  | "lesson"
  | "quiz"
  | "checkout"
  | "navigation"
  | "community"
  | "general";

export interface ImplicitFeedbackPayload {
  context_type: FeedbackContextType;
  trigger_event: string;
  response: {
    type: "reaction" | "sentiment" | "slider";
    value: string | number;
    label: string;
  };
  metadata?: {
    lesson_id?: string;
    course_id?: string;
    slide_index?: number;
    quiz_attempt_count?: number;
  };
}

const writeSurveyResponseFn = httpsCallable(functions, "writeSurveyResponse");

/**
 * Submit implicit feedback.
 * 1. Fires a typed analytics event for the pipeline.
 * 2. Persists the full response to `survey_responses` via Cloud Function.
 */
export function trackImplicitFeedback(payload: ImplicitFeedbackPayload): void {
  const { context_type, trigger_event, response } = payload;

  // Determine which specific event to log based on response type/value
  let eventName: (typeof WEB_ANALYTICS_EVENTS)[keyof typeof WEB_ANALYTICS_EVENTS] =
    WEB_ANALYTICS_EVENTS.IMPLICIT_FEEDBACK_SUBMITTED;

  if (response.type === "reaction") {
    if (response.value === "helpful") {
      eventName = WEB_ANALYTICS_EVENTS.CONTENT_HELPFUL_TAPPED;
    } else if (response.value === "not_helpful") {
      eventName = WEB_ANALYTICS_EVENTS.CONTENT_NOT_HELPFUL_TAPPED;
    } else if (context_type === "quiz") {
      eventName = WEB_ANALYTICS_EVENTS.LESSON_CONFUSION_SIGNAL_SELECTED;
    } else {
      eventName = WEB_ANALYTICS_EVENTS.IMPLICIT_REACTION_SELECTED;
    }
  } else if (response.type === "sentiment") {
    eventName = WEB_ANALYTICS_EVENTS.IMPLICIT_SENTIMENT_TAPPED;
  }

  trackEvent(eventName, {
    context_type,
    trigger_event,
    response_label: String(response.label),
  });

  // Persist to survey_responses (non-blocking — fire and forget)
  const sessionId = getOrCreateAnalyticsSessionId();
  const screenName = getActiveScreenName();

  // Persist to survey_responses. Non-blocking, but retried on transient failure so user
  // feedback isn't silently lost (it feeds reporting); gives up quietly after a few tries.
  void (async () => {
    const reqBody = {
      session_id: sessionId,
      screen_name: screenName ?? undefined,
      context_type,
      trigger_event,
      response: {
        type: response.type,
        value: response.value,
        label: response.label,
      },
      metadata: payload.metadata ?? {},
    };
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        await writeSurveyResponseFn(reqBody);
        return;
      } catch (err) {
        if (attempt === 2) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn("[mortar:feedback] writeSurveyResponse failed", err);
          }
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  })();
}

/** Fire the implicit_feedback_shown event when the widget is displayed. */
export function trackFeedbackShown(
  context_type: FeedbackContextType,
  trigger_event: string
): void {
  trackEvent(WEB_ANALYTICS_EVENTS.IMPLICIT_FEEDBACK_SHOWN, {
    context_type,
    trigger_event,
  });
}

/** Fire the implicit_feedback_dismissed event when the widget is closed without responding. */
export function trackFeedbackDismissed(
  context_type: FeedbackContextType,
  trigger_event: string
): void {
  trackEvent(WEB_ANALYTICS_EVENTS.IMPLICIT_FEEDBACK_DISMISSED, {
    context_type,
    trigger_event,
  });
}
