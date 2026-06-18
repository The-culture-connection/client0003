/**
 * Reproduce a DM write against DEPLOYED staging rules as a real participant.
 * Isolates: (A) message create alone, (B) thread update alone, (C) the batch the app does.
 */
const path = require("path");
const root = path.join(__dirname, "..", "..");
const admin = require(path.join(root, "functions", "node_modules", "firebase-admin"));
const { initializeApp } = require(path.join(root, "Digital Curriculum", "node_modules", "firebase", "app"));
const { getAuth, signInWithCustomToken } = require(path.join(root, "Digital Curriculum", "node_modules", "firebase", "auth"));
const {
  getFirestore, doc, collection, setDoc, updateDoc, writeBatch, serverTimestamp,
} = require(path.join(root, "Digital Curriculum", "node_modules", "firebase", "firestore"));

admin.initializeApp({ credential: admin.credential.cert(require(path.join(root, "mortar-stage-firebase-adminsdk-fbsvc-c7748b6158.json"))) });

// existing thread between these two; sign in as the first participant
const THREAD_ID = process.argv[2] || "RT5Zxv1QF5aiYjT1ThXvjH7Iw8s1_rxz60V9CX1MbSTFnmBcb5bT604L2";
const ME = process.argv[3] || "RT5Zxv1QF5aiYjT1ThXvjH7Iw8s1";

const app = initializeApp({ apiKey: "AIzaSyBUJreREmYaNjbv7zlLLkdTNk-tiFODwA8", authDomain: "mortar-stage.firebaseapp.com", projectId: "mortar-stage" });
const cAuth = getAuth(app);
const db = getFirestore(app);

async function tryIt(label, fn) {
  try { await fn(); console.log(`${label}: OK`); }
  catch (e) { console.log(`${label}: DENIED  ${e.code || ""}  ${e.message || ""}`); }
}

(async () => {
  const token = await admin.auth().createCustomToken(ME);
  await signInWithCustomToken(cAuth, token);
  await cAuth.currentUser.getIdToken(true);
  console.log("signed in as", cAuth.currentUser.uid, "thread", THREAD_ID, "\n");

  // A. message create alone
  await tryIt("A message create alone", async () => {
    const m = doc(collection(db, "dm_threads", THREAD_ID, "messages"));
    await setDoc(m, { sender_id: ME, text: "rules test A", created_at: serverTimestamp() });
  });

  // B. thread update alone (exact app fields)
  await tryIt("B thread update alone", async () => {
    await updateDoc(doc(db, "dm_threads", THREAD_ID), {
      updated_at: serverTimestamp(), last_preview: "rules test B", last_sender_id: ME,
    });
  });

  // C. the batch the app actually runs (update thread + create message)
  await tryIt("C batch update+message", async () => {
    const batch = writeBatch(db);
    batch.update(doc(db, "dm_threads", THREAD_ID), { updated_at: serverTimestamp(), last_preview: "rules test C", last_sender_id: ME });
    batch.set(doc(collection(db, "dm_threads", THREAD_ID, "messages")), { sender_id: ME, text: "rules test C", created_at: serverTimestamp() });
    await batch.commit();
  });

  process.exit(0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
