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

    // Validate required fields
    if (!name || !price) {
      return res.status(400).json({ error: "Name and price are required" });
    }

    // Handle multiple file uploads from req.files
    let mainImageUrl = "";
    let extraImage1Url = "";
    let extraImage2Url = "";
    let videoUrl = "";

    if (req.files) {
      if (req.files["mainImage"] && req.files["mainImage"][0]) {
        mainImageUrl = await uploadToStorage(req.files["mainImage"][0]);
      }
      if (req.files["extraImage1"] && req.files["extraImage1"][0]) {
        extraImage1Url = await uploadToStorage(req.files["extraImage1"][0]);
      }
      if (req.files["extraImage2"] && req.files["extraImage2"][0]) {
        extraImage2Url = await uploadToStorage(req.files["extraImage2"][0]);
      }
      if (req.files["video"] && req.files["video"][0]) {
        videoUrl = await uploadToStorage(req.files["video"][0], "videos");
      }
    }

    const newProduct = {
      name,
      category: category || "",
      price: Number(price) || 0,
      unit: unit || "bag",
      stock: stock ? Number(stock) : 0,
      moq: moq ? Number(moq) : 1,
      locations: locations || "Nationwide",
      description: description || "",
      imageUrl: mainImageUrl,
      gallery: [extraImage1Url, extraImage2Url].filter(Boolean),
      videoUrl,
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

    if (category) {
      query = query.where("category", "==", category);
    }

    const snapshot = await query.orderBy("createdAt", "desc").get();
    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(products);
  } catch (error) {
    console.error("Get products error:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch products: " + error.message });
  }
};

// 3. UPDATE/EDIT PRODUCT
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Get current product data first
    const productRef = db.collection("products").doc(id);
    const currentDoc = await productRef.get();

    if (!currentDoc.exists) {
      return res.status(404).json({ error: "Product not found" });
    }

    const currentData = currentDoc.data();
    const updates = {};

    // Only update fields that are provided
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.category !== undefined) updates.category = req.body.category;
    if (req.body.price !== undefined) updates.price = Number(req.body.price);
    if (req.body.unit !== undefined) updates.unit = req.body.unit;
    if (req.body.stock !== undefined) updates.stock = Number(req.body.stock);
    if (req.body.moq !== undefined) updates.moq = Number(req.body.moq);
    if (req.body.locations !== undefined)
      updates.locations = req.body.locations;
    if (req.body.description !== undefined)
      updates.description = req.body.description;
    if (req.body.status !== undefined) updates.status = req.body.status;

    // Handle new media uploads if provided
    if (req.files) {
      // Update main image
      if (req.files["mainImage"] && req.files["mainImage"][0]) {
        updates.imageUrl = await uploadToStorage(req.files["mainImage"][0]);
      }

      // Update gallery images
      let gallery = currentData.gallery || [];

      if (req.files["extraImage1"] && req.files["extraImage1"][0]) {
        const url = await uploadToStorage(req.files["extraImage1"][0]);
        gallery[0] = url;
      }

      if (req.files["extraImage2"] && req.files["extraImage2"][0]) {
        const url = await uploadToStorage(req.files["extraImage2"][0]);
        gallery[1] = url;
      }

      updates.gallery = gallery.filter(Boolean);

      // Update video
      if (req.files["video"] && req.files["video"][0]) {
        updates.videoUrl = await uploadToStorage(
          req.files["video"][0],
          "videos",
        );
      }
    }

    updates.updatedAt = new Date().toISOString();

    await productRef.update(updates);

    // Get updated product
    const updatedDoc = await productRef.get();
    res.status(200).json({
      message: "Product updated successfully",
      id,
      product: { id: updatedDoc.id, ...updatedDoc.data() },
    });
  } catch (error) {
    console.error("Update product error:", error);
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
    console.error("Get single product error:", error);
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

    // Optional: Delete the images from storage
    const productData = doc.data();

    // Delete main image
    if (productData.imageUrl) {
      try {
        const urlParts = productData.imageUrl.split("/");
        const fileName = decodeURIComponent(urlParts[urlParts.length - 1]);
        await bucket.file(`products/${fileName}`).delete();
      } catch (err) {
        console.log("Could not delete main image:", err.message);
      }
    }

    // Delete gallery images
    if (productData.gallery && productData.gallery.length > 0) {
      for (const imageUrl of productData.gallery) {
        try {
          const urlParts = imageUrl.split("/");
          const fileName = decodeURIComponent(urlParts[urlParts.length - 1]);
          await bucket.file(`products/${fileName}`).delete();
        } catch (err) {
          console.log("Could not delete gallery image:", err.message);
        }
      }
    }

    // Delete video
    if (productData.videoUrl) {
      try {
        const urlParts = productData.videoUrl.split("/");
        const fileName = decodeURIComponent(urlParts[urlParts.length - 1]);
        await bucket.file(`videos/${fileName}`).delete();
      } catch (err) {
        console.log("Could not delete video:", err.message);
      }
    }

    await productRef.delete();
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ error: "Delete failed: " + error.message });
  }
};

module.exports = exports;
