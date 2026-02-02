const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { verifyToken } = require("../middleware/authMiddleware");

// Public/User Routes
router.get("/my-orders", verifyToken, orderController.getUserOrders);
router.post("/", verifyToken, orderController.submitOrder);

// Admin Routes
router.get("/admin/all", verifyToken, orderController.getAllOrders);
router.put(
  "/admin/status/:orderId",
  verifyToken,
  orderController.updateOrderStatus,
);

module.exports = router;
