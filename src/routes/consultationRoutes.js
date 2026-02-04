const express = require("express");
const router = express.Router();

// Destructure the functions from the controller
const {
  requestConsultation,
  getAllConsultations,
  getAvailableDates,
  setAvailableDates,
} = require("../controllers/consultationController");

// --- Public Endpoints ---
router.post("/request", requestConsultation);
router.get("/available-dates", getAvailableDates);

// --- Admin Endpoints (no auth for now) ---
router.get("/admin/all", getAllConsultations);
router.post("/admin/set-dates", setAvailableDates);

module.exports = router;
