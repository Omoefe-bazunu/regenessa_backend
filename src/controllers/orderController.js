const { db } = require("../config/firebase");
const { verifyPayment } = require("../utils/flutterwave");
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

// 1. Submit Order
const submitOrder = async (req, res) => {
  try {
    const { items, totalAmount, shippingDetails, transactionId } = req.body;
    const existingOrder = await db
      .collection("orders")
      .where("transactionId", "==", transactionId)
      .limit(1)
      .get();

    if (!existingOrder.empty) {
      return res.status(200).json({
        message: "Order already processed",
        orderId: existingOrder.docs[0].id,
      });
    }
    const userId = req.user.userId;

    if (!items || items.length === 0)
      return res.status(400).json({ error: "Empty order" });
    if (!transactionId)
      return res.status(400).json({ error: "Transaction ID required" });

    const paymentData = await verifyPayment(transactionId);
    if (!paymentData || paymentData.amount < totalAmount) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    const orderData = {
      userId,
      items,
      totalAmount: Number(totalAmount),
      shippingDetails,
      paymentMethod: "Flutterwave",
      transactionId,
      txRef: paymentData.tx_ref,
      status: "Processing",
      orderDate: new Date().toISOString(),
    };

    const orderRef = await db.collection("orders").add(orderData);
    await db.collection("carts").doc(userId).delete();

    // Admin Notification [cite: 14]
    await resend.emails.send({
      from: "Regenessa <info@regenessa.com>",
      to: "raniem57@gmail.com",
      subject: `New Order #${orderRef.id.slice(0, 8).toUpperCase()}`,
      html: `<p>New clinical order received for ₦${totalAmount.toLocaleString()}</p>`,
    });

    res
      .status(201)
      .json({ message: "Order placed successfully", orderId: orderRef.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. User Order History
const getUserOrders = async (req, res) => {
  try {
    const snapshot = await db
      .collection("orders")
      .where("userId", "==", req.user.userId)
      .orderBy("orderDate", "desc")
      .get();

    res
      .status(200)
      .json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. ADMIN: Get All Orders (Check Removed)
const getAllOrders = async (req, res) => {
  try {
    // Permission checks removed for direct access
    const snapshot = await db
      .collection("orders")
      .orderBy("orderDate", "desc")
      .get();

    res
      .status(200)
      .json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. ADMIN: Update Status (Check Removed)
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Permission checks removed for direct access
    await db
      .collection("orders")
      .doc(orderId)
      .update({ status, updatedAt: new Date().toISOString() });

    res.status(200).json({ message: `Registry updated: ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  submitOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
};
