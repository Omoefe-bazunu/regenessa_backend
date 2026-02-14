require("dotenv").config();
const express = require("express");
const cors = require("cors");

// --- Route Imports ---
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const reviewRoutes = require("./routes/productReviewRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const contactRoutes = require("./routes/contactRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const consultationRoutes = require("./routes/consultationRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const testimonialRoutes = require("./routes/testimonialRoutes");
const packageRoutes = require("./routes/packageRoutes");
const brandRoutes = require("./routes/brandRoutes");
const faqRoutes = require("./routes/faqRoutes");

const app = express();

// --- Global Middleware ---
/**
 * Increased limit to handle large JSON payloads,
 * which is essential for merging base64 TTS chunks.
 */
app.use(express.json({ limit: "150mb" }));
app.use(
  cors({
    origin: ["http://localhost:3000", "https://regenessa.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// --- API Route Middlewares ---
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/consultations", consultationRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/certifications", brandRoutes);
app.use("/api/faqs", faqRoutes);

// --- Health Check ---
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

module.exports = app;
