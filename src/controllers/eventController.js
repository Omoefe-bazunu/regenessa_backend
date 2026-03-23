const { db, bucket } = require("../config/firebase");

// Helper: Stream upload to Firebase
const uploadToStorage = (file, folder = "events") => {
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

// 1. CREATE EVENT
exports.createEvent = async (req, res) => {
  try {
    // 🛠️ ADD ctaText HERE
    const { title, description, date, ctaText, ctaLink, status } = req.body;
    const files = req.files;

    if (!files || !files.image)
      return res.status(400).json({ error: "Main image is required" });

    const mainImageUrl = await uploadToStorage(files.image[0]);
    const galleryUrls = [];
    if (files.gallery) {
      const uploadPromises = files.gallery.map((file) =>
        uploadToStorage(file, "event_galleries"),
      );
      galleryUrls.push(...(await Promise.all(uploadPromises)));
    }

    const newEvent = {
      title,
      description,
      date,
      ctaText, // 🛠️ SAVE TO FIRESTORE
      ctaLink,
      status,
      image: mainImageUrl,
      gallery: galleryUrls,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("events").add(newEvent);
    res.status(201).json({ id: docRef.id, ...newEvent });
  } catch (error) {
    res.status(500).json({ error: "Failed to create event" });
  }
};

// controllers/eventController.js

exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const files = req.files;

    const docRef = db.collection("events").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Event not found" });

    // 🛠️ FIX: Only include fields that are actually sent in the request
    let updatedData = {
      updatedAt: new Date().toISOString(),
    };

    // Only add text fields if they are present in req.body
    const fields = [
      "title",
      "description",
      "date",
      "ctaText",
      "ctaLink",
      "status",
    ];
    fields.forEach((field) => {
      if (body[field] !== undefined) {
        updatedData[field] = body[field];
      }
    });

    // Handle Main Image Update
    if (files && files.image && files.image.length > 0) {
      // Cleanup old image if you want (optional)
      updatedData.image = await uploadToStorage(files.image[0], "events");
    }

    // Handle Gallery Update
    if (files && files.gallery && files.gallery.length > 0) {
      const uploadPromises = files.gallery.map((file) =>
        uploadToStorage(file, "event_galleries"),
      );
      // This will replace the old gallery with the new 10 images
      updatedData.gallery = await Promise.all(uploadPromises);
    }

    // Firestore will now only update the fields we actually sent
    await docRef.update(updatedData);

    res.status(200).json({
      success: true,
      message: "Event synchronized successfully",
    });
  } catch (error) {
    console.error("Backend Update Crash:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

// 2. GET ALL EVENTS
exports.getEvents = async (req, res) => {
  try {
    const snapshot = await db
      .collection("events")
      .orderBy("createdAt", "desc")
      .get();
    const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
  }
};

// 3. GET SINGLE EVENT (This was missing!)
exports.getEventById = async (req, res) => {
  try {
    const doc = await db.collection("events").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Event not found" });
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: "Error fetching event" });
  }
};

// 5. DELETE EVENT
exports.deleteEvent = async (req, res) => {
  try {
    const docRef = db.collection("events").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });

    const data = doc.data();
    const allImages = [data.image, ...(data.gallery || [])];
    const deletePromises = allImages.map((url) => {
      if (!url) return null;
      const path = url.split(`${bucket.name}/`)[1];
      return bucket
        .file(path)
        .delete()
        .catch(() => null);
    });

    await Promise.all(deletePromises);
    await docRef.delete();
    res.status(200).json({ message: "Event and images purged" });
  } catch (error) {
    res.status(500).json({ error: "Deletion failed" });
  }
};
