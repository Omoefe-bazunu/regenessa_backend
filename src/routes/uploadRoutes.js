const express = require("express");
const router = express.Router();
const { bucket } = require("../config/firebase");
const upload = require("../middleware/upload");
const { verifyToken } = require("../middleware/authMiddleware");

// Upload payment proof
router.post(
  "/payment-proof",
  verifyToken,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileName = `${Date.now()}_${req.file.originalname}`;
      const filePath = `payment-proofs/${fileName}`;
      const file = bucket.file(filePath);

      await file.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype },
      });

      await file.makePublic();
      const imageUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      res.status(200).json({ imageUrl });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed: " + error.message });
    }
  },
);

module.exports = router;
