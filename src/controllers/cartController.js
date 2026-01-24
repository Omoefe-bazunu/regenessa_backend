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
    const userId = req.user.userId;
    const cartRef = db.collection("carts").doc(userId);

    const doc = await cartRef.get();
    let items = [];

    if (doc.exists) {
      items = doc.data().items;
      const itemIndex = items.findIndex((item) => item.productId === productId);

      if (itemIndex > -1) {
        // If item exists, update quantity
        items[itemIndex].quantity += Number(quantity);
      } else {
        // Add new item
        items.push({
          productId,
          name,
          price: Number(price),
          quantity: Number(quantity),
          imageUrl,
          unit,
        });
      }
    } else {
      items = [
        {
          productId,
          name,
          price: Number(price),
          quantity: Number(quantity),
          imageUrl,
          unit,
        },
      ];
    }

    const total = items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );

    await cartRef.set({ items, total, updatedAt: new Date().toISOString() });
    res.status(200).json({ message: "Cart updated", items });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
