/**
 * Rules check for the DM message `reactions` map.
 *
 * The property that matters: a participant may write ONLY their own uid key,
 * and can never overwrite, remove, or forge the other participant's reaction.
 * A `reactions` map is written whole, so "participants may edit reactions" —
 * the obvious rule — would hand each person the other's reaction as well.
 *
 * Run from the repo root (deps are not in package.json; install them ad hoc):
 *
 *   npm install --no-save @firebase/rules-unit-testing@4 firebase@11
 *   npx firebase emulators:exec --only firestore --project mortar-rules-test \
 *     "node tools/rules-tests/dm-reactions.test.mjs"
 */
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteField, getDoc } from 'firebase/firestore';

const RULES = readFileSync(
  new URL('../../firestore.rules', import.meta.url),
  'utf8',
);

const ALICE = 'aaa_alice';
const BOB = 'bbb_bob';
const CAROL = 'ccc_carol';
const THREAD = `${ALICE}_${BOB}`; // sorted pair, as dmThreadIdForUsers builds it
const MSG = 'msg1';
const PATH = `dm_threads/${THREAD}/messages/${MSG}`;

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

async function seed(reactions) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), PATH), {
      sender_id: ALICE,
      text: 'hello',
      created_at: new Date(),
      ...(reactions ? { reactions } : {}),
    });
  });
}

const alice = () => testEnv.authenticatedContext(ALICE).firestore();
const bob = () => testEnv.authenticatedContext(BOB).firestore();
const carol = () => testEnv.authenticatedContext(CAROL).firestore();

// --- the reaction each participant is allowed to make ---

await check('recipient can add their own reaction', async () => {
  await testEnv.clearFirestore();
  await seed(null);
  await assertSucceeds(updateDoc(doc(bob(), PATH), { [`reactions.${BOB}`]: '👍' }));
});

await check('sender can react to their own message', async () => {
  await testEnv.clearFirestore();
  await seed(null);
  await assertSucceeds(updateDoc(doc(alice(), PATH), { [`reactions.${ALICE}`]: '❤️' }));
});

await check('reactor can change their own reaction', async () => {
  await testEnv.clearFirestore();
  await seed({ [BOB]: '👍' });
  await assertSucceeds(updateDoc(doc(bob(), PATH), { [`reactions.${BOB}`]: '🎉' }));
});

await check('reactor can remove their own reaction', async () => {
  await testEnv.clearFirestore();
  await seed({ [BOB]: '👍' });
  await assertSucceeds(updateDoc(doc(bob(), PATH), { [`reactions.${BOB}`]: deleteField() }));
});

await check("adding mine leaves the other person's intact", async () => {
  await testEnv.clearFirestore();
  await seed({ [ALICE]: '❤️' });
  await assertSucceeds(updateDoc(doc(bob(), PATH), { [`reactions.${BOB}`]: '👍' }));
  let after;
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    after = (await getDoc(doc(ctx.firestore(), PATH))).data();
  });
  if (after.reactions[ALICE] !== '❤️' || after.reactions[BOB] !== '👍') {
    throw new Error(`unexpected reactions: ${JSON.stringify(after.reactions)}`);
  }
});

// --- the tampering it must refuse ---

await check("cannot overwrite the other participant's reaction", async () => {
  await testEnv.clearFirestore();
  await seed({ [ALICE]: '❤️' });
  await assertFails(updateDoc(doc(bob(), PATH), { [`reactions.${ALICE}`]: '💩' }));
});

await check("cannot delete the other participant's reaction", async () => {
  await testEnv.clearFirestore();
  await seed({ [ALICE]: '❤️' });
  await assertFails(updateDoc(doc(bob(), PATH), { [`reactions.${ALICE}`]: deleteField() }));
});

await check('cannot wipe the whole reactions map', async () => {
  await testEnv.clearFirestore();
  await seed({ [ALICE]: '❤️', [BOB]: '👍' });
  await assertFails(updateDoc(doc(bob(), PATH), { reactions: {} }));
});

await check('a non-participant cannot react at all', async () => {
  await testEnv.clearFirestore();
  await seed(null);
  await assertFails(updateDoc(doc(carol(), PATH), { [`reactions.${CAROL}`]: '👍' }));
});

await check('message text stays immutable', async () => {
  await testEnv.clearFirestore();
  await seed(null);
  await assertFails(updateDoc(doc(bob(), PATH), { text: 'edited' }));
});

await check('cannot smuggle a text edit alongside a reaction', async () => {
  await testEnv.clearFirestore();
  await seed(null);
  await assertFails(
    updateDoc(doc(bob(), PATH), { text: 'edited', [`reactions.${BOB}`]: '👍' }),
  );
});

await check('an over-long reaction value is rejected', async () => {
  await testEnv.clearFirestore();
  await seed(null);
  await assertFails(
    updateDoc(doc(bob(), PATH), { [`reactions.${BOB}`]: 'x'.repeat(200) }),
  );
});

await check('a non-string reaction value is rejected', async () => {
  await testEnv.clearFirestore();
  await seed(null);
  await assertFails(updateDoc(doc(bob(), PATH), { [`reactions.${BOB}`]: 42 }));
});

await check('deleting a message is still refused', async () => {
  await testEnv.clearFirestore();
  await seed(null);
  const { deleteDoc } = await import('firebase/firestore');
  await assertFails(deleteDoc(doc(bob(), PATH)));
});

await testEnv.cleanup();

for (const [status, name] of results) console.log(`${status}  ${name}`);
const failed = results.filter(([s]) => s === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
