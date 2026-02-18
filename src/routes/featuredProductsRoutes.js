const express = require("express");
const router = express.Router();
const featuredProductsController = require("../controllers/featuredProductsController");
const { verifyToken } = require("../middleware/authMiddleware");

// Public: Get featured products
router.get("/", featuredProductsController.getFeaturedProducts);

// Admin: Set featured products
router.post("/", verifyToken, featuredProductsController.setFeaturedProducts);

module.exports = router;
