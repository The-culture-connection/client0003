/**
 * Rules check for the beta tester checklist stamps.
 *
 * Two of the eleven steps ("look around the dashboard", "report anything
 * outstanding") leave no readable trace of their own — `beta_feedback` is
 * staff-read-only — so the client stamps them onto `users/{uid}.beta_checklist`.
 * That is an owner update, and owner updates on the user doc are heavily
 * constrained (no staff role gain, suspension/ban untouched, no `gamification`
 * key, badges unchanged). This proves the stamp clears all of it.
 *
 * Run from the repo root:
 *   npx firebase emulators:exec --only firestore --project mortar-rules-test \
 *     "node tools/rules-tests/beta-checklist-stamp.test.mjs"
 */
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const TESTER = 'tester-uid';
const OTHER = 'other-uid';

const testEnv = await initializeTestEnvironment({
  projectId: 'mortar-rules-test',
  firestore: {
    rules: readFileSync('firestore.rules', 'utf8'),
    host: '127.0.0.1',
    port: 8085,
  },
});

await testEnv.clearFirestore();

// Seed both user docs with the shape the app actually stores.
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'users', TESTER), {
    uid: TESTER,
    email: 'tester@example.com',
    onboarding_status: 'complete',
    beta_tester: true,
    roles: ['Digital Curriculum Students'],
  });
  await setDoc(doc(db, 'users', OTHER), {
    uid: OTHER,
    email: 'other@example.com',
    roles: ['Digital Curriculum Students'],
  });
});

const tester = testEnv.authenticatedContext(TESTER, {
  roles: ['Digital Curriculum Students'],
});
const testerDb = tester.firestore();

let failures = 0;
const check = async (label, fn) => {
  try {
    await fn();
    console.log(`  PASS  ${label}`);
  } catch (e) {
    failures += 1;
    console.error(`  FAIL  ${label}\n        ${e.message}`);
  }
};

console.log('\nbeta_checklist stamps');

await check('tester can stamp dashboard_viewed_at on their own doc', () =>
  assertSucceeds(
    setDoc(
      doc(testerDb, 'users', TESTER),
      { beta_checklist: { dashboard_viewed_at: serverTimestamp() } },
      { merge: true }
    )
  )
);

await check('tester can stamp reported_at on their own doc', () =>
  assertSucceeds(
    setDoc(
      doc(testerDb, 'users', TESTER),
      { beta_checklist: { reported_at: serverTimestamp() } },
      { merge: true }
    )
  )
);

await check('a second stamp merges rather than being rejected', () =>
  assertSucceeds(
    setDoc(
      doc(testerDb, 'users', TESTER),
      { beta_checklist: { dashboard_viewed_at: serverTimestamp() } },
      { merge: true }
    )
  )
);

await check('tester cannot stamp somebody else', () =>
  assertFails(
    setDoc(
      doc(testerDb, 'users', OTHER),
      { beta_checklist: { reported_at: serverTimestamp() } },
      { merge: true }
    )
  )
);

await check('tester still cannot grant themselves a staff role alongside a stamp', () =>
  assertFails(
    setDoc(
      doc(testerDb, 'users', TESTER),
      { beta_checklist: { reported_at: serverTimestamp() }, roles: ['superAdmin'] },
      { merge: true }
    )
  )
);

await check('tester can read back their own stamps', () =>
  assertSucceeds(getDoc(doc(testerDb, 'users', TESTER)))
);

console.log('\nchecklist read paths');

await check('tester can read their own courseProgress', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'courseProgress', `${TESTER}_course1`), {
      userId: TESTER,
      courseId: 'course1',
      completed: true,
      progress: 100,
    });
  });
  await assertSucceeds(getDoc(doc(testerDb, 'courseProgress', `${TESTER}_course1`)));
});

await check('tester cannot read their own beta_feedback (why the stamp exists)', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'beta_feedback', 'report1'), {
      user_id: TESTER,
      comment: 'test',
    });
  });
  await assertFails(getDoc(doc(testerDb, 'beta_feedback', 'report1')));
});

await testEnv.cleanup();

console.log(
  failures === 0 ? '\nAll checks passed.\n' : `\n${failures} check(s) failed.\n`
);
process.exit(failures === 0 ? 0 : 1);
