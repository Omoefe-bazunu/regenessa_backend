const admin = require("firebase-admin");

let db;
let bucket;

try {
  const serviceAccount = require("../../serviceAccountKey.json");

  // Initialize the app first
  const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "lubby-59574.appspot.com",
  });

  // Get Firestore instance from the app, then specify the database
  db = admin.firestore(app);
  db.settings({ databaseId: "regenessa" });

  bucket = admin.storage().bucket();

  console.log(
    "Firebase Admin initialized (Firestore & Storage) - Database: regenessa",
  );
} catch (err) {
  console.error("Firebase initialization failed:", err.message);
  process.exit(1);
}

// Storage helpers for the "regenessa" folder structure
const storage = {
  getFile: (subfolder, filename) => {
    return bucket.file(`regenessa/${subfolder}/${filename}`);
  },

  orders: (filename) => bucket.file(`regenessa/orders/${filename}`),
  products: (filename) => bucket.file(`regenessa/products/${filename}`),

  folder: (subfolder) => ({
    file: (filename) => bucket.file(`regenessa/${subfolder}/${filename}`),
    upload: async (localPath, filename) => {
      const destination = `regenessa/${subfolder}/${filename}`;
      await bucket.upload(localPath, { destination });
      return bucket.file(destination);
    },
  }),

  bucket: bucket,
};

module.exports = { db, bucket, admin, storage };


