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
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: "Name and price are required" });
    }

    let mainImageUrl = "";
    let galleryUrls = [];

    if (req.files) {
      if (req.files["mainImage"] && req.files["mainImage"][0]) {
        mainImageUrl = await uploadToStorage(
          req.files["mainImage"][0],
          "products",
        );
      }

      // Explicitly check for your route field names: extraImage1 and extraImage2
      const galleryFields = ["extraImage1", "extraImage2"];
      for (const field of galleryFields) {
        if (req.files[field] && req.files[field][0]) {
          const url = await uploadToStorage(req.files[field][0], "products");
          galleryUrls.push(url);
        }
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
          ? benefits.split(",")
          : [],
      targetAilments: Array.isArray(targetAilments)
        ? targetAilments
        : targetAilments
          ? targetAilments.split(",")
          : [],
      imageUrl: mainImageUrl,
      gallery: galleryUrls,
      stockCount: Number(stockCount) || 0,
      featured: featured === "true" || featured === true,
      status: status || "active",
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

// 3. GET SINGLE PRODUCT (The missing function)
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

    const updates = { ...req.body };

    if (updates.price) updates.price = Number(updates.price);
    if (updates.stockCount) updates.stockCount = Number(updates.stockCount);
    if (updates.featured)
      updates.featured =
        updates.featured === "true" || updates.featured === true;

    if (updates.benefits && !Array.isArray(updates.benefits))
      updates.benefits = updates.benefits.split(",");
    if (updates.targetAilments && !Array.isArray(updates.targetAilments))
      updates.targetAilments = updates.targetAilments.split(",");

    if (req.files && req.files["mainImage"]) {
      updates.imageUrl = await uploadToStorage(
        req.files["mainImage"][0],
        "products",
      );
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

// Clean Export Object
module.exports = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
};
