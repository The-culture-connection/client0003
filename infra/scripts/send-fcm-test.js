const path = require("path");
const admin = require("firebase-admin");

const token = process.argv[2];
if (!token || !token.trim()) {
  console.error("Usage: node infra/scripts/send-fcm-test.js <FCM_TOKEN>");
  process.exit(1);
}

const keyPathArg = process.argv[3];
const serviceAccountPath = keyPathArg && keyPathArg.trim()
  ? path.resolve(keyPathArg.trim())
  : path.resolve(
      __dirname,
      "..",
      "..",
      "ExpansionNetworkApp",
      "mortar-stage-firebase-adminsdk-fbsvc-5bfe3d34b4.json"
    );

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function main() {
  try {
    const message = {
      token: token.trim(),
      notification: {
        title: "Direct Admin SDK Test",
        body: "If this arrives, APNs+FCM routing is good.",
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
      data: {
        deep_link: "/home",
        source: "admin_sdk_test",
      },
    };

    const response = await admin.messaging().send(message);
    console.log("SUCCESS messageId:", response);
  } catch (err) {
    console.error("SEND FAILED");
    console.error("code:", err.code || "(no code)");
    console.error("message:", err.message || "(no message)");
    if (err.errorInfo) {
      console.error("errorInfo:", JSON.stringify(err.errorInfo, null, 2));
    }
    if (err.stack) {
      console.error("stack:", err.stack);
    }
    process.exitCode = 2;
  }
}

main();
