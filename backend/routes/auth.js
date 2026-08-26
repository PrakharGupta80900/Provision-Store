const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const { sendMail, emailConfigured } = require("../utils/emailService");
const { initializeApp, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

if (!getApps().length) {
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'gk-provision'
  });
}


const otpStore = new Map();
const verifiedEmails = new Map();
const otpSendMeta = new Map();
const verifyAttempts = new Map();

const OTP_EXP_MS = 10 * 60 * 1000;
const VERIFIED_EXP_MS = 30 * 60 * 1000;
const OTP_MIN_RESEND_MS = 30 * 1000;
const OTP_MAX_PER_HOUR = 5;
const VERIFY_MAX_ATTEMPTS = 5;
const VERIFY_LOCK_MS = 10 * 60 * 1000;

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function cleanupExpiredState(email) {
  const now = Date.now();

  const otp = otpStore.get(email);
  if (otp && otp.expiresAt <= now) otpStore.delete(email);

  const verifiedUntil = verifiedEmails.get(email);
  if (verifiedUntil && verifiedUntil <= now) verifiedEmails.delete(email);

  const attempts = verifyAttempts.get(email);
  if (attempts && attempts.lockUntil && attempts.lockUntil <= now) {
    verifyAttempts.delete(email);
  }

  const meta = otpSendMeta.get(email);
  if (meta && now - meta.windowStart > 60 * 60 * 1000) {
    otpSendMeta.delete(email);
  }
}

router.post("/send-otp", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ msg: "Email is required" });

    cleanupExpiredState(email);

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ msg: "An account with this email already exists" });

    const now = Date.now();
    const meta = otpSendMeta.get(email) || { windowStart: now, sentCount: 0, lastSentAt: 0 };

    if (now - meta.windowStart > 60 * 60 * 1000) {
      meta.windowStart = now;
      meta.sentCount = 0;
    }

    if (meta.lastSentAt && now - meta.lastSentAt < OTP_MIN_RESEND_MS) {
      const waitSec = Math.ceil((OTP_MIN_RESEND_MS - (now - meta.lastSentAt)) / 1000);
      return res.status(429).json({ msg: `Please wait ${waitSec}s before requesting another OTP` });
    }

    if (meta.sentCount >= OTP_MAX_PER_HOUR) {
      return res.status(429).json({ msg: "Too many OTP requests. Please try again later." });
    }

    const otp = generateOtp();
    otpStore.set(email, { otp, expiresAt: now + OTP_EXP_MS });

    meta.sentCount += 1;
    meta.lastSentAt = now;
    otpSendMeta.set(email, meta);

    if (emailConfigured) {
      try {
        const html = `
          <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;">
            <div style="background:#0c831f;padding:24px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:24px;">Gk provision Store</h1>
              <p style="color:#c8e6c9;margin:4px 0 0;font-size:14px;">Your neighbourhood provision store</p>
            </div>
            <div style="padding:32px;">
              <h2 style="color:#1d1d1d;margin-top:0;">Email Verification</h2>
              <p style="color:#555;line-height:1.6;">Use the OTP below to verify your email. It expires in <strong>10 minutes</strong>.</p>
              <div style="background:#f3f3f3;border-radius:10px;padding:20px;text-align:center;margin:24px 0;">
                <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#0c831f;">${otp}</span>
              </div>
              <p style="color:#999;font-size:12px;">If you did not request this, you can ignore this email.</p>
            </div>
          </div>`;

        const sent = await sendMail(email, "Your OTP for Gk provision Store", html);
        if (sent) return res.json({ msg: "OTP sent to your email" });
      } catch (mailErr) {
        console.error("Mail service error:", mailErr.message);
      }
    }

    console.log(`OTP for ${email}: ${otp}`);
    res.json({ msg: "OTP sent (check backend console - email unavailable)" });
  } catch (err) {
    console.error("Send OTP error:", err.message);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

router.post("/verify-otp", (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const otp = String(req.body?.otp || "").trim();
  if (!email || !otp) return res.status(400).json({ msg: "Email and OTP are required" });

  cleanupExpiredState(email);

  const attemptMeta = verifyAttempts.get(email);
  const now = Date.now();
  if (attemptMeta?.lockUntil && attemptMeta.lockUntil > now) {
    const waitMin = Math.ceil((attemptMeta.lockUntil - now) / 60000);
    return res.status(429).json({ msg: `Too many attempts. Try again in ${waitMin} minute(s).` });
  }

  const record = otpStore.get(email);
  if (!record) return res.status(400).json({ msg: "No OTP found for this email. Request a new OTP." });
  if (now > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ msg: "OTP has expired. Request a new OTP." });
  }

  if (record.otp !== otp) {
    const current = verifyAttempts.get(email) || { count: 0, lockUntil: 0 };
    current.count += 1;
    if (current.count >= VERIFY_MAX_ATTEMPTS) {
      current.lockUntil = now + VERIFY_LOCK_MS;
      current.count = 0;
    }
    verifyAttempts.set(email, current);

    return res.status(400).json({ msg: "Incorrect OTP. Please try again." });
  }

  otpStore.delete(email);
  verifyAttempts.delete(email);
  verifiedEmails.set(email, now + VERIFIED_EXP_MS);

  res.json({ msg: "OTP verified successfully", valid: true });
});

router.post("/register", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ msg: "Name, email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ msg: "Password must be at least 8 characters" });
    }

    cleanupExpiredState(email);
    const verifiedUntil = verifiedEmails.get(email);
    if (!verifiedUntil || verifiedUntil <= Date.now()) {
      return res.status(400).json({ msg: "Email not verified. Complete OTP verification first." });
    }

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ msg: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

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

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password are required" });
    }

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

router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

router.put("/profile", auth, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const address = String(req.body?.address || "").trim();
  const phone = String(req.body?.phone || "").trim();
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.name = name || user.name;
    user.address = address || user.address;
    user.phone = phone || user.phone;
    await user.save();

    res.json(user);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ msg: "No token provided" });

    // Verify the Firebase ID token
    const decodedToken = await getAuth().verifyIdToken(token);
    const email = String(decodedToken.email || "").trim().toLowerCase();
    const name = decodedToken.name || 'Google User';

    if (!email) return res.status(400).json({ msg: "Email is required from Google" });

    let user = await User.findOne({ email });

    if (!user) {
      // Create a new user with a random password since they used Google
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);
      
      user = new User({ name, email, password: hashedPassword });
      await user.save();
    }

    const jwtToken = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token: jwtToken,
      user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin },
      msg: "Google login successful",
    });
  } catch (err) {
    console.error("Google auth error:", err.message);
    res.status(500).json({ msg: "Google authentication failed", error: err.message });
  }
});

module.exports = router;
