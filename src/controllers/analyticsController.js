const { db } = require("../config/firebase");

// Get Product Analytics Dashboard
const getProductAnalytics = async (req, res) => {
  try {
    const snapshot = await db
      .collection("product_analytics")
      .where("type", "==", "view")
      .orderBy("timestamp", "desc")
      .limit(1000)
      .get();

    const analytics = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // FORCE WAT (West Africa Time) Timezone
        formattedDate: new Date(data.timestamp).toLocaleString("en-NG", {
          timeZone: "Africa/Lagos",
          dateStyle: "medium",
          timeStyle: "short",
        }),
      };
    });

    const insights = calculateInsights(analytics);
    res.status(200).json({ analytics, insights });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper: Calculate Insights
const calculateInsights = (analytics) => {
  const productViews = {};

  analytics.forEach((log) => {
    // Priority: productName > productId > Fallback
    const name = log.productName || log.productId || "Unidentified Product";

    if (log.type === "view") {
      productViews[name] = (productViews[name] || 0) + 1;
    }
  });

  const topViewedProducts = Object.entries(productViews)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({ name, count }));

  return {
    totalViews: analytics.length,
    topViewedProducts,
  };
};

// 3. LOG ACTIVITY (The Public Trigger)
const logActivity = async (req, res) => {
  try {
    const { productId, productName } = req.body;
    if (!productId) return res.status(400).send("Product ID required");

    // Create unique ID: productId + today's date
    const today = new Date().toISOString().split("T")[0];
    const uniqueLogId = `${productId}_${today}`;

    console.log("Logging with unique ID:", uniqueLogId); // DEBUG LINE

    // Use set with merge to prevent duplicates
    await db
      .collection("product_analytics")
      .doc(uniqueLogId)
      .set(
        {
          type: "view",
          productId,
          productName: productName || "Unknown Product",
          timestamp: new Date().toISOString(),
        },
        { merge: true }, // This prevents creating new docs
      );

    res.status(200).send();
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 4. GET SINGLE PRODUCT ANALYTICS
const getSingleProductAnalytics = async (req, res) => {
  try {
    const { productId } = req.params;
    const snapshot = await db
      .collection("product_analytics")
      .where("productId", "==", productId)
      .orderBy("timestamp", "desc")
      .limit(500)
      .get();

    const analytics = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res
      .status(200)
      .json({ productId, totalViews: analytics.length, history: analytics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getProductAnalytics,
  getSingleProductAnalytics,
  logActivity,
};
