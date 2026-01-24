const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { verifyToken } = require("../middleware/authMiddleware");

router.use(verifyToken);

// Customer Routes
router.post("/checkout", orderController.submitOrder);
router.get("/my-orders", orderController.getUserOrders);
router.get("/:orderId", orderController.getSingleOrder);

// Admin Routes (Dashboard)
router.get("/admin/all", orderController.getAllOrders);
router.put("/admin/status/:orderId", orderController.updateOrderStatus);

module.exports = router;
