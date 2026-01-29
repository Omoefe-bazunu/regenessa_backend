const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { verifyToken } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload"); // Ensure this uses multer.memoryStorage()

// Define the multi-field upload configuration
const productMediaUpload = upload.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "extraImage1", maxCount: 1 },
  { name: "extraImage2", maxCount: 1 },
  { name: "video", maxCount: 1 },
]);

// Public Routes
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getSingleProduct);

// Protected Admin Routes
router.post(
  "/",
  verifyToken,
  productMediaUpload, // Use the multi-field middleware
  productController.createProduct,
);

router.put(
  "/:id",
  verifyToken,
  productMediaUpload, // Use the multi-field middleware
  productController.updateProduct,
);

router.delete("/:id", verifyToken, productController.deleteProduct);

module.exports = router;
