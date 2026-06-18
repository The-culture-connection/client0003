/**
 * Reproduce the community read against DEPLOYED staging rules as a real member.
 * Mints a custom token (admin) for a known GroupMembers uid, signs in with the CLIENT SDK
 * (rules enforced), and attempts the same threads query the app runs.
 */
const path = require("path");
const root = path.join(__dirname, "..", "..");
const admin = require(path.join(root, "functions", "node_modules", "firebase-admin"));

// client SDK from the Digital Curriculum app
const { initializeApp } = require(path.join(root, "Digital Curriculum", "node_modules", "firebase", "app"));
const { getAuth, signInWithCustomToken } = require(path.join(root, "Digital Curriculum", "node_modules", "firebase", "auth"));
const {
  getFirestore, collection, query, orderBy, limit, getDocs, doc, getDoc,
} = require(path.join(root, "Digital Curriculum", "node_modules", "firebase", "firestore"));

admin.initializeApp({ credential: admin.credential.cert(require(path.join(root, "mortar-stage-firebase-adminsdk-fbsvc-c7748b6158.json"))) });

const MEMBER_UID = process.argv[2] || "0LXmqaFauvQWXQHWHbjf5IZpAjG2"; // in seed_group_mock_0 GroupMembers
const GROUP_ID = process.argv[3] || "seed_group_mock_0";

const clientApp = initializeApp({
  apiKey: "AIzaSyBUJreREmYaNjbv7zlLLkdTNk-tiFODwA8",
  authDomain: "mortar-stage.firebaseapp.com",
  projectId: "mortar-stage",
});
const cAuth = getAuth(clientApp);
const cDb = getFirestore(clientApp);

(async () => {
  const claims = (await admin.auth().getUser(MEMBER_UID)).customClaims || {};
  console.log(`member uid=${MEMBER_UID} claims=${JSON.stringify(claims)} group=${GROUP_ID}`);

  const token = await admin.auth().createCustomToken(MEMBER_UID);
  await signInWithCustomToken(cAuth, token);
  console.log("signed in as", cAuth.currentUser.uid);
  // Force the ID token to include current custom claims.
  await cAuth.currentUser.getIdToken(true);

  // 1. group doc read (rule: isSignedIn)
  try {
    const g = await getDoc(doc(cDb, "groups_mobile", GROUP_ID));
    console.log(`group doc read: OK exists=${g.exists()} GroupMembers.len=${(g.data()?.GroupMembers || []).length} includesMe=${(g.data()?.GroupMembers || []).includes(MEMBER_UID)}`);
  } catch (e) {
    console.log("group doc read: DENIED", e.code || e.message);
  }

  // 2. threads list (rule: member/staff)  <-- the failing read
  try {
    const snap = await getDocs(query(collection(cDb, "groups_mobile", GROUP_ID, "threads"), orderBy("created_at", "desc"), limit(15)));
    console.log(`threads list: OK count=${snap.size}`);
  } catch (e) {
    console.log("threads list: DENIED", e.code || e.message);
  }

  process.exit(0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
