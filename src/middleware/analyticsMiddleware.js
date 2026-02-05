const { db } = require("../config/firebase");

const logProductView = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const country = req.headers["x-vercel-ip-country"] || "Nigeria";
    const userAgent = req.headers["user-agent"] || "";

    // Ignore bots
    if (userAgent.includes("bot") || userAgent.includes("spider")) {
      return next();
    }

    // Get product name
    const productDoc = await db.collection("products").doc(productId).get();
    const productName = productDoc.exists
      ? productDoc.data().name
      : "Unknown Product";

    // CREATE UNIQUE ID: productId + today's date
    const today = new Date().toISOString().split("T")[0];
    const uniqueLogId = `${productId}_${today}`;

    // Use .set() with merge instead of .add() to prevent duplicates
    await db.collection("product_analytics").doc(uniqueLogId).set(
      {
        type: "view",
        productId,
        productName,
        country,
        timestamp: new Date().toISOString(),
      },
      { merge: true }, // Updates timestamp if already exists today
    );

    next();
  } catch (error) {
    console.error("Analytics middleware error:", error);
    next(); // Silent fail
  }
};

module.exports = { logProductView };
