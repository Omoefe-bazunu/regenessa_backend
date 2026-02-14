const express = require("express");
const router = express.Router();
const brandController = require("../controllers/brandController");
const { verifyToken } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

router.get("/", brandController.getCertifications);
router.post(
  "/",
  verifyToken,
  upload.single("logo"),
  brandController.uploadCertification,
);
router.delete("/:id", verifyToken, brandController.deleteCertification);

module.exports = router;
