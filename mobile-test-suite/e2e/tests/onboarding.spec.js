import {test, expect} from "@playwright/test";
import {expectOnScreen, prepare, resetQaAccount, signIn, tap, tapVisible, typeInto} from "./support.js";

const CHECKPOINT =
  "Profile is minimally complete, fully complete profile to get the full Mortarverse experience.";

const GOALS = [
  "Learn more soft skills (networking, lead generation)",
  "Learn more technical skills",
  "Sell skills/services",
  "Buy skills/services",
  "Grow my network",
  "Build partnerships",
];

const text = (page, s) => page.getByText(s, {exact: true});

test.beforeEach(async ({page}) => {
  await resetQaAccount();
  await prepare(page);
});

/** Signs in and walks the quick start to the checkpoint, checking each gate. */
async function quickStartToCheckpoint(page) {
  await signIn(page);

  // Step 1 — terms are required.
  await expect(text(page, "QUICK START · STEP 1 OF 3")).toBeVisible({timeout: 60_000});
  await expectOnScreen(page, text(page, "REQUIRED STEP"));
  await tap(page, "Continue");
  await expectOnScreen(page, text(page, "You must agree to the Terms of Use to continue."));
  await tapVisible(page, page.getByRole("checkbox"));
  await tap(page, "Continue");

  // Step 2 — first name + profession, both required.
  await expect(text(page, "QUICK START · STEP 2 OF 3")).toBeVisible();
  await expectOnScreen(page, text(page, "About you"));
  await tap(page, "Continue");
  await expect(text(page, "Required")).toHaveCount(2);
  await typeInto(page, 0, "QA");
  await typeInto(page, 1, "Test Engineer");
  await tap(page, "Continue");

  // Step 3 — business goals: the same six options, at least one required.
  await expect(text(page, "QUICK START · STEP 3 OF 3")).toBeVisible();
  await expectOnScreen(page, text(page, "How can we help your business grow?"));
  for (const goal of GOALS) await expect(page.getByRole("checkbox", {name: goal})).toHaveCount(1);
  await tap(page, "Continue");
  await expectOnScreen(page, text(page, "Select at least one goal to continue."));
  await tapVisible(page, page.getByRole("checkbox", {name: "Grow my network"}));
  await tap(page, "Continue");

  // Checkpoint.
  await expectOnScreen(page, text(page, CHECKPOINT));
  await expectOnScreen(page, page.getByRole("button", {name: "Complete profile", exact: true}));
  await expectOnScreen(page, page.getByRole("button", {name: "Continue", exact: true}));
}

test("quick start → Continue → Mortarverse shows the complete-profile reminder", async ({page}) => {
  await quickStartToCheckpoint(page);
  await tap(page, "Continue");

  // Welcome animation plays, then the Mortarverse.
  // Flutter merges the banner's text into one group label.
  await expect(page.getByRole("group", {name: /^Complete your profile/})).toBeVisible({timeout: 60_000});
  await tap(page, "Complete");
  // The reminder opens Edit Profile.
  await expect(page.getByText(/edit profile/i).first()).toBeVisible();
});

test("quick start → Complete profile continues into the full profile", async ({page}) => {
  await quickStartToCheckpoint(page);
  await tap(page, "Complete profile");

  await expect(text(page, "FULL PROFILE · STEP 1 OF 6")).toBeVisible();
  await expectOnScreen(page, text(page, "Identity + location"));
  await tap(page, "Continue");
  await expectOnScreen(page, text(page, "Fill in every field marked * to continue."));
});
