const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

const normalizeOrigin = (origin) => String(origin || "").trim().replace(/\/+$/, "");
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

const isAllowedOrigin = (origin) => {
    if (!origin) return true; // non-browser clients / curl / server-to-server
    const normalized = normalizeOrigin(origin);
    return allowedOrigins.includes(normalized);
};

app.use(cors({
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) return callback(null, true);
        console.warn(`[CORS] Blocked origin: ${origin}. Allowed: ${allowedOrigins.join(", ")}`);
        // Do not throw; simply reject CORS for this request.
        return callback(null, false);
    },
    credentials: true
}));
app.use(express.json());

// Serve uploaded product images statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/upload", require("./routes/upload"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
