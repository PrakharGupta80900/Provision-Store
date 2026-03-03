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

const adminOnly = (req, res, next) => {
    if (!req.user?.isAdmin) return res.status(403).json({ msg: "Admin only" });
    next();
};

// POST /api/upload/product-image  (admin only)
router.post("/product-image", auth, adminOnly, (req, res, next) => {
    upload.single("image")(req, res, (err) => {
        if (err) return next(err);
        return next();
    });
}, (req, res) => {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });
    const backendBaseUrl = process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
    const imageUrl = `${backendBaseUrl}/uploads/${req.file.filename}`;
    res.json({ imageUrl });
});

router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ msg: err.message });
    }
    if (err && err.message === "Only image files allowed") {
        return res.status(400).json({ msg: err.message });
    }
    return next(err);
});

module.exports = router;
