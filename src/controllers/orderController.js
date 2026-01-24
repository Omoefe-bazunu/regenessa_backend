const { db } = require("../config/firebase");
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

exports.submitOrder = async (req, res) => {
  try {
    const {
      items,
      totalAmount,
      shippingDetails,
      paymentMethod,
      paymentProofUrl, // New field for the Firebase Storage URL
    } = req.body;

    const userId = req.user.userId;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Cannot place an empty order" });
    }

    const orderData = {
      userId,
      items,
      totalAmount: Number(totalAmount),
      shippingDetails,
      paymentMethod,
      paymentProofUrl: paymentProofUrl || null, // Storing the proof URL
      status: "Pending",
      orderDate: new Date().toISOString(),
    };

    // 1. Save Order to Firestore (cleanfoods database)
    const orderRef = await db.collection("orders").add(orderData);

    // 2. Clear User's Cart
    await db.collection("carts").doc(userId).delete();

    // 3. Email Notification to Admin
    const itemsHtml = items
      .map(
        (item) =>
          `<li>${item.quantity}x ${item.name} - ₦${item.price.toLocaleString()}</li>`,
      )
      .join("");

    // Prepare payment proof section for the email
    const paymentProofSection = paymentProofUrl
      ? `<p><strong>Payment Proof:</strong> <a href="${paymentProofUrl}">View Screenshot</a></p>`
      : `<p><strong>Payment Proof:</strong> Not uploaded (Check Payment Method)</p>`;

    await resend.emails.send({
      from: "Clean Foods <info@higher.com.ng>",
      to: "raniem57@gmail.com",
      subject: `New Bulk Order #${orderRef.id.slice(0, 5)}`,
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2>New Order Received!</h2>
          <p><strong>Customer:</strong> ${shippingDetails.fullName}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          ${paymentProofSection}
          <hr />
          <h4>Items Ordered:</h4>
          <ul>${itemsHtml}</ul>
          <p><strong>Total:</strong> ₦${totalAmount.toLocaleString()}</p>
          <p><strong>Delivery to:</strong> ${shippingDetails.address}, ${shippingDetails.city}</p>
        </div>
      `,
    });

    res.status(201).json({
      message: "Order submitted for verification",
      orderId: orderRef.id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET USER ORDER HISTORY
exports.getUserOrders = async (req, res) => {
  try {
    const snapshot = await db
      .collection("orders")
      .where("userId", "==", req.user.userId)
      .orderBy("orderDate", "desc")
      .get();

    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET SINGLE ORDER DETAILS
exports.getSingleOrder = async (req, res) => {
  try {
    const doc = await db.collection("orders").doc(req.params.orderId).get();

    if (!doc.exists) return res.status(404).json({ error: "Order not found" });

    // Safety check: ensure the user owns this order
    if (doc.data().userId !== req.user.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 1. FETCH ALL ORDERS (Admin Only)
exports.getAllOrders = async (req, res) => {
  try {
    // Basic Role Check
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const snapshot = await db
      .collection("orders")
      .orderBy("orderDate", "desc")
      .get();

    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders: " + err.message });
  }
};

// 2. UPDATE ORDER STATUS (Admin Only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body; // Expecting 'Processing', 'Completed', or 'Rejected'

    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const validStatuses = ["Pending", "Processing", "Completed", "Rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status update" });
    }

    const orderRef = db.collection("orders").doc(orderId);
    const doc = await orderRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Order not found" });
    }

    await orderRef.update({
      status,
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json({ message: `Order status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: "Update failed: " + err.message });
  }
};
