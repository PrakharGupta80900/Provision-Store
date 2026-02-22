const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../middleware/auth");

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `product_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Only image files allowed"));
    }
});

// POST /api/upload/product-image  (admin only)
router.post("/product-image", auth, upload.single("image"), (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({ msg: "Admin only" });
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });
    // Return a public URL the frontend can store as imageUrl
    const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    res.json({ imageUrl });
});

module.exports = router;
