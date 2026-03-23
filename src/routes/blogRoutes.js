const express = require("express");
const router = express.Router();
const multer = require("multer");
const blogController = require("../controllers/blogController");

// Multer setup (using memory storage for streaming to Firebase)
const upload = multer({ storage: multer.memoryStorage() });

/**
 * 🛠️ Configuration for multiple file fields.
 * Handles both the primary 'image' and the 'authorImage' portrait.
 */
const blogUploads = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "authorImage", maxCount: 1 },
]);

// 1. CREATE: Accepts title, slug, excerpt, body, and two image files
router.post("/", blogUploads, blogController.createBlogPost);

// 2. READ ALL: Supports pagination and latest-first sorting
router.get("/", blogController.getBlogPosts);

// 3. READ SINGLE: Supports dynamic lookup via Slug or Document ID
router.get("/:id", blogController.getBlogPostById);

// 4. UPDATE: Allows partial updates and image replacements
router.put("/:id", blogUploads, blogController.updateBlogPost);

// 5. DELETE: Cleans up both images from Firebase Storage before removing the doc
router.delete("/:id", blogController.deleteBlogPost);

module.exports = router;
