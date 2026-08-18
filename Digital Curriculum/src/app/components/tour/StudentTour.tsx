/**
 * Digital Curriculum student coach-mark tour.
 *
 * A spotlight walkthrough (react-joyride) that highlights each part of the
 * top navigation and explains what a student does there. It auto-runs once
 * per browser after sign-up, and can be re-opened any time from the "?"
 * Tour button in the top navigation via `startTour()`.
 */

import { useCallback, useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";

// Bumped to _v2 when the unskippable "how to report" step was added: anyone who
// had already seen the old tour would otherwise never be shown it, which is the
// one thing every beta tester has to know. Bump again only for a change that
// genuinely warrants re-running the whole tour for everybody.
const SEEN_KEY = "mortar_tour_seen_student_v2";
const START_EVENT = "mortar:start-tour";

/** Re-open the tour from anywhere (e.g. the nav "?" button). */
export function startTour() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(START_EVENT));
  }
}

/** CSS hook on the floating bug button, set in `BetaFeedbackWidget`. */
const BETA_FEEDBACK_TARGET = '[data-tour="beta-feedback"]';

/**
 * Opening step: how to report, before anything else.
 *
 * Deliberately unskippable — no Skip, no close button, no dismissing by
 * clicking the backdrop or pressing Escape. A beta round is only worth what
 * testers report, so nobody reaches the rest of the tour without being shown
 * how. Every other step keeps its Skip button.
 */
const betaFeedbackStep: Step = {
  target: BETA_FEEDBACK_TARGET,
  // "left-end", not "left": the bug button is `fixed bottom-24`, so a tooltip
  // centred on it hangs its bottom half — the footer with Next — off the
  // bottom of the viewport, and scrolling cannot rescue it because a fixed
  // target moves with the page. Anchoring the tooltip's bottom edge to the
  // button's makes it grow upward into the empty page instead.
  placement: "left-end",
  disableBeacon: true,
  showSkipButton: false,
  hideCloseButton: true,
  disableOverlayClose: true,
  disableCloseOnEsc: true,
  title: "Start here — tell us everything",
  content:
    "This bug button is on every screen, bottom-right. Use it for ANY AND ALL " +
    "things you notice and want noted for change — a typo, a slow page, a " +
    "confusing label, a colour you dislike, a feature you wish existed. " +
    "Nothing is too small or too opinionated. It grabs a screenshot of what " +
    "you are looking at, so press it the moment something catches your eye " +
    "rather than trying to remember it later.",
};

const baseSteps: Step[] = [
  {
    target: "body",
    placement: "center",
    disableBeacon: true,
    title: "Welcome to MORTAR 👋",
    content:
      "Now here's a 30-second tour of where everything is. You can skip from here on, and re-open this from the ? button up top whenever you like.",
  },
  {
    target: '[data-tour="nav-dashboard"]',
    title: "Dashboard",
    content:
      "Your home base. See your course progress, latest certificates, upcoming events and your groups all in one place.",
  },
  {
    target: '[data-tour="nav-curriculum"]',
    title: "Curriculum",
    content:
      "Browse your courses and lessons here. Open a course, then press play on a lesson to start learning — slides, videos, quizzes and surveys included.",
  },
  {
    target: '[data-tour="nav-data-room"]',
    title: "Data Room",
    content:
      "Everything you've earned. Download your certificates and survey responses as PDFs, or grab them all as a ZIP.",
  },
  {
    target: '[data-tour="nav-community"]',
    title: "Community Hub",
    content:
      "Connect with your cohort — join discussions, RSVP to events and message other members.",
  },
  {
    target: '[data-tour="nav-shop"]',
    title: "Shop MORTAR",
    content:
      "Browse MORTAR merchandise. Add items to your cart and check out securely.",
  },
  {
    target: '[data-tour="nav-theme-toggle"]',
    title: "Light or dark mode",
    content:
      "The app starts in dark mode. Prefer a lighter look? Click the sun/moon icon here anytime to switch between dark and light themes.",
  },
  {
    target: '[data-tour="nav-notifications"]',
    title: "Notifications",
    content:
      "The bell lights up when a new certificate is ready or you earn a badge. Tap it to see what's new.",
  },
  {
    target: '[data-tour="nav-cart"]',
    title: "Your cart",
    content:
      "Items you add from the Shop collect here, ready for checkout.",
  },
  {
    target: '[data-tour="help"]',
    title: "That's the tour!",
    content:
      "Press this ? button anytime to replay the walkthrough. Happy learning!",
  },
];

export function StudentTour() {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>(baseSteps);

  /**
   * Decide the step list at the moment the tour opens.
   *
   * The report step leads only when its target is actually on the page. An
   * unskippable step pointing at nothing would leave the tester stuck behind an
   * overlay with no Skip, no close and no Escape — so when the widget is absent
   * (signed out, or it failed to mount) the tour simply starts at the welcome.
   */
  const begin = useCallback(() => {
    const hasReportButton =
      typeof document !== "undefined" &&
      document.querySelector(BETA_FEEDBACK_TARGET) !== null;
    setSteps(hasReportButton ? [betaFeedbackStep, ...baseSteps] : baseSteps);
    setRun(true);
  }, []);

  // Auto-run once, after the nav has mounted.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(SEEN_KEY)) {
      const t = window.setTimeout(begin, 600);
      return () => window.clearTimeout(t);
    }
  }, [begin]);

  // Allow re-opening from the "?" Tour button.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener(START_EVENT, begin);
    return () => window.removeEventListener(START_EVENT, begin);
  }, [begin]);

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      if (typeof window !== "undefined") {
        localStorage.setItem(SEEN_KEY, "1");
      }
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      disableScrolling
      scrollToFirstStep={false}
      callback={handleCallback}
      locale={{
        back: "Back",
        close: "Close",
        last: "Got it",
        next: "Next",
        skip: "Skip",
      }}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: "var(--accent, #ea580c)",
          textColor: "#1f2937",
          arrowColor: "#ffffff",
          backgroundColor: "#ffffff",
        },
        tooltipTitle: {
          fontWeight: 700,
          fontSize: 16,
        },
        // Belt and braces against the same failure anywhere else: however long a
        // step's copy is, the body scrolls and the footer — Back / Next — stays
        // on screen rather than being pushed past the bottom of the viewport.
        tooltipContent: {
          maxHeight: "50vh",
          overflowY: "auto",
        },
        buttonNext: {
          borderRadius: 8,
          fontSize: 14,
        },
      }}
    />
  );
}
