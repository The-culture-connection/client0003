// Manual test cases shown on the suite page. Add a case here when a feature
// ships; keep `id`s stable so testers' saved results still line up.
//
// Each case: { id, title, steps: [..], expect }

export const CHECKLIST = [
  {
    group: "Onboarding — quick start",
    note: "Use a brand-new account (Sign up) or tap “Reset session” and sign up again.",
    cases: [
      {
        id: "onb-badges",
        title: "Every step says whether it is required",
        steps: ["Sign up with a new email.", "Look at the top of each onboarding step."],
        expect: "A red REQUIRED STEP or grey OPTIONAL STEP badge on every step, plus “QUICK START · STEP n OF 3”.",
      },
      {
        id: "onb-terms",
        title: "Terms must be accepted",
        steps: ["On Welcome to MORTAR, tap Continue without ticking the Terms box."],
        expect: "A red error banner appears and the Terms row is outlined red. You cannot continue.",
      },
      {
        id: "onb-basics",
        title: "First name and profession are required",
        steps: ["On About you, leave both fields empty and tap Continue.", "Fill one field, then the other."],
        expect: "Both fields turn red with “Required”; each clears as soon as it is filled. Labels show a red *.",
      },
      {
        id: "onb-goals",
        title: "Business goals step",
        steps: ["Look at “How can we help your business grow?”", "Tap Continue with nothing selected, then select a goal."],
        expect: "The same 6 options as before. Counter is red until one goal is picked, then green.",
      },
      {
        id: "onb-checkpoint",
        title: "Checkpoint message and choices",
        steps: ["Continue past the goals step."],
        expect: "“Profile is minimally complete, fully complete profile to get the full Mortarverse experience.” with Complete profile and Continue buttons.",
      },
      {
        id: "onb-continue",
        title: "Continue enters the app",
        steps: ["On the checkpoint, tap Continue."],
        expect: "Welcome animation, then the Mortarverse.",
      },
    ],
  },
  {
    group: "Onboarding — complete profile",
    note: "Start from the checkpoint and tap Complete profile.",
    cases: [
      {
        id: "full-flow",
        title: "Full profile steps",
        steps: ["Tap Complete profile.", "Walk through every step."],
        expect: "“FULL PROFILE · STEP n OF 6”: identity, two skills steps, tribe, work structure, links.",
      },
      {
        id: "full-skills",
        title: "Skill minimums are obvious",
        steps: ["On each skills step, select fewer than 3 skills and tap Continue."],
        expect: "Counter reads “n of 3 minimum skills selected” in red, turning green at 3; Continue is blocked below 3.",
      },
      {
        id: "full-optional",
        title: "Optional steps can be skipped",
        steps: ["On work structure and links, tap Continue without changing anything."],
        expect: "Both are badged OPTIONAL STEP and let you through.",
      },
      {
        id: "full-finish",
        title: "Finishing the full profile",
        steps: ["On the last step tap Complete profile."],
        expect: "Lands in the Mortarverse with no “Complete your profile” banner.",
      },
    ],
  },
  {
    group: "Mortarverse",
    cases: [
      {
        id: "mv-banner",
        title: "Reminder for a minimal profile",
        steps: ["Finish onboarding with Continue (minimal profile).", "Look under the MORTARVERSE wordmark."],
        expect: "A “Complete your profile” banner with a Complete button. It comes back on every visit.",
      },
      {
        id: "mv-banner-clears",
        title: "Reminder clears once complete",
        steps: ["Tap Complete, fill in every required field in Edit Profile, save.", "Return to the Mortarverse."],
        expect: "The banner is gone.",
      },
    ],
  },
  {
    group: "Conference — Smart Matching",
    note: "Needs an account with a ticket to an open conference.",
    cases: [
      {
        id: "cf-tile",
        title: "Lobby entry point",
        steps: ["Enter the conference lobby (Explore tab)."],
        expect: "A Smart Matching tile right after Networking Zone.",
      },
      {
        id: "cf-disclaimer",
        title: "Disclaimer for an incomplete profile",
        steps: ["With a minimal profile, open Smart Matching.", "Tap Run matching."],
        expect: "An inline note plus a dialog: matches may not be as accurate, with Complete profile and Run matching.",
      },
      {
        id: "cf-results",
        title: "Running matching",
        steps: ["Choose Run matching."],
        expect: "Top matches with a % score and “Why you matched” reasons, or a “no strong matches yet” message.",
      },
      {
        id: "cf-actions",
        title: "Acting on a match",
        steps: ["Tap a match card.", "Tap Say hello."],
        expect: "Card opens the person’s profile; Say hello opens a direct message.",
      },
      {
        id: "cf-complete",
        title: "Disclaimer clears once complete",
        steps: ["Complete the profile, then reopen Smart Matching."],
        expect: "No note or dialog — Run matching runs straight away.",
      },
    ],
  },
  {
    group: "Web platform (Digital Curriculum)",
    cases: [
      {
        id: "web-invite",
        title: "No invite code on login / sign-up",
        steps: ["Open the staging web app login page (link in the header).", "Toggle to Sign up."],
        expect: "No “Join with invite code” link on either view.",
      },
    ],
  },
];
