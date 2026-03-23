const express = require("express");
const router = express.Router();
const multer = require("multer");
const eventController = require("../controllers/eventController");

const upload = multer({ storage: multer.memoryStorage() });

const eventUploads = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "gallery", maxCount: 10 },
]);

router.post("/", eventUploads, eventController.createEvent);
router.get("/", eventController.getEvents);
router.get("/:id", eventController.getEventById); // Line 16
router.put("/:id", eventUploads, eventController.updateEvent);
router.delete("/:id", eventController.deleteEvent);

module.exports = router;
