const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/productReviewController");
const { verifyToken } = require("../middleware/authMiddleware");

// Public: Anyone can see reviews for a product
router.get("/:productId", reviewController.getProductReviews);
router.get("/single/:reviewId", reviewController.getSingleReview);

// Protected: Only logged-in users can interact with reviews
router.post("/:productId", verifyToken, reviewController.addProductReview);
router.put("/:reviewId", verifyToken, reviewController.updateProductReview);
router.delete("/:reviewId", verifyToken, reviewController.deleteProductReview);

module.exports = router;
