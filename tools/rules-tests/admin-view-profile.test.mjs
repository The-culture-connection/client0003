/**
 * Rules check for Admin → alumni applications → "View profile".
 *
 * Reviewing an application means reading someone else's certificates and survey
 * PDFs, so staff need read on both subcollections while writes stay owner-only.
 *
 * `hasStaffClaim()` reads `request.auth.token.roles`, a CUSTOM CLAIM — not the
 * `roles` array on the user's Firestore document. An admin whose claims have not
 * been synced (see the `syncRolesToClaims` trigger) is denied by these rules no
 * matter what their profile says, which is the first thing to check if this
 * passes here but fails in the app.
 *
 * Run from the repo root:
 *   npm install --no-save @firebase/rules-unit-testing@4 firebase@11
 *   npx firebase emulators:exec --only firestore --project mortar-rules-test \
 *     "node tools/rules-tests/admin-view-profile.test.mjs"
 */
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  deleteDoc,
} from 'firebase/firestore';

const RULES = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');

const MEMBER = 'member_uid';
const ADMIN = 'admin_uid';
const OTHER = 'nosy_uid';

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
  const db = ctx.firestore();
  await setDoc(doc(db, 'users', MEMBER), { email: 'member@example.com', first_name: 'Mem' });
  await setDoc(doc(db, `users/${MEMBER}/certificates/c1`), {
    skill: 'Finance',
    courseTitle: 'Masters',
    createdAt: new Date(),
  });
  await setDoc(doc(db, `users/${MEMBER}/surveyResponses/s1`), {
    surveyTitle: 'Business plan',
    downloadUrl: 'https://example.com/s1.pdf',
    createdAt: new Date(),
  });
  await setDoc(doc(db, 'user_analytics_summary', MEMBER), { counts: { lessons_completed: 3 } });
});

// `roles` here is the custom claim, which is what hasStaffClaim() reads.
const staff = () => testEnv.authenticatedContext(ADMIN, { roles: ['Admin'] }).firestore();
const member = () => testEnv.authenticatedContext(MEMBER).firestore();
const other = () => testEnv.authenticatedContext(OTHER).firestore();

const certs = (db) => query(collection(db, `users/${MEMBER}/certificates`), orderBy('createdAt', 'desc'));
const surveys = (db) => query(collection(db, `users/${MEMBER}/surveyResponses`), orderBy('createdAt', 'desc'));

// --- what the dialog needs ---

await check('staff can list the member certificates', async () => {
  await assertSucceeds(getDocs(certs(staff())));
});

await check('staff can list the member survey documents', async () => {
  await assertSucceeds(getDocs(surveys(staff())));
});

await check('staff can read the member analytics summary', async () => {
  const { getDoc } = await import('firebase/firestore');
  await assertSucceeds(getDoc(doc(staff(), 'user_analytics_summary', MEMBER)));
});

await check('staff can read the member profile', async () => {
  const { getDoc } = await import('firebase/firestore');
  await assertSucceeds(getDoc(doc(staff(), 'users', MEMBER)));
});

await check('the member can still read their own', async () => {
  await assertSucceeds(getDocs(certs(member())));
  await assertSucceeds(getDocs(surveys(member())));
});

// --- what must stay shut ---

await check('an ordinary member cannot read someone else certificates', async () => {
  await assertFails(getDocs(certs(other())));
});

await check('an ordinary member cannot read someone else survey documents', async () => {
  await assertFails(getDocs(surveys(other())));
});

await check('staff cannot write to the member certificates', async () => {
  await assertFails(setDoc(doc(staff(), `users/${MEMBER}/certificates/forged`), { skill: 'Fake' }));
});

await check('staff cannot write to the member survey documents', async () => {
  await assertFails(setDoc(doc(staff(), `users/${MEMBER}/surveyResponses/forged`), { surveyTitle: 'Fake' }));
});

await check('staff cannot delete the member certificates', async () => {
  await assertFails(deleteDoc(doc(staff(), `users/${MEMBER}/certificates/c1`)));
});

await check('the member can still write their own certificates', async () => {
  await assertSucceeds(setDoc(doc(member(), `users/${MEMBER}/certificates/c2`), { skill: 'Ops' }));
});

// --- the failure mode this is most likely to be in production ---

await check('an admin WITHOUT the roles custom claim is denied', async () => {
  const noClaim = testEnv.authenticatedContext('admin_no_claim').firestore();
  await assertFails(getDocs(surveys(noClaim)));
});

await testEnv.cleanup();

for (const [status, name] of results) console.log(`${status}  ${name}`);
const failed = results.filter(([s]) => s === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
