const { db, bucket } = require("../config/firebase");

/**
 * OPTIMIZED: Streaming upload for better performance on Render.
 */
const uploadToStorageStream = (file, folder = "testimonials") => {
  return new Promise((resolve, reject) => {
    if (!file) resolve("");

    const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, "_")}`;
    const fileRef = bucket.file(`regenessa/${folder}/${fileName}`);

    const stream = fileRef.createWriteStream({
      metadata: { contentType: file.mimetype },
      resumable: false,
    });

    stream.on("error", (err) => reject(err));

    stream.on("finish", async () => {
      await fileRef.makePublic();
      resolve(
        `https://storage.googleapis.com/${bucket.name}/regenessa/${folder}/${fileName}`,
      );
    });

    stream.end(file.buffer);
  });
};

// 1. CREATE EVIDENCE
exports.createTestimonial = async (req, res) => {
  try {
    const { regimenUsed, type } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "Media required" });

    const storageFolder =
      type === "video" ? "testimonials/videos" : "testimonials/images";
    const mediaUrl = await uploadToStorageStream(file, storageFolder);

    const newEvidence = {
      regimenUsed: regimenUsed || "Unspecified",
      type: type || "image",
      mediaUrl,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("testimonials").add(newEvidence);
    res.status(201).json({ success: true, id: docRef.id, ...newEvidence });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: "Upload failed: " + error.message });
  }
};

// 2. GET ALL EVIDENCE (With Type Filtering & Accurate Pagination)
exports.getTestimonials = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;
    const type = req.query.type; // Extract type (video or image)
    const skip = (page - 1) * limit;

    let query = db.collection("testimonials");

    // CRITICAL: Filter by type if provided
    if (type) {
      query = query.where("type", "==", type);
    }

    // Get total count for THIS SPECIFIC TYPE for accurate pagination
    const totalSnapshot = await query.count().get();
    const totalItems = totalSnapshot.data().count;

    // Fetch paginated data for the specific type
    const snapshot = await query
      .orderBy("createdAt", "desc")
      .offset(skip)
      .limit(limit)
      .get();

    const evidence = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({
      evidence,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
      totalItems,
    });
  } catch (error) {
    console.error("Testimonial Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch testimonials" });
  }
};

// 3. DELETE EVIDENCE
exports.deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection("testimonials").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Evidence not found" });
    }

    const { mediaUrl } = doc.data();

    if (mediaUrl) {
      try {
        const pathParts = mediaUrl.split(`${bucket.name}/`);
        if (pathParts.length > 1) {
          const filePath = pathParts[1];
          await bucket.file(filePath).delete();
        }
      } catch (storageErr) {
        console.error("Storage cleanup failed:", storageErr.message);
      }
    }

    await docRef.delete();
    res
      .status(200)
      .json({ success: true, message: "Asset removed successfully" });
  } catch (error) {
    res.status(500).json({ error: "Deletion failed: " + error.message });
  }
};
