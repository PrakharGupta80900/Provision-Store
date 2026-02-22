const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // Used later for password hashing if needed, though we compare directly for admin env var for now. Wait, user signup needs it.

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    address: { type: String },
    phone: { type: String }
});

module.exports = mongoose.model("User", userSchema);
