/**
 * Rules check for the Mortarverse popup.
 *
 * Two independent things have to hold, and both are easy to get wrong in a way
 * that only shows up in production:
 *
 * 1. `mortar_info_posts` gained two optional keys (`popup`, `popup_expires_at`)
 *    behind a `hasOnly()` allow-list. The change has to be **additive** — a
 *    post written the old way, with neither key, must still save. A regression
 *    here breaks every existing admin workflow, not just the new toggle.
 *
 * 2. Popup "seen" state is written to `users/{uid}.mortarverse_popups`. That
 *    relies on `match /users/{userId}` being a deny-list of privileged fields
 *    rather than a key allow-list. If anyone ever tightens that rule to an
 *    allow-list, dismissals stop persisting and popups silently start
 *    re-nagging — with no error anywhere, because the write is best-effort.
 *
 * Run from the repo root:
 *   npm install --no-save @firebase/rules-unit-testing@4 firebase@11
 *   npx firebase emulators:exec --only firestore --project mortar-rules-test \
 *     "node tools/rules-tests/mortarverse-popup.test.mjs"
 */
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';

const RULES = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');

const STAFF = 'staff_uid';
const MEMBER = 'member_uid';

const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', `${name} :: ${e.message}`]);
  }
};

const testEnv = await initializeTestEnvironment({
  projectId: 'mortar-rules-test',
  firestore: { rules: RULES, host: '127.0.0.1', port: 8085 },
});

await testEnv.clearFirestore();
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'users', MEMBER), { email: 'member@example.com' });
});

// `roles` is the custom claim, which is what hasStaffClaim() reads.
const staff = () => testEnv.authenticatedContext(STAFF, { roles: ['Admin'] }).firestore();
const member = () => testEnv.authenticatedContext(MEMBER).firestore();

/** A valid post body, minus whatever the caller wants to vary. */
const basePost = {
  title: 'Spring demo day',
  body: 'Doors open at six.',
  published: true,
  media: [],
  created_at: Timestamp.now(),
  updated_at: Timestamp.now(),
};

console.log('mortar_info_posts — the new popup keys');

await check('staff can write a post with no popup keys at all (the additive test)', async () => {
  await assertSucceeds(setDoc(doc(staff(), 'mortar_info_posts', 'p_legacy'), basePost));
});

await check('staff can opt a post in to the popup', async () => {
  await assertSucceeds(
    setDoc(doc(staff(), 'mortar_info_posts', 'p_popup'), { ...basePost, popup: true }),
  );
});

await check('staff can set a popup cutoff', async () => {
  await assertSucceeds(
    setDoc(doc(staff(), 'mortar_info_posts', 'p_expiry'), {
      ...basePost,
      popup: true,
      popup_expires_at: Timestamp.fromDate(new Date('2027-01-01')),
    }),
  );
});

await check('staff can write an explicitly null cutoff', async () => {
  // The admin panel omits the field, but a null must not hard-fail either.
  await assertSucceeds(
    setDoc(doc(staff(), 'mortar_info_posts', 'p_null'), {
      ...basePost,
      popup: true,
      popup_expires_at: null,
    }),
  );
});

await check('a non-boolean popup flag is rejected', async () => {
  await assertFails(
    setDoc(doc(staff(), 'mortar_info_posts', 'p_bad'), { ...basePost, popup: 'yes' }),
  );
});

await check('a non-timestamp cutoff is rejected', async () => {
  await assertFails(
    setDoc(doc(staff(), 'mortar_info_posts', 'p_bad2'), {
      ...basePost,
      popup: true,
      popup_expires_at: 'soon',
    }),
  );
});

await check('an unknown key is still rejected (allow-list intact)', async () => {
  // Guards against someone "fixing" a future field by loosening hasOnly().
  await assertFails(
    setDoc(doc(staff(), 'mortar_info_posts', 'p_bad3'), { ...basePost, popup_colour: 'red' }),
  );
});

await check('a member cannot flag a post as a popup', async () => {
  await assertFails(
    setDoc(doc(member(), 'mortar_info_posts', 'p_member'), { ...basePost, popup: true }),
  );
});

await check('a member can read a published popup post', async () => {
  await assertSucceeds(getDoc(doc(member(), 'mortar_info_posts', 'p_popup')));
});

console.log('users/{uid}.mortarverse_popups — seen state');

await check('a member can write their own popup seen state', async () => {
  await assertSucceeds(
    setDoc(
      doc(member(), 'users', MEMBER),
      {
        mortarverse_popups: {
          seen: { 'announcement:p_popup': Timestamp.now() },
          last_shown_at: Timestamp.now(),
        },
      },
      { merge: true },
    ),
  );
});

await check('a member can read their own popup seen state back', async () => {
  await assertSucceeds(getDoc(doc(member(), 'users', MEMBER)));
});

await check('a member cannot write popup state onto someone else', async () => {
  await assertFails(
    setDoc(
      doc(member(), 'users', STAFF),
      { mortarverse_popups: { seen: {} } },
      { merge: true },
    ),
  );
});

await check('popup state cannot be used to smuggle a role in', async () => {
  // Same property as in admin-view-profile, asserted on this specific write
  // because it is a new path onto the user document.
  await assertFails(
    setDoc(
      doc(member(), 'users', MEMBER),
      { mortarverse_popups: { seen: {} }, roles: ['superAdmin'] },
      { merge: true },
    ),
  );
});

await testEnv.cleanup();

for (const [status, name] of results) console.log(`${status}  ${name}`);
const failed = results.filter(([s]) => s === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
