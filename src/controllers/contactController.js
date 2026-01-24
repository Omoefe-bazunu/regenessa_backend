const { db } = require("../config/firebase");
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

exports.submitInquiry = async (req, res) => {
  try {
    const { businessName, name, email, message } = req.body;

    // Validation
    if (!businessName || !name || !email || !message) {
      return res
        .status(400)
        .json({ error: "Please provide all required fields" });
    }

    const inquiryData = {
      businessName,
      name,
      email,
      message,
      status: "unread",
      createdAt: new Date().toISOString(),
    };

    // 1. Save Inquiry to Firestore (using Admin SDK pattern)
    const inquiryRef = await db.collection("messages").add(inquiryData);

    // 2. Email Notification to Admin via Resend
    await resend.emails.send({
      from: "Clean Foods <info@higher.com.ng>",
      to: "raniem57@gmail.com",
      subject: `New Business Inquiry: ${businessName}`,
      html: `
        <div style="font-family: sans-serif; color: #1b4332; border: 1px solid #e5e7eb; padding: 25px; border-radius: 20px;">
          <h2 style="color: #2d6a4f; margin-top: 0;">New Inquiry Received!</h2>
          <p><strong>Business:</strong> ${businessName}</p>
          <p><strong>Contact Name:</strong> ${name}</p>
          <p><strong>Email Address:</strong> ${email}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p><strong>Requirements/Message:</strong></p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 10px;">
            ${message}
          </div>
          <p style="font-size: 11px; color: #9ca3af; margin-top: 25px;">
            Message ID: ${inquiryRef.id}
          </p>
        </div>
      `,
    });

    res.status(200).json({
      message: "Inquiry submitted successfully",
      id: inquiryRef.id,
    });
  } catch (err) {
    console.error("Inquiry Error:", err);
    res
      .status(500)
      .json({ error: "Failed to process inquiry: " + err.message });
  }
};

// GET ALL MESSAGES (Admin Only)
exports.getAllMessages = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied." });
    }

    const snapshot = await db
      .collection("messages")
      .orderBy("createdAt", "desc")
      .get();

    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
