/**
 * Rules check for opening a single event ("View & Register").
 *
 * `getEvent()` reads `events/{id}` and `events_mobile/{id}` together, because an
 * event may live in either collection. For a curriculum-only event the mobile
 * document does not exist — and a get() on a missing document evaluates rules
 * with `resource == null`. `eventReadableByMember()` reaches straight into
 * `resource.data.keys()`, which errors on null and surfaces as
 * "Missing or insufficient permissions", so the whole Promise.all rejects and
 * the detail page renders nothing.
 *
 * Staff never see it: `hasStaffClaim()` short-circuits before `resource.data`
 * is touched. Only ordinary members hit the failure.
 *
 * `courseProgress` already guards this exact case with `resource == null ||`.
 *
 * Run from the repo root:
 *   npx firebase emulators:exec --only firestore --project mortar-rules-test \
 *     "node tools/rules-tests/event-detail-read.test.mjs"
 */
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const MEMBER = 'member-uid';
const STAFF = 'staff-uid';
const EVENT_ID = 'curriculum-only-event';

const testEnv = await initializeTestEnvironment({
  projectId: 'mortar-rules-test',
  firestore: {
    rules: readFileSync('firestore.rules', 'utf8'),
    host: '127.0.0.1',
    port: 8085,
  },
});

await testEnv.clearFirestore();

// An approved curriculum event, with NO matching events_mobile document —
// exactly what "WELCOME BETA TESTERS" looks like.
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'events', EVENT_ID), {
    title: 'WELCOME BETA TESTERS',
    approval_status: 'approved',
    created_by: 'some-admin-uid',
  });
});

const memberDb = testEnv
  .authenticatedContext(MEMBER, { roles: ['Digital Curriculum Students'] })
  .firestore();
const staffDb = testEnv.authenticatedContext(STAFF, { roles: ['superAdmin'] }).firestore();

let failures = 0;
const check = async (label, fn) => {
  try {
    await fn();
    console.log(`  PASS  ${label}`);
  } catch (e) {
    failures += 1;
    console.error(`  FAIL  ${label}\n        ${e.message.split('\n')[0]}`);
  }
};

console.log('\nopening one event as an ordinary member');

await check('reads the curriculum event itself', () =>
  assertSucceeds(getDoc(doc(memberDb, 'events', EVENT_ID)))
);

await check('reads the ABSENT events_mobile twin without being denied', () =>
  assertSucceeds(getDoc(doc(memberDb, 'events_mobile', EVENT_ID)))
);

await check('both reads together, the way getEvent() issues them', () =>
  assertSucceeds(
    Promise.all([
      getDoc(doc(memberDb, 'events', EVENT_ID)),
      getDoc(doc(memberDb, 'events_mobile', EVENT_ID)),
    ])
  )
);

await check('an absent curriculum event is also readable (returns empty)', () =>
  assertSucceeds(getDoc(doc(memberDb, 'events', 'no-such-event')))
);

console.log('\nsame reads as staff (these already worked)');

await check('staff read the absent events_mobile twin', () =>
  assertSucceeds(getDoc(doc(staffDb, 'events_mobile', EVENT_ID)))
);

// The null guard must not become a way to read events that DO exist but are
// still awaiting review.
console.log('\nunapproved events stay hidden');

await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'events', 'pending-by-someone-else'), {
    title: 'Awaiting review',
    approval_status: 'pending',
    created_by: 'another-member-uid',
  });
  await setDoc(doc(db, 'events', 'pending-by-me'), {
    title: 'My submission',
    approval_status: 'pending',
    created_by: MEMBER,
  });
});

await check("member still cannot read another member's pending event", () =>
  assertFails(getDoc(doc(memberDb, 'events', 'pending-by-someone-else')))
);

await check('member can still read their own pending event', () =>
  assertSucceeds(getDoc(doc(memberDb, 'events', 'pending-by-me')))
);

await testEnv.cleanup();

console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
