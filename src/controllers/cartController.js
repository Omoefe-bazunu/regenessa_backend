const { db } = require("../config/firebase");

// 1. GET USER CART
exports.getCart = async (req, res) => {
  try {
    const cartDoc = await db.collection("carts").doc(req.user.userId).get();
    if (!cartDoc.exists) return res.status(200).json({ items: [], total: 0 });

    res.status(200).json(cartDoc.data());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. ADD/UPDATE ITEM IN CART
exports.addToCart = async (req, res) => {
  try {
    const { productId, name, price, quantity, imageUrl, unit } = req.body;

    const userId = req.user.userId || req.user.id;

    if (!userId)
      return res.status(401).json({ error: "User ID not found in token" });

    const cartRef = db.collection("carts").doc(userId);
    const doc = await cartRef.get();
    let items = [];

    const cleanPrice = Number(price) || 0;
    const cleanQty = Number(quantity) || 1;

    if (doc.exists) {
      items = doc.data().items || [];
      const itemIndex = items.findIndex((item) => item.productId === productId);

      if (itemIndex > -1) {
        items[itemIndex].quantity += cleanQty;
      } else {
        items.push({
          productId,
          name: name || "Unknown Supplement",
          price: cleanPrice,
          quantity: cleanQty,
          imageUrl: imageUrl || "",
          unit: unit || "bottle",
        });
      }
    } else {
      items = [
        {
          productId,
          name: name || "Unknown Supplement",
          price: cleanPrice,
          quantity: cleanQty,
          imageUrl: imageUrl || "",
          unit: unit || "bottle",
        },
      ];
    }

    const total = items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );

    await cartRef.set(
      {
        items,
        total: Number(total.toFixed(2)),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    res.status(200).json({ message: "Cart updated", items, total });
  } catch (err) {
    console.error("CART_ERROR:", err.message);
    res.status(500).json({ error: "Failed to update cart: " + err.message });
  }
};

// 2B. UPDATE ITEM QUANTITY (NEW - THIS WAS MISSING!)
exports.updateQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.userId;
    const cartRef = db.collection("carts").doc(userId);

    const doc = await cartRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Cart not found" });

    let items = doc.data().items;
    const itemIndex = items.findIndex((item) => item.productId === productId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    // Update the quantity
    items[itemIndex].quantity = Number(quantity);

    // Recalculate total
    const total = items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );

    await cartRef.update({ items, total, updatedAt: new Date().toISOString() });
    res.status(200).json({ message: "Quantity updated", items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. REMOVE SINGLE ITEM
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const cartRef = db.collection("carts").doc(req.user.userId);
    const doc = await cartRef.get();

    if (!doc.exists) return res.status(404).json({ error: "Cart not found" });

    let items = doc.data().items.filter((item) => item.productId !== productId);
    const total = items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );

    await cartRef.update({ items, total, updatedAt: new Date().toISOString() });
    res.status(200).json({ message: "Item removed", items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. CLEAR CART
exports.clearCart = async (req, res) => {
  try {
    await db.collection("carts").doc(req.user.userId).delete();
    res.status(200).json({ message: "Cart cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
