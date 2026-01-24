const express = require("express");
const router = express.Router();
const {
  submitInquiry,
  getAllMessages,
} = require("../controllers/contactController");
const { verifyToken } = require("../middleware/authMiddleware");

// POST /api/contact/submit (Public)
router.post("/submit", submitInquiry);

// GET /api/contact (Protected - Any logged in user)
router.get("/", verifyToken, getAllMessages);

module.exports = router;
