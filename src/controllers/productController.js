const { db, bucket } = require("../config/firebase");

// Helper function for Firebase Storage
const uploadToStorage = async (file, folder = "products") => {
  if (!file) return "";
  const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, "_")}`;
  const fileRef = bucket.file(`regenessa/${folder}/${fileName}`);

  await fileRef.save(file.buffer, {
    metadata: { contentType: file.mimetype },
  });

  await fileRef.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/regenessa/${folder}/${fileName}`;
};

// 1. CREATE PRODUCT
const createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      shortDescription,
      description,
      benefits,
      targetAilments,
      stockCount,
      featured,
      status,
      setPrice,
      setQuantity,
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: "Name and price are required" });
    }

    let mainImageUrl = "";
    let galleryUrls = [];
    let videoUrl = "";

    if (req.files) {
      // Main Image
      if (req.files["mainImage"] && req.files["mainImage"][0]) {
        mainImageUrl = await uploadToStorage(
          req.files["mainImage"][0],
          "products",
        );
      }

      // Extra Images (extraImage1 and extraImage2)
      const galleryFields = ["extraImage1", "extraImage2"];
      for (const field of galleryFields) {
        if (req.files[field] && req.files[field][0]) {
          const url = await uploadToStorage(req.files[field][0], "products");
          galleryUrls.push(url);
        }
      }

      // Video File
      if (req.files["video"] && req.files["video"][0]) {
        videoUrl = await uploadToStorage(
          req.files["video"][0],
          "products/videos",
        );
      }
    }

    const newProduct = {
      name,
      category: category || "Stem Cell Supplements",
      price: Number(price) || 0,
      shortDescription: shortDescription || "",
      description: description || "",
      benefits: Array.isArray(benefits)
        ? benefits
        : benefits
          ? benefits.split(",").map((b) => b.trim())
          : [],
      targetAilments: Array.isArray(targetAilments)
        ? targetAilments
        : targetAilments
          ? targetAilments.split(",").map((t) => t.trim())
          : [],
      imageUrl: mainImageUrl,
      gallery: galleryUrls,
      videoUrl: videoUrl,
      stockCount: Number(stockCount) || 0,
      featured: featured === "true" || featured === true,
      status: status || "In Stock",
      setPrice: Number(setPrice) || 0,
      setQuantity: Number(setQuantity) || 0,
      reviewCount: 0,
      avgRating: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection("products").add(newProduct);
    res.status(201).json({ id: docRef.id, ...newProduct });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to create product: " + error.message });
  }
};

// 2. GET ALL PRODUCTS
const getAllProducts = async (req, res) => {
  try {
    const { category, featured } = req.query;
    let query = db.collection("products");

    if (category) query = query.where("category", "==", category);
    if (featured) query = query.where("featured", "==", featured === "true");

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

// 3. GET SINGLE PRODUCT
const getSingleProduct = async (req, res) => {
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

// 4. UPDATE PRODUCT
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productRef = db.collection("products").doc(id);
    const currentDoc = await productRef.get();

    if (!currentDoc.exists)
      return res.status(404).json({ error: "Product not found" });

    const currentData = currentDoc.data();
    const updates = { ...req.body };

    // Convert numeric fields
    if (updates.price) updates.price = Number(updates.price);
    if (updates.stockCount) updates.stockCount = Number(updates.stockCount);
    if (updates.featured)
      updates.featured =
        updates.featured === "true" || updates.featured === true;
    if (updates.setPrice) updates.setPrice = Number(updates.setPrice);
    if (updates.setQuantity) updates.setQuantity = Number(updates.setQuantity);

    // Convert comma-separated strings to arrays
    if (updates.benefits && !Array.isArray(updates.benefits))
      updates.benefits = updates.benefits.split(",").map((b) => b.trim());
    if (updates.targetAilments && !Array.isArray(updates.targetAilments))
      updates.targetAilments = updates.targetAilments
        .split(",")
        .map((t) => t.trim());

    // Handle file uploads
    if (req.files) {
      // Update main image
      if (req.files["mainImage"] && req.files["mainImage"][0]) {
        updates.imageUrl = await uploadToStorage(
          req.files["mainImage"][0],
          "products",
        );
      }

      // Update gallery images
      let galleryUrls = currentData.gallery || [];

      if (req.files["extraImage1"] && req.files["extraImage1"][0]) {
        const url = await uploadToStorage(
          req.files["extraImage1"][0],
          "products",
        );
        if (galleryUrls[0]) galleryUrls[0] = url;
        else galleryUrls.push(url);
      }

      if (req.files["extraImage2"] && req.files["extraImage2"][0]) {
        const url = await uploadToStorage(
          req.files["extraImage2"][0],
          "products",
        );
        if (galleryUrls[1]) galleryUrls[1] = url;
        else galleryUrls.push(url);
      }

      if (galleryUrls.length > 0) {
        updates.gallery = galleryUrls;
      }

      // Update video
      if (req.files["video"] && req.files["video"][0]) {
        updates.videoUrl = await uploadToStorage(
          req.files["video"][0],
          "products/videos",
        );
      }
    }

    updates.updatedAt = new Date().toISOString();
    await productRef.update(updates);

    res.status(200).json({ message: "Product updated successfully", id });
  } catch (error) {
    res.status(500).json({ error: "Update failed: " + error.message });
  }
};

// 5. DELETE PRODUCT
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("products").doc(id).delete();
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Delete failed: " + error.message });
  }
};

const getProductsList = async (req, res) => {
  try {
    const snapshot = await db
      .collection("products")
      .orderBy("name", "asc")
      .get();

    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
    }));

    res.status(200).json(products);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch products list: " + error.message });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  getProductsList,
};
