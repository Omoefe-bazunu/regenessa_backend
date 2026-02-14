const express = require("express");
const router = express.Router();
const packageController = require("../controllers/packageController");
const { verifyToken } = require("../middleware/authMiddleware");

// PUBLIC: For users to see the clinical combos
router.get("/", packageController.getAllpackages);

// ADMIN: To curate new treatment bundles
router.post("/", verifyToken, packageController.createpackage);
router.delete("/:id", verifyToken, packageController.deletepackage);

module.exports = router;
