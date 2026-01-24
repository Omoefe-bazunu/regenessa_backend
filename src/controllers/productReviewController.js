const { db } = require("../config/firebase");

// 1. ADD REVIEW (With Transaction)
exports.addProductReview = async (req, res) => {
  const { productId } = req.params;
  const { fullName, email, statement, rating } = req.body;
  const productRef = db.collection("products").doc(productId);
  const reviewRef = db.collection("product_reviews").doc();

  try {
    await db.runTransaction(async (t) => {
      const doc = await t.get(productRef);
      if (!doc.exists) throw new Error("Product not found");

      const data = doc.data();
      const newCount = (data.reviewCount || 0) + 1;
      const oldSum = (data.avgRating || 0) * (data.reviewCount || 0);
      const newAvg = (oldSum + Number(rating)) / newCount;

      t.set(reviewRef, {
        productId,
        fullName,
        email,
        statement,
        rating: Number(rating),
        createdAt: new Date().toISOString(),
      });

      t.update(productRef, {
        reviewCount: newCount,
        avgRating: parseFloat(newAvg.toFixed(1)),
      });
    });
    res.status(201).json({ message: "Review added successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. GET ALL REVIEWS FOR A PRODUCT
exports.getProductReviews = async (req, res) => {
  try {
    const snapshot = await db
      .collection("product_reviews")
      .where("productId", "==", req.params.productId)
      .orderBy("createdAt", "desc")
      .get();

    const reviews = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. GET SINGLE REVIEW
exports.getSingleReview = async (req, res) => {
  try {
    const doc = await db
      .collection("product_reviews")
      .doc(req.params.reviewId)
      .get();
    if (!doc.exists) return res.status(404).json({ error: "Review not found" });
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. UPDATE REVIEW (Recalculates Rating)
exports.updateProductReview = async (req, res) => {
  const { reviewId } = req.params;
  const { statement, rating } = req.body;
  const reviewRef = db.collection("product_reviews").doc(reviewId);

  try {
    await db.runTransaction(async (t) => {
      const revDoc = await t.get(reviewRef);
      if (!revDoc.exists) throw new Error("Review not found");

      const { productId, rating: oldRating } = revDoc.data();
      const productRef = db.collection("products").doc(productId);
      const prodDoc = await t.get(productRef);

      if (prodDoc.exists && oldRating !== Number(rating)) {
        const data = prodDoc.data();
        const newSum =
          data.avgRating * data.reviewCount - oldRating + Number(rating);
        t.update(productRef, {
          avgRating: parseFloat((newSum / data.reviewCount).toFixed(1)),
        });
      }

      t.update(reviewRef, {
        statement,
        rating: Number(rating),
        updatedAt: new Date().toISOString(),
      });
    });
    res.status(200).json({ message: "Review updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. DELETE REVIEW
exports.deleteProductReview = async (req, res) => {
  const reviewRef = db.collection("product_reviews").doc(req.params.reviewId);

  try {
    await db.runTransaction(async (t) => {
      const revDoc = await t.get(reviewRef);
      if (!revDoc.exists) throw new Error("Review not found");

      const { productId, rating } = revDoc.data();
      const productRef = db.collection("products").doc(productId);
      const prodDoc = await t.get(productRef);

      if (prodDoc.exists) {
        const data = prodDoc.data();
        const newCount = Math.max(0, data.reviewCount - 1);
        const newAvg =
          newCount === 0
            ? 0
            : (data.avgRating * data.reviewCount - rating) / newCount;
        t.update(productRef, {
          reviewCount: newCount,
          avgRating: parseFloat(newAvg.toFixed(1)),
        });
      }
      t.delete(reviewRef);
    });
    res.status(200).json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET ALL REVIEWS (GLOBAL) for Home Page Testimonials
exports.getAllReviewsGlobal = async (req, res) => {
  try {
    // 1. Log the Project ID being used by the Admin SDK
    console.log("--- DEBUG START ---");
    console.log("Firebase Project ID in use:", db.projectId || "Not Set");

    // 2. Fetch the collection
    const snapshot = await db.collection("product_reviews").get();

    // 3. Log the result size
    console.log("Count found in product_reviews:", snapshot.size);
    console.log("--- DEBUG END ---");

    const reviews = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(reviews);
  } catch (err) {
    console.error("DEBUG ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};
