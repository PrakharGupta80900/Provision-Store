const router = require("express").Router();
const Order = require("../models/Order");
const User = require("../models/User");
const Counter = require("../models/Counter");
const auth = require("../middleware/auth");
const nodemailer = require("nodemailer");

/* ================================================================
   EMAIL CONFIG
================================================================ */
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const emailConfigured =
    EMAIL_USER && EMAIL_PASS &&
    !EMAIL_USER.includes("your_") &&
    !EMAIL_PASS.includes("your_");

const transporter = emailConfigured
    ? nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    })
    : null;

/* ── Send email helper ── */
async function sendMail(to, subject, html) {
    if (emailConfigured) {
        try {
            await transporter.sendMail({ from: `"Gupta Kirana Store" <${EMAIL_USER}>`, to, subject, html });
        } catch (err) {
            console.error("Nodemailer Error (Non-blocking):", err.message);
        }
    }
}

/* ── Counter helper ── */
async function getNextSequenceValue(sequenceName) {
    const sequenceDocument = await Counter.findOneAndUpdate(
        { id: sequenceName },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return sequenceDocument.seq;
}

/* ── Bill HTML Generator ── */
function generateOrderBillHtml(order) {
    const itemRows = order.items.map(i =>
        `<tr>
            <td style="padding:10px; border-bottom:1px solid #eee;">${i.name}</td>
            <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${i.quantity}</td>
            <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">₹${i.price}</td>
            <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">₹${i.price * i.quantity}</td>
        </tr>`
    ).join("");

    return `
        <html>
        <head>
            <style>
                @media print {
                    .no-print { display: none !important; }
                    body { padding: 0; margin: 0; }
                    .bill-container { border: none !important; max-width: 100% !important; box-shadow: none !important; }
                }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f4; padding: 20px; }
                .bill-container { background: #fff; max-width: 700px; margin: auto; border: 1px solid #ddd; padding: 30px; color: #333; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                .header { text-align: center; border-bottom: 3px solid #0c831f; padding-bottom: 15px; margin-bottom: 25px; }
                .shop-name { color: #0c831f; margin: 0; font-size: 28px; font-weight: 800; }
                .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .details-box { background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
                .table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
                .table th { background: #f4f4f4; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; }
                .table td { padding: 12px; border-bottom: 1px solid #eee; }
                .total-section { text-align: right; border-top: 2px solid #eee; padding-top: 15px; }
                .grand-total { font-size: 20px; color: #0c831f; margin: 5px 0; }
                .footer { margin-top: 40px; text-align: center; font-style: italic; color: #888; border-top: 1px solid #eee; padding-top: 15px; }
                .print-btn { background: #0c831f; color: white; border: none; padding: 10px 25px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-bottom: 20px; transition: 0.2s; }
                .print-btn:hover { background: #0a6d19; }
            </style>
        </head>
        <body>
            <div style="text-align: center;" class="no-print">
                <button onclick="window.print()" class="print-btn">🖨️ Print Bill</button>
            </div>
            
            <div class="bill-container">
                <div class="header">
                    <h1 class="shop-name">Gupta Kirana Store</h1>
                    <p style="margin: 5px 0; color: #666; font-size: 14px;">Your Trusted Grocery Partner</p>
                </div>
                
                <div class="details-grid">
                    <div class="details-box">
                        <strong style="color:#666; font-size:11px; text-transform:uppercase;">Order Details</strong><br>
                        <strong>Order ID:</strong> ${order.orderId}<br>
                        <strong>Date:</strong> ${new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}<br>
                        <strong>Payment:</strong> Pay on Delivery
                    </div>
                    <div class="details-box" style="text-align: right;">
                        <strong style="color:#666; font-size:11px; text-transform:uppercase;">Customer Details</strong><br>
                        <strong>${order.customerName}</strong><br>
                        ${order.address}<br>
                        Ph: ${order.phone}
                    </div>
                </div>

                <table class="table">
                    <thead>
                        <tr>
                            <th>Item Description</th>
                            <th style="text-align:center;">Qty</th>
                            <th style="text-align:right;">Price</th>
                            <th style="text-align:right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRows}
                    </tbody>
                </table>

                <div class="total-section">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; color: #666;">
                        <span>Item Subtotal</span>
                        <span>₹${(order.subtotal || order.total).toFixed(2)}</span>
                    </div>
                    ${order.tax > 0 ? `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; color: #666;">
                            <span>Service/Handling Fee</span>
                            <span>₹${order.tax.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; color: #666;">
                        <span>Delivery Fee ${order.deliverySlot ? `(${order.deliverySlot.replace('_', ' ')})` : ''}</span>
                        <span>₹${(order.deliveryCharge || 0).toFixed(2)}</span>
                    </div>
                    <div style="border-top: 1px solid #eee; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: bold; font-size: 16px;">Grand Total</span>
                        <h2 class="grand-total" style="margin: 0;">₹${order.total.toFixed(2)}</h2>
                    </div>
                    <p style="margin: 10px 0 0; font-size: 11px; color: #999; text-align: right;">Prices include all applicable fees.</p>
                </div>

                <div class="footer">
                    Thank you for shopping with Gupta Kirana Store!<br>
                    <small>This is a computer-generated invoice.</small>
                </div>
            </div>
        </body>
        </html>
    `;
}

/* ── Admin new-order notification ── */
async function notifyAdmin(order) {
    const itemRows = order.items.map(i =>
        `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${i.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${i.quantity}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">₹${i.price * i.quantity}</td>
        </tr>`
    ).join("");

    const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;">
            <div style="background:#0c831f;padding:20px 24px;">
                <h1 style="color:#fff;margin:0;font-size:20px;">⚡ Gupta Kirana Store &nbsp;<span style="background:#f8c200;color:#1a1a1a;font-size:12px;font-weight:800;padding:3px 10px;border-radius:20px;">NEW ORDER</span></h1>
            </div>
            <div style="padding:24px;">
                <h2 style="color:#1d1d1d;margin-top:0;font-size:18px;">🛒 New Order Received!</h2>
                <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                    <tr style="background:#f8f8f8;">
                        <th style="padding:8px 12px;text-align:left;font-size:12px;color:#999;text-transform:uppercase;">Item</th>
                        <th style="padding:8px 12px;text-align:center;font-size:12px;color:#999;text-transform:uppercase;">Qty</th>
                        <th style="padding:8px 12px;text-align:right;font-size:12px;color:#999;text-transform:uppercase;">Amount</th>
                    </tr>
                    ${itemRows}
                    <tr>
                        <td colspan="2" style="padding:10px 12px;font-weight:700;">Total</td>
                        <td style="padding:10px 12px;text-align:right;font-weight:800;font-size:16px;color:#0c831f;">₹${order.total}</td>
                    </tr>
                </table>
                <div style="background:#f8f8f8;border-radius:8px;padding:16px;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#555;">DELIVERY SLOT</p>
                    <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0c831f;">
                        ${order.deliverySlot ? order.deliverySlot.replace('_', ' ').toUpperCase() : 'TODAY'}
                    </p>
                    
                    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#555;">DELIVERY TO</p>
                    <p style="margin:0;font-size:14px;color:#1d1d1d;line-height:1.6;">
                        <strong>${order.customerName || 'Customer'}</strong><br/>
                        ${order.address || '—'}<br/>
                        ${order.phone ? '📞 ' + order.phone : ''}
                    </p>
                </div>
            </div>
        </div>`;

    if (emailConfigured) {
        await sendMail(ADMIN_EMAIL, `🛒 New Order — ₹${order.total} from ${order.customerName || 'Customer'}`, html);
    }
}

/* ── Customer delivery notification ── */
async function notifyDelivery(order) {
    if (!order.email) return;

    const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;">
            <div style="background:#0c831f;padding:20px 24px;text-align:center;">
                <h1 style="color:#fff;margin:0;font-size:24px;">✅ Gupta Kirana Store</h1>
            </div>
            <div style="padding:24px;text-align:center;">
                <h2 style="color:#1d1d1d;margin-top:0;">Order Delivered!</h2>
                <p style="color:#555;font-size:16px;line-height:1.6;">Hi <strong>${order.customerName}</strong>, your order <strong>${order.orderId}</strong> has been successfully delivered. We hope you enjoy your purchase!</p>
                <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin:24px 0;text-align:left;">
                    <h3 style="margin-top:0;font-size:14px;color:#999;text-transform:uppercase;">Order Details</h3>
                    <p style="margin:5px 0;"><strong>ID:</strong> ${order.orderId}</p>
                    <p style="margin:5px 0;"><strong>Total:</strong> ₹${order.total}</p>
                </div>
                <p style="color:#888;font-size:14px;">Thank you for choosing Gupta Kirana Store. We look forward to serving you again!</p>
            </div>
            <div style="background:#f4f4f4;padding:15px;text-align:center;font-size:12px;color:#999;">
                &copy; ${new Date().getFullYear()} Gupta Kirana Store. Your neighborhood provision store.
            </div>
        </div>`;

    if (emailConfigured) {
        await sendMail(order.email, `✅ Order Delivered — Gupta Kirana Store (${order.orderId})`, html);
    }
}



/* ================================================================
   GET ALL ORDERS (Admin)
================================================================ */
router.get("/", auth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ msg: "Access denied" });
    try {
        const orders = await Order.aggregate([
            {
                $addFields: {
                    priority: {
                        $cond: { if: { $eq: ["$status", "pending"] }, then: 0, else: 1 }
                    }
                }
            },
            { $sort: { priority: 1, date: -1 } }
        ]);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/* ================================================================
   GET MY ORDERS (Authenticated user)
================================================================ */
router.get("/myorders", auth, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id }).sort({ date: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/* ================================================================
   PLACE ORDER
================================================================ */
router.post("/", auth, async (req, res) => {
    try {
        const jwt = require("jsonwebtoken");
        const token = req.header("x-auth-token");
        let userId = null;

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.id;
            } catch (e) { }
        }

        const { items, subtotal, tax, deliveryCharge, deliverySlot, total, customerName, email, address, phone } = req.body;

        // Date-scoped Sequential Order ID (GKS-YYMMDD-XXX)
        const now = new Date();
        const dateStr = now.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
        const sequenceKey = `orderId-${dateStr}`;
        const sequenceNum = await getNextSequenceValue(sequenceKey);
        const orderId = `GKS-${dateStr}-${sequenceNum.toString().padStart(3, '0')}`;

        const o = new Order({
            items,
            subtotal,
            tax,
            deliveryCharge,
            deliverySlot,
            total,
            customerName,
            email,
            address,
            phone,
            user: userId,
            status: 'pending',
            orderId: orderId,
            date: now
        });

        // Generate and attach bill
        o.billHtml = generateOrderBillHtml(o);

        await o.save();

        // Notify admin (non-blocking)
        notifyAdmin(o).catch(err => console.error("Admin notification error:", err.message));

        res.json({ msg: "Order placed", orderId: o.orderId, mongoId: o._id });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

/* ================================================================
   UPDATE ORDER STATUS (Admin only)
   Flow: pending → accepted → dispatched → delivered
================================================================ */
router.put("/:id/status", auth, async (req, res) => {
    try {
        if (!req.user.isAdmin) return res.status(403).json({ msg: "Access denied" });

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ msg: "Order not found" });

        const { status } = req.body;
        const allowed = ['pending', 'accepted', 'dispatched', 'delivered', 'cancelled'];
        if (!allowed.includes(status)) return res.status(400).json({ msg: "Invalid status" });

        // Record audit timestamps
        const now = new Date();
        if (status === 'accepted' && order.status !== 'accepted') order.acceptedAt = now;
        if (status === 'dispatched' && order.status !== 'dispatched') order.dispatchedAt = now;
        if (status === 'delivered' && order.status !== 'delivered') order.deliveredAt = now;
        if (status === 'cancelled' && order.status !== 'cancelled') order.cancelledAt = now;

        const oldStatus = order.status;
        order.status = status;
        await order.save();

        // Notify customer on delivery (non-blocking)
        if (status === 'delivered' && oldStatus !== 'delivered') {
            notifyDelivery(order).catch(err => console.error("Delivery notification error:", err.message));

            // Add 1% cashback to user wallet
            if (order.user) {
                const cashback = Math.floor(order.total * 0.01);
                if (cashback > 0) {
                    User.findByIdAndUpdate(order.user, { $inc: { wallet: cashback } })
                        .then(() => console.log(`Added ₹${cashback} cashback to user ${order.user}`))
                        .catch(err => console.error("Cashback update error:", err.message));
                }
            }
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;