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

// USE CASE FOR THE STORAGE

// const { storage } = require('./path/to/firebase-config');

// // Upload to orders folder
// await storage.orders('order-123.pdf').save(pdfBuffer);

// // Upload to products folder
// await storage.products('product-image.jpg').save(imageBuffer);

// // Use generic folder helper
// await storage.folder('invoices').file('invoice-456.pdf').save(buffer);

// // Upload from local file
// await storage.folder('orders').upload('./local-file.pdf', 'order-123.pdf');

// // Get download URL
// const file = storage.products('product-image.jpg');
// const [url] = await file.getSignedUrl({
//   action: 'read',
//   expires: '03-01-2030'
// });

// // Delete a file
// await storage.orders('old-order.pdf').delete();
