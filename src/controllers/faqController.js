const { db } = require("../config/firebase");

// 1. CREATE FAQ
exports.createFAQ = async (req, res) => {
  try {
    const { question, answer, category } = req.body;
    if (!question || !answer)
      return res.status(400).json({ error: "Missing fields" });

    const newFAQ = {
      question,
      answer,
      category: category || "General",
      order: Date.now(), // Use timestamp for basic ordering
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("faqs").add(newFAQ);
    res.status(201).json({ id: docRef.id, ...newFAQ });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. GET ALL FAQS
exports.getAllFAQs = async (req, res) => {
  try {
    const snapshot = await db.collection("faqs").orderBy("order", "asc").get();
    const faqs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(faqs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. UPDATE FAQ
exports.updateFAQ = async (req, res) => {
  try {
    await db.collection("faqs").doc(req.params.id).update(req.body);
    res.status(200).json({ message: "Updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. DELETE FAQ
exports.deleteFAQ = async (req, res) => {
  try {
    await db.collection("faqs").doc(req.params.id).delete();
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
