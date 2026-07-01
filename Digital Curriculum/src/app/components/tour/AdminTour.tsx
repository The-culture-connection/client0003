/**
 * Admin Command Center coach-mark tour.
 *
 * A spotlight walkthrough (react-joyride) of the admin hub — the view/scope
 * toggle, the live Action items queue, the Admin tools grid and Quick actions.
 * Auto-runs once per browser the first time an admin opens the hub, and is
 * re-openable from the "Tour" button in the hub header via `startAdminTour()`.
 */

import { useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";

const SEEN_KEY = "mortar_tour_seen_admin_hub";
const START_EVENT = "mortar:start-admin-tour";

/** Re-open the admin tour from anywhere (e.g. the hub's "Tour" button). */
export function startAdminTour() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(START_EVENT));
  }
}

const steps: Step[] = [
  {
    target: "body",
    placement: "center",
    disableBeacon: true,
    title: "Welcome to the Admin Command Center 👑",
    content:
      "This hub is where you run everything. Here's a 30-second tour of where each tool lives. You can skip anytime and re-open it from the Tour button.",
  },
  {
    target: '[data-tour="admin-view-toggle"]',
    title: "Student / Admin view",
    content:
      "Flip between the student app and this admin view anytime. You're currently in Admin.",
  },
  {
    target: '[data-tour="admin-scope-key"]',
    title: "Platform key",
    content:
      "Each tool is tagged WEB (Digital Curriculum), MOBILE (Expansion app) or BOTH — so you always know which surface it affects.",
  },
  {
    target: '[data-tour="admin-action-items"]',
    title: "Action items",
    content:
      "Your live to-do queue — events awaiting approval, alumni applications, mobile reports, unread DMs and shop orders. Counts refresh automatically; click any card to jump in.",
  },
  {
    target: '[data-tour="admin-tools"]',
    title: "Admin tools",
    content:
      "Every management area lives here: Analytics, Courses, Badges, Events, Roles & admins, Reports, Shop, plus the Expansion mobile tools. Click a card's Open button to enter it.",
  },
  {
    target: '[data-tour="admin-quick-actions"]',
    title: "Quick actions",
    content:
      "Shortcuts to the things you do most — review alumni applications, open the course builder, or jump to the Events and Reports panels.",
  },
  {
    target: '[data-tour="admin-help"]',
    title: "That's the tour!",
    content:
      "Press Tour anytime to replay this. Detail screens keep this hub available in the side rail, so you can always get back here.",
  },
];

export function AdminTour() {
  const [run, setRun] = useState(false);

  // Auto-run once, after the hub has mounted.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(SEEN_KEY)) {
      const t = window.setTimeout(() => setRun(true), 700);
      return () => window.clearTimeout(t);
    }
  }, []);

  // Allow re-opening from the "Tour" button.
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
      scrollToFirstStep
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
          primaryColor: "var(--accent, #C1121F)",
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
