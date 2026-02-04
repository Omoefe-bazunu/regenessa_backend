const express = require("express");
const router = express.Router();
const { initializePayment, verifyPayment } = require("../utils/flutterwave");
const { verifyToken } = require("../middleware/authMiddleware");

// Initialize Payment
router.post("/initialize", verifyToken, async (req, res) => {
  try {
    const { amount, email, name, phone } = req.body;

    if (!amount || !email || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const paymentData = {
      amount: Number(amount),
      email,
      name,
      phone: phone || "",
    };

    const response = await initializePayment(paymentData);

    res.status(200).json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Payment (optional endpoint for frontend)
router.get("/verify/:transactionId", verifyToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const paymentData = await verifyPayment(transactionId);

    if (paymentData) {
      res.status(200).json({
        status: "success",
        data: paymentData,
      });
    } else {
      res.status(400).json({ error: "Payment verification failed" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
