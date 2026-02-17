const express = require("express");
const router = express.Router();
const crypto = require("crypto");

router.post("/paystack", async (req, res) => {
  try {
    // Verify webhook signature
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;

    // Handle successful charge
    if (event.event === "charge.success") {
      console.log("✅ Payment successful:", event.data.reference);
      // You can add additional logic here if needed
    }

    res.status(200).send("Webhook received");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Webhook processing failed");
  }
});

module.exports = router;
