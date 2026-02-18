const { db } = require("../config/firebase");

// Get Featured Products (Public)
const getFeaturedProducts = async (req, res) => {
  try {
    const doc = await db.collection("settings").doc("featured_products").get();

    if (!doc.exists) {
      return res.status(200).json([]);
    }

    const { productIds } = doc.data();

    if (!productIds || productIds.length === 0) {
      return res.status(200).json([]);
    }

    // Fetch products in the order specified
    const products = [];
    for (const id of productIds) {
      const productDoc = await db.collection("products").doc(id).get();
      if (productDoc.exists) {
        products.push({ id: productDoc.id, ...productDoc.data() });
      }
    }

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Set Featured Products (Admin)
const setFeaturedProducts = async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length > 3) {
      return res
        .status(400)
        .json({ error: "Must provide array of 1-3 product IDs" });
    }

    await db.collection("settings").doc("featured_products").set({
      productIds,
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json({ message: "Featured products updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getFeaturedProducts,
  setFeaturedProducts,
};
