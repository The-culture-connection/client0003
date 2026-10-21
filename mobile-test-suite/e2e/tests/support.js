// Shared helpers for driving the Flutter web build.
//
// The build is compiled with E2E_SEMANTICS=true, so Flutter mirrors its
// widgets into <flt-semantics> elements with real roles: buttons are
// getByRole("button"), text fields getByRole("textbox").

import {expect} from "@playwright/test";

// Public web API key for mortar-stage (same value ships in the app).
const API_KEY = "AIzaSyBUJreREmYaNjbv7zlLLkdTNk-tiFODwA8";
const PROJECT = "mortar-stage";

export function qaCredentials() {
  const email = process.env.QA_EMAIL;
  const password = process.env.QA_PASSWORD;
  if (!email || !password) throw new Error("Set QA_EMAIL and QA_PASSWORD (see mobile-test-suite/README.md).");
  return {email, password};
}

async function signInRest() {
  const {email, password} = qaCredentials();
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({email, password, returnSecureToken: true}),
    },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`QA sign-in failed: ${json.error?.message}`);
  return {idToken: json.idToken, uid: json.localId};
}

/** Profile fields the onboarding writes; masked without a value = deleted. */
const PROFILE_FIELDS = [
  "first_name", "last_name", "profession", "bio", "city", "state", "company_name",
  "business_goals", "confident_skills", "desired_skills", "tribe", "industry",
  "work_structure", "profile_links", "expansionOnboardingComplete",
  "expansionOnboardingCompletedAt",
];

/**
 * Puts the QA account back to "just signed up": no profile, onboarding not
 * done. Uses the account's own ID token — owners may edit these fields — so
 * no admin credentials are needed. The welcome email is guarded by
 * `brevo_email_onboarding_welcome_sent_at`, which this leaves alone, so
 * repeated runs do not resend it.
 */
export async function resetQaAccount() {
  const {idToken, uid} = await signInRest();
  const fields = {
    onboarding_status: {stringValue: "needs_profile"},
    profile_completed: {booleanValue: false},
    onboardingComplete: {booleanValue: false},
    profileCreated: {booleanValue: false},
  };
  const mask = [...Object.keys(fields), ...PROFILE_FIELDS]
    .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
    .join("&");
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}?${mask}`,
    {
      method: "PATCH",
      headers: {"Content-Type": "application/json", Authorization: `Bearer ${idToken}`},
      body: JSON.stringify({fields}),
    },
  );
  if (!res.ok) throw new Error(`QA reset failed: ${res.status} ${await res.text()}`);
  return uid;
}

/** Pre-dismisses first-run overlays so they do not cover what is under test. */
export async function prepare(page) {
  await page.addInitScript(() => {
    // shared_preferences on web = localStorage under "flutter.", JSON values.
    localStorage.setItem("flutter.mortarverse_tutorial_seen_v1", "true");
  });
}

/**
 * Types into the [index]th text field on screen.
 *
 * Flutter swaps in its real <input> on the first click, and keystrokes sent
 * before that lands are dropped — so wait for focus, then verify the value.
 */
export async function typeInto(page, index, text) {
  const field = page.getByRole("textbox").nth(index);
  await field.click();
  await expect(field).toBeFocused();
  await page.waitForTimeout(250);
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(text, {delay: 15});
  await expect(field).toHaveValue(text);
}

export const button = (page, name) => page.getByRole("button", {name, exact: true});

/**
 * Index of the first match whose box sits inside the viewport, or -1.
 *
 * Flutter's PageView keeps neighbouring pages in the semantics tree, so the
 * onboarding has several "Continue" buttons at once — only one is on screen.
 */
async function onScreenIndex(page, locator) {
  const width = page.viewportSize().width;
  const count = await locator.count();
  for (let i = 0; i < count; i++) {
    const box = await locator.nth(i).boundingBox();
    if (box && box.width > 0 && box.x >= -1 && box.x + box.width <= width + 1) return i;
  }
  return -1;
}

/** Clicks the on-screen element in [locator] (waits for one to appear). */
export async function tapVisible(page, locator) {
  let index = -1;
  await expect.poll(async () => (index = await onScreenIndex(page, locator)), {timeout: 20_000}).not.toBe(-1);
  // Let a page transition settle so the tap lands where the box was measured.
  await page.waitForTimeout(350);
  index = await onScreenIndex(page, locator);
  await locator.nth(index).click();
}

/** Taps the on-screen button named exactly [name]. */
export const tap = (page, name) => tapVisible(page, button(page, name));

/** Asserts some element matching [locator] is on screen. */
export async function expectOnScreen(page, locator) {
  await expect.poll(() => onScreenIndex(page, locator), {timeout: 20_000}).not.toBe(-1);
}

export async function openApp(page) {
  await page.goto("/app/");
  await expect(button(page, "SIGN IN")).toBeVisible({timeout: 60_000});
}

export async function signIn(page) {
  const {email, password} = qaCredentials();
  await openApp(page);
  await button(page, "SIGN IN").click();
  await expect(page.getByRole("textbox").first()).toBeVisible();
  await typeInto(page, 0, email);
  await typeInto(page, 1, password);
  await page.getByRole("button", {name: /^sign in$/i}).last().click();
}
