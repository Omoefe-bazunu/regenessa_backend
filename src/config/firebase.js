const admin = require("firebase-admin");

let db;
let bucket;

try {
  const serviceAccount = require("../../serviceAccountKey.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // Updated to your specific bucket
    storageBucket: "lubby-59574.appspot.com",
  });

  db = admin.firestore();
  bucket = admin.storage().bucket();

  console.log("Firebase Admin initialized (Firestore & Storage)");
} catch (err) {
  console.error("Firebase initialization failed:", err.message);
  process.exit(1);
}

// admin is exported so you can use admin.auth() in your middleware
module.exports = { db, bucket, admin };
