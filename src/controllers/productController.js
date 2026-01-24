const { db, bucket } = require("../config/firebase");

// 1. CREATE PRODUCT
exports.createProduct = async (req, res) => {
  try {
    const { name, category, price, unit, stock, description, status } =
      req.body;

    let imageUrl = "";

    // Handle file upload if present
    if (req.file) {
      const fileName = `${Date.now()}_${req.file.originalname}`;
      const filePath = `products/${fileName}`;
      const file = bucket.file(filePath);

      // Upload the file
      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      // Make file public
      await file.makePublic();

      // Get public URL
      imageUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    }

    const newProduct = {
      name,
      category,
      price: Number(price),
      unit,
      stock: stock ? Number(stock) : 0,
      description,
      imageUrl,
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
    const updates = req.body;

    // Handle new image upload if present
    if (req.file) {
      const fileName = `${Date.now()}_${req.file.originalname}`;
      const filePath = `products/${fileName}`;
      const file = bucket.file(filePath);

      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      await file.makePublic();
      updates.imageUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      // Optional: Delete old image
      // const productRef = db.collection("products").doc(id);
      // const doc = await productRef.get();
      // if (doc.exists && doc.data().imageUrl) {
      //   const oldFileName = doc.data().imageUrl.split('/').pop();
      //   await bucket.file(`products/${oldFileName}`).delete().catch(() => {});
      // }
    }

    delete updates.subCategory;

    if (updates.price) updates.price = Number(updates.price);
    if (updates.stock) updates.stock = Number(updates.stock);

    updates.updatedAt = new Date().toISOString();

    const productRef = db.collection("products").doc(id);
    const doc = await productRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Product not found" });
    }

    await productRef.update(updates);
    res.status(200).json({ message: "Product updated successfully", id });
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
