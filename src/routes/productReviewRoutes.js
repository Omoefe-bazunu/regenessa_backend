const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/productReviewController");
const { verifyToken } = require("../middleware/authMiddleware");

// Add this logging middleware
router.use((req, res, next) => {
  console.log(`[REVIEW ROUTE] ${req.method} ${req.path}`);
  next();
});

// GET reviews for a product
router.get("/product/:productId", reviewController.getProductReviews);

// POST a new review
router.post(
  "/product/:productId",
  verifyToken,
  reviewController.addProductReview,
);

// UPDATE a review
router.put("/:reviewId", verifyToken, reviewController.updateProductReview);

// DELETE a review
router.delete("/:reviewId", verifyToken, reviewController.deleteProductReview);

module.exports = router;
