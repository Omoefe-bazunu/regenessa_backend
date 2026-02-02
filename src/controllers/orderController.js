const { db } = require("../config/firebase");
const { verifyPaystackPayment } = require("../utils/paystack");
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

// 1. Submit Order
const submitOrder = async (req, res) => {
  try {
    const { items, totalAmount, shippingDetails, paystackReference } = req.body;
    const userId = req.user.userId;

    if (!items || items.length === 0)
      return res.status(400).json({ error: "Empty order" });

    const paymentData = await verifyPaystackPayment(paystackReference);
    if (!paymentData)
      return res.status(400).json({ error: "Payment verification failed" });

    const orderData = {
      userId,
      items,
      totalAmount: Number(totalAmount),
      shippingDetails,
      paymentMethod: "Paystack",
      paystackReference,
      status: "Processing",
      orderDate: new Date().toISOString(),
    };

    const orderRef = await db.collection("orders").add(orderData);
    await db.collection("carts").doc(userId).delete();

    // Notify Regenessa Admin
    await resend.emails.send({
      from: "Regenessa <info@regenessa.com>",
      to: "raniem57@gmail.com",
      subject: `New Order #${orderRef.id.slice(0, 5)}`,
      html: `<p>New order received for ${shippingDetails.fullName}. Total: ₦${totalAmount.toLocaleString()}</p>`,
    });

    res.status(201).json({ message: "Order placed", orderId: orderRef.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Get User Orders
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

// 3. Admin: Get All Orders
const getAllOrders = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ error: "Admin only" });
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

// 4. Admin: Update Status
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    if (req.user.role !== "admin")
      return res.status(403).json({ error: "Admin only" });

    await db
      .collection("orders")
      .doc(orderId)
      .update({ status, updatedAt: new Date().toISOString() });
    res.status(200).json({ message: `Order status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// EXPORT ALL FUNCTIONS
module.exports = {
  submitOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
};
