const { db, bucket } = require("../config/firebase");

// 1. UPLOAD CERTIFICATION LOGO
exports.uploadCertification = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Logo file required" });

    const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, "_")}`;
    const fileRef = bucket.file(`regenessa/certifications/${fileName}`);

    await fileRef.save(file.buffer, {
      metadata: { contentType: file.mimetype },
    });
    await fileRef.makePublic();

    const url = `https://storage.googleapis.com/${bucket.name}/regenessa/certifications/${fileName}`;

    const docRef = await db.collection("certifications").add({
      url,
      name: req.body.name || "Certification",
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ id: docRef.id, url, name: req.body.name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. GET ALL CERTIFICATIONS
exports.getCertifications = async (req, res) => {
  try {
    const snapshot = await db
      .collection("certifications")
      .orderBy("createdAt", "desc")
      .get();
    const certs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(certs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//3. DELETE
exports.deleteCertification = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection("certifications").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Certification not found" });
    }

    const { url } = doc.data();

    // Remove from Firebase Storage
    if (url) {
      try {
        const pathParts = url.split(`${bucket.name}/`);
        if (pathParts.length > 1) {
          const filePath = pathParts[1];
          await bucket.file(filePath).delete();
        }
      } catch (err) {
        console.error("Storage cleanup failed:", err.message);
      }
    }

    // Remove from Firestore
    await docRef.delete();
    res.status(200).json({ success: true, message: "Certification removed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
