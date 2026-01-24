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

const app = express();

// --- Global Middleware ---
/**
 * Increased limit to handle large JSON payloads,
 * which is essential for merging base64 TTS chunks.
 */
app.use(express.json({ limit: "150mb" }));
app.use(
  cors({
    origin: ["http://localhost:3000", "https://cleanfoods.vercel.app"],
    credentials: true,
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
