const multer = require('multer');

const storage = multer.memoryStorage();

// Generic image-only uploader (10 MB max).
module.exports = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) return cb(new Error('Only image uploads allowed'));
    cb(null, true);
  },
});

// Permissive uploader (image + video + document) for campaign template headers.
module.exports.media = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, true),
});
