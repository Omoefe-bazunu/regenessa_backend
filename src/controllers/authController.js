const { db } = require("../config/firebase");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const JWT_SECRET = process.env.JWT_SECRET;

// 1. SIGNUP
exports.signup = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Check if user exists
    const userSnapshot = await db
      .collection("users")
      .where("email", "==", email)
      .get();
    if (!userSnapshot.empty)
      return res.status(400).json({ error: "Email already registered" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = {
      email,
      fullName,
      password: hashedPassword,
      role: "customer",
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("users").add(newUser);
    res.status(201).json({ message: "User registered", userId: docRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userSnapshot = await db
      .collection("users")
      .where("email", "==", email)
      .get();

    if (userSnapshot.empty)
      return res.status(404).json({ error: "User not found" });

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    // Compare passwords
    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    // Create JWT
    const token = jwt.sign(
      { userId: userDoc.id, email: userData.email, role: userData.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      token,
      user: { fullName: userData.fullName, email: userData.email },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. FORGOT PASSWORD (Resend Integration)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const userSnapshot = await db
      .collection("users")
      .where("email", "==", email)
      .get();

    if (userSnapshot.empty)
      return res.status(404).json({ error: "User not found" });

    const userDoc = userSnapshot.docs[0];

    // Create a temporary 15-minute token
    const resetToken = jwt.sign({ userId: userDoc.id }, JWT_SECRET, {
      expiresIn: "15m",
    });

    // Send email via Resend
    const resetLink = `https://cleanfoods.com.ng/reset-password?token=${resetToken}`;

    await resend.emails.send({
      from: "Clean Foods <info@higher.com.ng>",
      to: email,
      subject: "Reset Your Clean Foods Password",
      html: `<p>You requested a password reset. Click <a href="${resetLink}">here</a> to reset it. Link expires in 15 mins.</p>`,
    });

    res.status(200).json({ message: "Reset link sent to your email" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const decoded = jwt.verify(token, JWT_SECRET);

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db
      .collection("users")
      .doc(decoded.userId)
      .update({ password: hashedPassword });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(400).json({ error: "Invalid or expired token" });
  }
};
