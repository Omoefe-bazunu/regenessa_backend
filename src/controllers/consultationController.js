const { db } = require("../config/firebase");

// 1. PUBLIC: Fetch Available Dates
const getAvailableDates = async (req, res) => {
  try {
    const doc = await db
      .collection("settings")
      .doc("consultation_calendar")
      .get();

    if (!doc.exists) return res.status(200).json([]);

    res.status(200).json(doc.data().dates || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. PUBLIC: Submit Consultation Request
const requestConsultation = async (req, res) => {
  try {
    const { name, email, phone, concern, scheduledDate } = req.body;

    if (!name || !email || !concern || !scheduledDate) {
      return res
        .status(400)
        .json({ error: "Required clinical fields missing" });
    }

    // Split scheduledDate if it contains a timestamp for logging purposes
    const [date, time] = scheduledDate.includes("T")
      ? scheduledDate.split("T")
      : [scheduledDate, null];

    const consultation = {
      name,
      email,
      phone,
      concern,
      scheduledDate: date,
      scheduledTime: time || "Not specified", // Added time support
      status: "pending_review",
      createdAt: new Date().toISOString(),
    };

    await db.collection("consultations").add(consultation);
    res.status(201).json({ message: "Clinical intake successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. ADMIN: Fetch All Consultations
const getAllConsultations = async (req, res) => {
  try {
    const snapshot = await db
      .collection("consultations")
      .orderBy("createdAt", "desc")
      .get();

    const list = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. ADMIN: Set Available Dates
const setAvailableDates = async (req, res) => {
  try {
    const { dates } = req.body;

    await db.collection("settings").doc("consultation_calendar").set({
      dates,
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json({ message: "Clinical calendar updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAvailableDates,
  requestConsultation,
  getAllConsultations,
  setAvailableDates,
};
