//This covers adding products, updating/editing, deleting, and getting both all the products and a single product.
const { db } = require("../config/firebase");

// 1. CREATE PRODUCT
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      subCategory,
      price,
      unit,
      stock,
      description,
      imageUrl,
      status,
    } = req.body;

    const newProduct = {
      name,
      category, // e.g., "Rice"
      subCategory, // e.g., "Nigerian Rice"
      price: Number(price),
      unit, // e.g., "50kg Bag"
      stock: Number(stock),
      description,
      imageUrl,
      status: status || "active", // 'active' or 'out-of-stock'
      ratings: [],
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

// 2. GET ALL PRODUCTS (with filtering)
exports.getAllProducts = async (req, res) => {
  try {
    const { category, subCategory } = req.query;
    let query = db.collection("products");

    if (category) query = query.where("category", "==", category);
    if (subCategory) query = query.where("subCategory", "==", subCategory);

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

// 4. UPDATE/EDIT PRODUCT
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Ensure we track when it was last edited
    updates.updatedAt = new Date().toISOString();

    const productRef = db.collection("products").doc(id);
    const doc = await productRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Product not found" });
    }

    await productRef.update(updates);
    res.status(200).json({ message: "Product updated successfully", id });
  } catch (error) {
    res.status(500).json({ error: "Update failed: " + error.message });
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

    // Optional: You could also delete the image from Firebase Storage here if needed
    await productRef.delete();
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Delete failed: " + error.message });
  }
};
