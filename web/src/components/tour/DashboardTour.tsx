"use client";

/**
 * Admin Dashboard coach-mark tour.
 *
 * A spotlight walkthrough (react-joyride) that highlights each top-nav
 * destination and explains what an admin does there. It auto-runs once per
 * browser after sign-up, and can be re-opened any time from the "Tour" (?)
 * button in the top navigation via `startTour()`.
 */

import { useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";

const SEEN_KEY = "mortar_tour_seen_admin";
const START_EVENT = "mortar:start-tour";

/** Re-open the tour from anywhere (e.g. the nav "Tour" button). */
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
    title: "Welcome to the MORTAR admin dashboard",
    content:
      "Here's a quick tour of where everything lives. It takes about 30 seconds — you can skip anytime, and re-open it later from the Tour button up top.",
  },
  {
    target: '[data-tour="nav-dashboard"]',
    title: "Dashboard",
    content:
      "Your home base — learner progress, community activity, upcoming events and the cohort leaderboard at a glance.",
  },
  {
    target: '[data-tour="nav-curriculum"]',
    title: "Curriculum",
    content:
      "Browse the modules, chapters and lessons. Open a module to review its content and track how far cohorts have progressed.",
  },
  {
    target: '[data-tour="nav-data-room"]',
    title: "Data Room",
    content:
      "The document library. Browse folders, search files, and export everything as a ZIP for due-diligence or records.",
  },
  {
    target: '[data-tour="nav-community"]',
    title: "Community Hub",
    content:
      "Discussions, events and group chats. Feature an event, follow conversations and keep the community active.",
  },
  {
    target: '[data-tour="nav-analytics"]',
    title: "Analytics",
    content:
      "Platform metrics — completion rates, study time, quiz scores and engagement trends across your learners.",
  },
  {
    target: '[data-tour="help"]',
    title: "Need the tour again?",
    content:
      "Click Tour anytime to replay this walkthrough. The Admin area (invites, cohort CSV import, badges and moderation) also lives here for users with the Admin role.",
  },
];

export function DashboardTour() {
  const [run, setRun] = useState(false);

  // Auto-run once, after the nav has mounted.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(SEEN_KEY)) {
      const t = window.setTimeout(() => setRun(true), 600);
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
