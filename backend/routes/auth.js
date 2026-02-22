const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const { sendMail, emailConfigured } = require("../utils/emailService");

/* ================================================================
   IN-MEMORY OTP STORE
================================================================ */
const otpStore = new Map();
const verifiedEmails = new Set();

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/* ================================================================
   SEND OTP
================================================================ */
router.post("/send-otp", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ msg: "Email is required" });

        // Check duplicate
        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ msg: "An account with this email already exists" });

        const otp = generateOtp();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
        otpStore.set(email, { otp, expiresAt });

        if (emailConfigured) {
            try {
                const html = `
                        <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;">
                            <div style="background:#0c831f;padding:24px;text-align:center;">
                                <h1 style="color:#fff;margin:0;font-size:24px;">⚡ Gupta Kirana Store</h1>
                                <p style="color:#c8e6c9;margin:4px 0 0;font-size:14px;">Your neighbourhood provision store</p>
                            </div>
                            <div style="padding:32px;">
                                <h2 style="color:#1d1d1d;margin-top:0;">Email Verification</h2>
                                <p style="color:#555;line-height:1.6;">Use the OTP below to verify your email. It expires in <strong>10 minutes</strong>.</p>
                                <div style="background:#f3f3f3;border-radius:10px;padding:20px;text-align:center;margin:24px 0;">
                                    <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#0c831f;">${otp}</span>
                                </div>
                                <p style="color:#999;font-size:12px;">If you didn't request this, please ignore this email.</p>
                            </div>
                        </div>`;
                const sent = await sendMail(
                    email,
                    "Your OTP for Gupta Kirana Store Account Verification",
                    html
                );
                if (sent) return res.json({ msg: "OTP sent to your email" });
            } catch (mailErr) {
                console.error("Mail service error:", mailErr.message);
                // Fallback to console log in case of auth failure so user isn't blocked
            }
        }

        // Dev fallback / Mail failure fallback — log to console
        console.log(`\n========================================`);
        console.log(`  OTP for ${email}: ${otp}`);
        console.log(`  (Note: Email sending failed or not configured)`);
        console.log(`========================================\n`);
        res.json({ msg: "OTP sent (check backend console — email service unavailable)" });
    } catch (err) {
        console.error("Send OTP error:", err.message);
        res.status(500).json({ error: "Failed to send OTP: " + err.message });
    }
});


/* ================================================================
   VERIFY OTP
================================================================ */
router.post("/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ msg: "Email and OTP are required" });

    const record = otpStore.get(email);
    if (!record) return res.status(400).json({ msg: "No OTP found for this email. Please request a new one." });
    if (Date.now() > record.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ msg: "OTP has expired. Please request a new one." });
    }
    if (record.otp !== otp.trim()) {
        return res.status(400).json({ msg: "Incorrect OTP. Please try again." });
    }

    // Mark verified
    otpStore.delete(email);
    verifiedEmails.add(email);
    res.json({ msg: "OTP verified successfully", valid: true });
});

/* ================================================================
   REGISTER (requires verified OTP)
================================================================ */
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Must have passed OTP verification
        if (!verifiedEmails.has(email)) {
            return res.status(400).json({ msg: "Email not verified. Please complete OTP verification first." });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ msg: "User already exists" });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        // Clear verified status
        verifiedEmails.delete(email);

        const token = jwt.sign(
            { id: newUser._id, isAdmin: newUser.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );
        res.status(201).json({
            token,
            user: { id: newUser._id, name: newUser.name, email: newUser.email, isAdmin: newUser.isAdmin },
            msg: "User registered successfully",
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ================================================================
   LOGIN
================================================================ */
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Admin check
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign({ id: "admin", isAdmin: true }, process.env.JWT_SECRET, { expiresIn: "7d" });
            return res.json({ token, user: { id: "admin", name: "Admin", email, isAdmin: true } });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: "User does not exist" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

        const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ================================================================
   GET USER PROFILE
================================================================ */
router.get("/profile", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        res.json(user);
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

/* ================================================================
   UPDATE USER PROFILE
================================================================ */
router.put("/profile", auth, async (req, res) => {
    const { name, address, phone } = req.body;
    try {
        let user = await User.findById(req.user.id);
        if (user) {
            user.name = name || user.name;
            user.address = address || user.address;
            user.phone = phone || user.phone;
            await user.save();
            res.json(user);
        } else {
            res.status(404).json({ msg: "User not found" });
        }
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

module.exports = router;
