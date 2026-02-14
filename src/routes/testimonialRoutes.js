const express = require("express");
const router = express.Router();
const testimonialController = require("../controllers/testimonialController");
const upload = require("../middleware/upload"); // Using your existing multer middleware
const { verifyToken } = require("../middleware/authMiddleware");

// PUBLIC: To view the patient journeys
router.get("/", testimonialController.getTestimonials);

// ADMIN: To upload new clinical evidence
router.post(
  "/",
  verifyToken,
  upload.single("media"),
  testimonialController.createTestimonial,
);

router.delete("/:id", verifyToken, testimonialController.deleteTestimonial);

module.exports = router;
