const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for video support
  },
  fileFilter: (req, file, cb) => {
    // Check for both images and videos
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      // This is exactly where your error was being triggered
      cb(new Error("Only image and video files are allowed!"), false);
    }
  },
});

module.exports = upload;
