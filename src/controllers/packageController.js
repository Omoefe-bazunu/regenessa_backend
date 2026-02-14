const { db } = require("../config/firebase");

// 1. CREATE package (COMBO)
exports.createpackage = async (req, res) => {
  try {
    const { ailmentName, productIds, description, instructions } = req.body;

    if (!ailmentName || !productIds || productIds.length === 0) {
      return res
        .status(400)
        .json({ error: "Ailment name and products are required" });
    }

    const newpackage = {
      ailmentName: ailmentName.toUpperCase(),
      productIds, // Array of IDs from the products collection
      description: description || "",
      instructions: instructions || "",
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("packages").add(newpackage);
    res.status(201).json({ id: docRef.id, ...newpackage });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to create package: " + error.message });
  }
};

// 2. GET ALL packageS (With Populated Product Data)
exports.getAllpackages = async (req, res) => {
  try {
    const packageSnapshot = await db
      .collection("packages")
      .orderBy("ailmentName", "asc")
      .get();

    // We need to fetch the actual product details for each ID in the package
    const packages = await Promise.all(
      packageSnapshot.docs.map(async (doc) => {
        const data = doc.data();

        // Fetch details for every product in this package
        const productPromises = data.productIds.map((id) =>
          db.collection("products").doc(id).get(),
        );
        const productDocs = await Promise.all(productPromises);

        const products = productDocs
          .filter((pDoc) => pDoc.exists)
          .map((pDoc) => ({ id: pDoc.id, ...pDoc.data() }));

        return {
          id: doc.id,
          ...data,
          products, // This now contains full product objects (price, image, etc.)
        };
      }),
    );

    res.status(200).json(packages);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch packages: " + error.message });
  }
};

// 3. DELETE package
exports.deletepackage = async (req, res) => {
  try {
    await db.collection("packages").doc(req.params.id).delete();
    res.status(200).json({ message: "package removed successfully" });
  } catch (error) {
    res.status(500).json({ error: "Delete failed: " + error.message });
  }
};
