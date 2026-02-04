const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { verifyToken } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const { logProductView } = require("../middleware/analyticsMiddleware");

/**
 * Regenessa Product Media Configuration
 * Handles the main product shot, gallery images for supplements,
 * and optional video demonstrations.
 */
const productMediaUpload = upload.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "extraImage1", maxCount: 1 },
  { name: "extraImage2", maxCount: 1 },
  { name: "video", maxCount: 1 },
]);

// --- Public Routes ---
// Allow customers to browse the Products
router.get("/list", productController.getProductsList);
router.get("/", productController.getAllProducts);
router.get("/:id", logProductView, productController.getSingleProduct);

// --- Protected Admin Routes ---
router.post(
  "/",
  verifyToken,
  productMediaUpload,
  productController.createProduct,
);

router.put(
  "/:id",
  verifyToken,
  productMediaUpload,
  productController.updateProduct,
);

router.delete("/:id", verifyToken, productController.deleteProduct);

module.exports = router;
