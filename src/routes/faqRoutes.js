const express = require("express");
const router = express.Router();
const faqController = require("../controllers/faqController");
const { verifyToken } = require("../middleware/authMiddleware");

// PUBLIC: For users to browse the help center
router.get("/", faqController.getAllFAQs);

// ADMIN: CRUD operations for management
router.post("/", verifyToken, faqController.createFAQ);
router.put("/:id", verifyToken, faqController.updateFAQ);
router.delete("/:id", verifyToken, faqController.deleteFAQ);

module.exports = router;
