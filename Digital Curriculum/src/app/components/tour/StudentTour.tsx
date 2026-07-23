/**
 * Digital Curriculum student coach-mark tour.
 *
 * A spotlight walkthrough (react-joyride) that highlights each part of the
 * top navigation and explains what a student does there. It auto-runs once
 * per browser after sign-up, and can be re-opened any time from the "?"
 * Tour button in the top navigation via `startTour()`.
 */

import { useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";

const SEEN_KEY = "mortar_tour_seen_student";
const START_EVENT = "mortar:start-tour";

/** Re-open the tour from anywhere (e.g. the nav "?" button). */
export function startTour() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(START_EVENT));
  }
}

const steps: Step[] = [
  {
    target: "body",
    placement: "center",
    disableBeacon: true,
    title: "Welcome to MORTAR 👋",
    content:
      "Here's a 30-second tour of where everything is. You can skip anytime, and re-open this from the ? button up top whenever you like.",
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

  // Auto-run once, after the nav has mounted.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(SEEN_KEY)) {
      const t = window.setTimeout(() => setRun(true), 600);
      return () => window.clearTimeout(t);
    }
  }, []);

  // Allow re-opening from the "?" Tour button.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setRun(true);
    window.addEventListener(START_EVENT, handler);
    return () => window.removeEventListener(START_EVENT, handler);
  }, []);

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
        buttonNext: {
          borderRadius: 8,
          fontSize: 14,
        },
      }}
    />
  );
}
