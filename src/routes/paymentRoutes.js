const express = require("express");
const router = express.Router();
const { initializePayment } = require("../utils/paystack");
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

module.exports = router;
