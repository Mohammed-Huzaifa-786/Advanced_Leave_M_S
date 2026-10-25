const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDir = path.join(__dirname, "..", "uploads", "certificates");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Strict bi-directional Extension and MIME type mapping
const ALLOWED_MIME_TYPES = {
  ".pdf": ["application/pdf"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".doc": ["application/msword", "application/vnd.ms-word"],
};

// Safe disk storage with randomized prefix and sanitized base name
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .parse(file.originalname)
      .name.replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 50);
    const randomHex = crypto.randomBytes(6).toString("hex");
    cb(null, `${Date.now()}-${randomHex}-${baseName || "doc"}${ext}`);
  },
});

// Pre-upload validation: verify extension and MIME type match
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimes = ALLOWED_MIME_TYPES[ext];

  if (!allowedMimes) {
    return cb(
      new Error("File type not allowed. Supported formats: PDF, DOCX, DOC, JPG, JPEG, PNG, WEBP")
    );
  }

  if (!allowedMimes.includes(file.mimetype.toLowerCase())) {
    return cb(
      new Error(`MIME type '${file.mimetype}' does not match file extension '${ext}'`)
    );
  }

  cb(null, true);
};

// Magic bytes (file signature) validation for supported binary formats
function validateFileSignature(filePath, declaredExt) {
  const buffer = Buffer.alloc(16);
  let fd;
  try {
    fd = fs.openSync(filePath, "r");
    const bytesRead = fs.readSync(fd, buffer, 0, 16, 0);
    if (bytesRead < 4) return false;
  } catch (err) {
    return false;
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch (_) {}
    }
  }

  const ext = declaredExt.toLowerCase();
  switch (ext) {
    case ".pdf":
      // %PDF- (0x25, 0x50, 0x44, 0x46)
      return (
        buffer[0] === 0x25 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x44 &&
        buffer[3] === 0x46
      );
    case ".jpg":
    case ".jpeg":
      // JPEG: FF D8 FF
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case ".png":
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    case ".webp":
      // RIFF....WEBP
      return (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      );
    case ".docx":
      // PK\x03\x04 (ZIP format)
      return (
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        buffer[2] === 0x03 &&
        buffer[3] === 0x04
      );
    case ".doc":
      // OLE CFBF (D0 CF 11 E0 A1 B1 1A E1)
      return (
        buffer[0] === 0xd0 &&
        buffer[1] === 0xcf &&
        buffer[2] === 0x11 &&
        buffer[3] === 0xe0 &&
        buffer[4] === 0xa1 &&
        buffer[5] === 0xb1 &&
        buffer[6] === 0x1a &&
        buffer[7] === 0xe1
      );
    default:
      return false;
  }
}

// Middleware wrapper that handles Multer errors and validates magic bytes on disk
function single(fieldName) {
  const multerInstance = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    fileFilter,
  }).single(fieldName);

  return (req, res, next) => {
    multerInstance(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File size exceeds 5MB limit" });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }

      // If a file was saved to disk, perform magic byte inspection
      if (req.file) {
        const ext = path.extname(req.file.originalname).toLowerCase();
        const isValid = validateFileSignature(req.file.path, ext);
        if (!isValid) {
          // Immediately purge spoofed / invalid file from disk
          try {
            fs.unlinkSync(req.file.path);
          } catch (_) {}
          return res.status(400).json({
            message: "Invalid file signature: file content does not match declared extension",
          });
        }
      }

      next();
    });
  };
}

module.exports = {
  single,
  validateFileSignature,
  ALLOWED_MIME_TYPES,
};
