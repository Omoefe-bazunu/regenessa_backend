const { db, bucket } = require("../config/firebase");

// Helper function to handle Firebase Storage uploads
const uploadToStorage = async (file, folder = "products") => {
  if (!file) return "";
  const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, "_")}`;
  const filePath = `${folder}/${fileName}`;
  const blob = bucket.file(filePath);

  await blob.save(file.buffer, {
    metadata: { contentType: file.mimetype },
  });

  await blob.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
};

// 1. CREATE PRODUCT
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      unit,
      stock,
      moq,
      locations,
      description,
      status,
    } = req.body;

    // Handle multiple file uploads from req.files
    const mainImageUrl = req.files["mainImage"]
      ? await uploadToStorage(req.files["mainImage"][0])
      : "";
    const extraImage1 = req.files["extraImage1"]
      ? await uploadToStorage(req.files["extraImage1"][0])
      : "";
    const extraImage2 = req.files["extraImage2"]
      ? await uploadToStorage(req.files["extraImage2"][0])
      : "";
    const videoUrl = req.files["video"]
      ? await uploadToStorage(req.files["video"][0], "videos")
      : "";

    const newProduct = {
      name,
      category,
      price: Number(price),
      unit,
      stock: stock ? Number(stock) : 0,
      moq: Number(moq) || 1, // New Field
      locations: locations || "Nationwide", // New Field
      description,
      imageUrl: mainImageUrl, // Keeping this as primary for backward compatibility
      gallery: [extraImage1, extraImage2].filter(Boolean), // Array for extra images
      videoUrl, // New Field
      status: status || "active",
      reviewCount: 0,
      avgRating: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection("products").add(newProduct);
    res.status(201).json({ id: docRef.id, ...newProduct });
  } catch (error) {
    console.error("Create product error:", error);
    res
      .status(500)
      .json({ error: "Failed to create product: " + error.message });
  }
};

// 2. GET ALL PRODUCTS
exports.getAllProducts = async (req, res) => {
  try {
    const { category } = req.query;
    let query = db.collection("products");

    if (category) query = query.where("category", "==", category);

    const snapshot = await query.orderBy("createdAt", "desc").get();
    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(products);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch products: " + error.message });
  }
};

// 3. UPDATE/EDIT PRODUCT
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Handle new media uploads if provided
    if (req.files) {
      if (req.files["mainImage"])
        updates.imageUrl = await uploadToStorage(req.files["mainImage"][0]);

      // Update gallery if new extras are provided
      const currentDoc = await db.collection("products").doc(id).get();
      const currentData = currentDoc.data();
      let gallery = currentData.gallery || [];

      if (req.files["extraImage1"])
        gallery[0] = await uploadToStorage(req.files["extraImage1"][0]);
      if (req.files["extraImage2"])
        gallery[1] = await uploadToStorage(req.files["extraImage2"][0]);

      updates.gallery = gallery.filter(Boolean);
      if (req.files["video"])
        updates.videoUrl = await uploadToStorage(
          req.files["video"][0],
          "videos",
        );
    }

    // Ensure numbers are stored as numbers
    if (updates.price) updates.price = Number(updates.price);
    if (updates.stock) updates.stock = Number(updates.stock);
    if (updates.moq) updates.moq = Number(updates.moq);

    updates.updatedAt = new Date().toISOString();

    const productRef = db.collection("products").doc(id);
    await productRef.update(updates);

    res.status(200).json({ message: "Product updated successfully", id });
  } catch (error) {
    res.status(500).json({ error: "Update failed: " + error.message });
  }
};

// 4. GET SINGLE PRODUCT
exports.getSingleProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("products").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: "Error fetching product: " + error.message });
  }
};

// 5. DELETE PRODUCT
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productRef = db.collection("products").doc(id);
    const doc = await productRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Optional: Delete the image from storage
    const productData = doc.data();
    if (productData.imageUrl) {
      try {
        // Extract filename from URL
        const urlParts = productData.imageUrl.split("/");
        const fileName = urlParts[urlParts.length - 1];
        await bucket.file(`products/${fileName}`).delete();
      } catch (err) {
        console.log("Could not delete image:", err.message);
        // Continue with product deletion even if image deletion fails
      }
    }

    await productRef.delete();
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ error: "Delete failed: " + error.message });
  }
};
