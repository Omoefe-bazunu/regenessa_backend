const { db, bucket } = require("../config/firebase");

/**
 * Helper: Stream upload to Firebase Storage
 * Handles specific folders for better organization (e.g., /blog or /authors)
 */
const uploadToStorageStream = (file, folder = "blog") => {
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

// 1. CREATE BLOG POST
exports.createBlogPost = async (req, res) => {
  try {
    const { title, slug, excerpt, imageSource, imageLink, author, body } =
      req.body;
    const files = req.files; // Using req.files for multiple fields

    if (!files || !files.image) {
      return res.status(400).json({ error: "Featured image is required" });
    }

    // Upload both images if provided
    const imageUrl = await uploadToStorageStream(files.image[0], "blog");
    const authorImageUrl = files.authorImage
      ? await uploadToStorageStream(files.authorImage[0], "authors")
      : "";

    const newPost = {
      title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      excerpt: excerpt || "",
      imageSource: imageSource || "",
      imageLink: imageLink || "",
      author: author || "REGENESSA Editorial",
      body,
      image: imageUrl,
      authorImage: authorImageUrl,
      createdAt: new Date().toISOString(),
      likes: 0,
    };

    const docRef = await db.collection("blog").add(newPost);
    res.status(201).json({ success: true, id: docRef.id, ...newPost });
  } catch (error) {
    console.error("Blog Upload Error:", error);
    res.status(500).json({ error: "Failed to publish article" });
  }
};

// 2. GET ALL POSTS (Paginated & Latest First)
exports.getBlogPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    const collectionRef = db.collection("blog");
    const totalSnapshot = await collectionRef.count().get();
    const totalItems = totalSnapshot.data().count;

    const snapshot = await collectionRef
      .orderBy("createdAt", "desc")
      .offset(skip)
      .limit(limit)
      .get();

    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({
      posts,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Blog Fetch Error:", error);
    res.status(500).json({ error: "Failed to retrieve articles" });
  }
};

// 3. GET SINGLE POST (Hybrid Search: Slug or ID)
exports.getBlogPostById = async (req, res) => {
  try {
    const { id } = req.params;

    // First: Search by the custom Slug field
    const slugQuery = await db
      .collection("blog")
      .where("slug", "==", id)
      .limit(1)
      .get();

    if (!slugQuery.empty) {
      const doc = slugQuery.docs[0];
      return res.status(200).json({ id: doc.id, ...doc.data() });
    }

    // Fallback: Search by the Document ID
    const docRef = db.collection("blog").doc(id);
    const doc = await docRef.get();

    if (doc.exists) {
      return res.status(200).json({ id: doc.id, ...doc.data() });
    }

    res.status(404).json({ error: "Article not found" });
  } catch (error) {
    res.status(500).json({ error: "Error fetching article" });
  }
};

// 4. UPDATE BLOG POST
exports.updateBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, excerpt, imageSource, imageLink, author, body } =
      req.body;
    const files = req.files;

    const docRef = db.collection("blog").doc(id);
    const doc = await docRef.get();

    if (!doc.exists)
      return res.status(404).json({ error: "Article not found" });

    let updatedData = {
      title,
      slug,
      excerpt,
      imageSource,
      imageLink,
      author,
      body,
      updatedAt: new Date().toISOString(),
    };

    // Handle Featured Image Update
    if (files && files.image) {
      const oldImage = doc.data().image;
      if (oldImage) {
        const path = oldImage.split(`${bucket.name}/`)[1];
        await bucket
          .file(path)
          .delete()
          .catch(() => null);
      }
      updatedData.image = await uploadToStorageStream(files.image[0], "blog");
    }

    // Handle Author Image Update
    if (files && files.authorImage) {
      const oldAuthorImg = doc.data().authorImage;
      if (oldAuthorImg) {
        const path = oldAuthorImg.split(`${bucket.name}/`)[1];
        await bucket
          .file(path)
          .delete()
          .catch(() => null);
      }
      updatedData.authorImage = await uploadToStorageStream(
        files.authorImage[0],
        "authors",
      );
    }

    await docRef.update(updatedData);
    res.status(200).json({ success: true, message: "Article updated" });
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
};

// 5. DELETE BLOG POST (Full Cleanup)
exports.deleteBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection("blog").doc(id);
    const doc = await docRef.get();

    if (!doc.exists)
      return res.status(404).json({ error: "Article not found" });

    const data = doc.data();

    // Cleanup Featured Image
    if (data.image) {
      const path = data.image.split(`${bucket.name}/`)[1];
      await bucket
        .file(path)
        .delete()
        .catch(() => null);
    }

    // Cleanup Author Image
    if (data.authorImage) {
      const path = data.authorImage.split(`${bucket.name}/`)[1];
      await bucket
        .file(path)
        .delete()
        .catch(() => null);
    }

    await docRef.delete();
    res.status(200).json({ success: true, message: "Article removed" });
  } catch (error) {
    res.status(500).json({ error: "Deletion failed" });
  }
};
