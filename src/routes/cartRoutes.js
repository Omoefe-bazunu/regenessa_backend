const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { verifyToken } = require("../middleware/authMiddleware");

// All cart actions require the user to be logged in
router.use(verifyToken);

router.get("/", cartController.getCart);
router.post("/add", cartController.addToCart);
router.post("/bulk-add", verifyToken, cartController.bulkAddItems);
router.put("/item/:productId", cartController.updateQuantity);
router.delete("/item/:productId", cartController.removeFromCart);
router.delete("/clear", cartController.clearCart);

module.exports = router;
