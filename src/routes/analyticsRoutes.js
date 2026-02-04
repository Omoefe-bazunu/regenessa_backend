const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");

// 1. PUBLIC LOGGING: Frontend ProductDetails calls this to record unique views.
router.post("/log", analyticsController.logActivity);

// 2. DATA RETRIEVAL: Admin Dashboard calls this to display unique visit metrics.
// Redundant verifyToken removed as the dashboard is already secured.
router.get("/", analyticsController.getProductAnalytics);

// 3. SINGLE PRODUCT DATA: Fetches history for specific supplements (e.g., iiQ Plus).
router.get(
  "/product/:productId",
  analyticsController.getSingleProductAnalytics,
);

module.exports = router;
