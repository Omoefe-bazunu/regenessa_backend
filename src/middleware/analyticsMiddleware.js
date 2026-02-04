const { db } = require("../config/firebase");

const logProductView = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const country = req.headers["x-vercel-ip-country"] || "Nigeria";

    // Standard check to ignore bots/crawlers to save costs
    const userAgent = req.headers["user-agent"] || "";
    if (userAgent.includes("bot") || userAgent.includes("spider")) {
      return next();
    }

    const productDoc = await db.collection("products").doc(productId).get();
    const productName = productDoc.exists
      ? productDoc.data().name
      : "Unknown Product";

    await db.collection("product_analytics").add({
      type: "view",
      productId,
      productName,
      country,
      timestamp: new Date().toISOString(),
    });

    next();
  } catch (error) {
    next(); // Silent fail to ensure page loads
  }
};

module.exports = { logProductView };
