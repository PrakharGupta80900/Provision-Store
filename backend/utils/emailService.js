const axios = require("axios");

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const EMAIL_FROM = process.env.EMAIL_USER || "noreply@example.com";
const EMAIL_FROM_NAME = "Gupta Kirana Store";

const emailConfigured = BREVO_API_KEY && !BREVO_API_KEY.includes("your_");

async function sendMail(to, subject, html) {
    if (!emailConfigured) {
        console.log(`[Email not configured] To: ${to} | Subject: ${subject}`);
        return false;
    }
    try {
        await axios.post(
            "https://api.brevo.com/v3/smtp/email",
            {
                sender: { name: EMAIL_FROM_NAME, email: EMAIL_FROM },
                to: [{ email: to }],
                subject,
                htmlContent: html,
            },
            {
                headers: {
                    "api-key": BREVO_API_KEY,
                    "content-type": "application/json",
                },
            }
        );
        return true;
    } catch (err) {
        const msg = err.response?.data || err.message;
        console.error("Brevo API error:", JSON.stringify(msg));
        return false;
    }
}

module.exports = { sendMail, emailConfigured };
