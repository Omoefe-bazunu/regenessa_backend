const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { verifyToken } = require("../middleware/authMiddleware");

// Public Routes
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getSingleProduct);

// Protected Admin Routes
router.post("/", verifyToken, productController.createProduct);
router.put("/:id", verifyToken, productController.updateProduct);
router.delete("/:id", verifyToken, productController.deleteProduct);

module.exports = router;
