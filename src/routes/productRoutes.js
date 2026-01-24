const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { verifyToken } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

// Public Routes
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getSingleProduct);

// Protected Admin Routes - WITH image upload
router.post(
  "/",
  verifyToken,
  upload.single("image"),
  productController.createProduct,
);
router.put(
  "/:id",
  verifyToken,
  upload.single("image"),
  productController.updateProduct,
);
router.delete("/:id", verifyToken, productController.deleteProduct);

module.exports = router;
