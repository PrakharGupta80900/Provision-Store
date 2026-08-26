const router = require("express").Router();
const mongoose = require("mongoose");
const Order = require("../models/Order");
const User = require("../models/User");
const Counter = require("../models/Counter");
const Product = require("../models/Product");
const auth = require("../middleware/auth");
const { sendMail, emailConfigured } = require("../utils/emailService");
const Razorpay = require("razorpay");
const crypto = require("crypto");

let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const VALID_DELIVERY_SLOTS = new Set(["within_1hr", "today", "tomorrow"]);

async function getNextSequenceValue(sequenceName) {
  const sequenceDocument = await Counter.findOneAndUpdate(
    { id: sequenceName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return sequenceDocument.seq;
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatAddress(value) {
  return escapeHtml(value).replace(/\r?\n/g, "<br/>");
}

function toPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function normalizeDeliverySlot(rawSlot) {
  const slot = String(rawSlot || "today").trim();
  return VALID_DELIVERY_SLOTS.has(slot) ? slot : "today";
}

function calculateCharges(subtotal, rawSlot) {
  const deliverySlot = normalizeDeliverySlot(rawSlot);
  const baseDelivery = subtotal >= 500 ? 0 : 15;
  const slotFee = deliverySlot === "within_1hr" ? 20 : deliverySlot === "today" ? 10 : 0;
  const deliveryCharge = round2(baseDelivery + slotFee);
  const tax = round2(subtotal * 0.05);
  const total = round2(subtotal + tax + deliveryCharge);
  return { tax, deliveryCharge, total, deliverySlot };
}

async function normalizeOrderItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error("Order must include at least one item");
  }

  const quantityById = new Map();
  for (const raw of rawItems) {
    const id = String(raw?._id || raw?.id || "").trim();
    const qty = toPositiveInt(raw?.quantity);
    if (!id || !qty) {
      throw new Error("Each item must have a valid product id and quantity");
    }
    quantityById.set(id, (quantityById.get(id) || 0) + qty);
  }

  const ids = [...quantityById.keys()];
  const products = await Product.find({ _id: { $in: ids } })
    .select("name price stock imageUrl unit unitQuantity")
    .lean();

  const byId = new Map(products.map((p) => [String(p._id), p]));
  if (byId.size !== ids.length) {
    throw new Error("One or more products are unavailable");
  }

  const items = [];
  let subtotal = 0;
  for (const id of ids) {
    const p = byId.get(id);
    const qty = quantityById.get(id);
    const price = Number(p.price);

    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`Invalid price for ${p.name}`);
    }
    if (typeof p.stock === "number" && qty > p.stock) {
      throw new Error(`${p.name} is out of stock`);
    }

    subtotal += price * qty;
    items.push({
      _id: p._id,
      name: p.name,
      price: round2(price),
      quantity: qty,
      imageUrl: p.imageUrl,
      unit: p.unit,
      unitQuantity: p.unitQuantity,
    });
  }

  return { items, subtotal: round2(subtotal) };
}

function generateOrderBillHtml(order) {
  const safeOrderId = escapeHtml(order.orderId || "N/A");
  const safeDate = escapeHtml(new Date(order.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }));
  const safeName = escapeHtml(order.customerName || "Customer");
  const safeAddress = formatAddress(order.address || "N/A");
  const safePhone = escapeHtml(order.phone || "N/A");
  const safeSlot = escapeHtml(order.deliverySlot ? order.deliverySlot.replace(/_/g, " ") : "today");
  const safeSubtotal = round2(order.subtotal || order.total || 0).toFixed(2);
  const safeTax = round2(order.tax || 0).toFixed(2);
  const safeDelivery = round2(order.deliveryCharge || 0).toFixed(2);
  const safeTotal = round2(order.total || 0).toFixed(2);

  const itemRows = (order.items || []).map((i) => {
    const name = escapeHtml(i.name);
    const quantity = toPositiveInt(i.quantity) || 1;
    const price = round2(i.price || 0).toFixed(2);
    const amount = round2((i.price || 0) * (i.quantity || 0)).toFixed(2);
    return `
      <tr>
        <td style="padding:10px; border-bottom:1px solid #eee;">${name}</td>
        <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${quantity}</td>
        <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">₹${price}</td>
        <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">₹${amount}</td>
      </tr>`;
  }).join("");

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
          .print-btn { background: #0c831f; color: white; border: none; padding: 10px 25px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div style="text-align: center;" class="no-print">
          <button onclick="window.print()" class="print-btn">Print Bill</button>
        </div>

        <div class="bill-container">
          <div class="header">
            <h1 class="shop-name">Gk provision Store</h1>
            <p style="margin: 5px 0; color: #666; font-size: 14px;">Your Trusted Grocery Partner</p>
          </div>

          <div class="details-grid">
            <div class="details-box">
              <strong style="color:#666; font-size:11px; text-transform:uppercase;">Order Details</strong><br>
              <strong>Order ID:</strong> ${safeOrderId}<br>
              <strong>Date:</strong> ${safeDate}<br>
              <strong>Payment:</strong> Pay on Delivery
            </div>
            <div class="details-box" style="text-align: right;">
              <strong style="color:#666; font-size:11px; text-transform:uppercase;">Customer Details</strong><br>
              <strong>${safeName}</strong><br>
              ${safeAddress}<br>
              Ph: ${safePhone}
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
            <tbody>${itemRows}</tbody>
          </table>

          <div class="total-section">
            <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:14px;color:#666;">
              <span>Item Subtotal</span>
              <span>₹${safeSubtotal}</span>
            </div>
            ${Number(order.tax) > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:14px;color:#666;"><span>Service/Handling Fee</span><span>₹${safeTax}</span></div>` : ""}
            <div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:14px;color:#666;">
              <span>Delivery Fee (${safeSlot})</span>
              <span>₹${safeDelivery}</span>
            </div>
            <div style="border-top:1px solid #eee;padding-top:10px;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-weight:bold;font-size:16px;">Grand Total</span>
              <h2 class="grand-total" style="margin:0;">₹${safeTotal}</h2>
            </div>
            <p style="margin:10px 0 0;font-size:11px;color:#999;text-align:right;">Prices include all applicable fees.</p>
          </div>

          <div class="footer">
            Thank you for shopping with Gk provision Store!<br>
            <small>This is a computer-generated invoice.</small>
          </div>
        </div>
      </body>
    </html>`;
}

async function notifyAdmin(order) {
  if (!emailConfigured || !ADMIN_EMAIL) return;

  const safeTotal = round2(order.total || 0).toFixed(2);
  const safeName = escapeHtml(order.customerName || "Customer");
  const safeAddress = formatAddress(order.address || "-");
  const safePhone = escapeHtml(order.phone || "");
  const safeSlot = escapeHtml(order.deliverySlot ? order.deliverySlot.replace(/_/g, " ").toUpperCase() : "TODAY");
  const subjectName = String(order.customerName || "Customer").replace(/[\r\n]/g, " ").trim();

  const itemRows = (order.items || []).map((i) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${escapeHtml(i.name)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${toPositiveInt(i.quantity) || 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">₹${round2((i.price || 0) * (i.quantity || 0)).toFixed(2)}</td>
    </tr>`).join("");

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;">
      <div style="background:#0c831f;padding:20px 24px;">
        <h1 style="color:#fff;margin:0;font-size:20px;">Gk provision Store <span style="background:#f8c200;color:#1a1a1a;font-size:12px;font-weight:800;padding:3px 10px;border-radius:20px;">NEW ORDER</span></h1>
      </div>
      <div style="padding:24px;">
        <h2 style="color:#1d1d1d;margin-top:0;font-size:18px;">New Order Received</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr style="background:#f8f8f8;">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#999;text-transform:uppercase;">Item</th>
            <th style="padding:8px 12px;text-align:center;font-size:12px;color:#999;text-transform:uppercase;">Qty</th>
            <th style="padding:8px 12px;text-align:right;font-size:12px;color:#999;text-transform:uppercase;">Amount</th>
          </tr>
          ${itemRows}
          <tr>
            <td colspan="2" style="padding:10px 12px;font-weight:700;">Total</td>
            <td style="padding:10px 12px;text-align:right;font-weight:800;font-size:16px;color:#0c831f;">₹${safeTotal}</td>
          </tr>
        </table>
        <div style="background:#f8f8f8;border-radius:8px;padding:16px;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#555;">DELIVERY SLOT</p>
          <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0c831f;">${safeSlot}</p>
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#555;">DELIVERY TO</p>
          <p style="margin:0;font-size:14px;color:#1d1d1d;line-height:1.6;">
            <strong>${safeName}</strong><br/>
            ${safeAddress}<br/>
            ${safePhone ? `Phone: ${safePhone}` : ""}
          </p>
        </div>
      </div>
    </div>`;

  await sendMail(ADMIN_EMAIL, `New Order - ₹${safeTotal} from ${subjectName}`, html);
}

async function notifyDelivery(order) {
  if (!emailConfigured || !order.email) return;

  const safeName = escapeHtml(order.customerName || "Customer");
  const safeOrderId = escapeHtml(order.orderId || "N/A");
  const safeTotal = round2(order.total || 0).toFixed(2);

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;">
      <div style="background:#0c831f;padding:20px 24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">Gk provision Store</h1>
      </div>
      <div style="padding:24px;text-align:center;">
        <h2 style="color:#1d1d1d;margin-top:0;">Order Delivered</h2>
        <p style="color:#555;font-size:16px;line-height:1.6;">Hi <strong>${safeName}</strong>, your order <strong>${safeOrderId}</strong> has been successfully delivered.</p>
        <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin:24px 0;text-align:left;">
          <h3 style="margin-top:0;font-size:14px;color:#999;text-transform:uppercase;">Order Details</h3>
          <p style="margin:5px 0;"><strong>ID:</strong> ${safeOrderId}</p>
          <p style="margin:5px 0;"><strong>Total:</strong> ₹${safeTotal}</p>
        </div>
      </div>
    </div>`;

  await sendMail(order.email, `Order Delivered - Gk provision Store (${safeOrderId})`, html);
}

router.get("/", auth, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ msg: "Access denied" });
  try {
    const orders = await Order.aggregate([
      { $addFields: { priority: { $cond: { if: { $eq: ["$status", "pending"] }, then: 0, else: 1 } } } },
      { $sort: { priority: 1, date: -1 } },
    ]);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/myorders", auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ date: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const customerName = String(req.body?.customerName || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const address = String(req.body?.address || "").trim();
    const phone = String(req.body?.phone || "").trim();

    if (!customerName || !email || !address || !phone) {
      return res.status(400).json({ message: "Customer name, email, address and phone are required" });
    }

    const { items, subtotal } = await normalizeOrderItems(req.body?.items);
    const { tax, deliveryCharge, total, deliverySlot } = calculateCharges(subtotal, req.body?.deliverySlot);

    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, "");
    const sequenceKey = `orderId-${dateStr}`;
    const sequenceNum = await getNextSequenceValue(sequenceKey);
    const orderId = `GKS-${dateStr}-${sequenceNum.toString().padStart(3, "0")}`;

    const userId = req.user?.id;
    const normalizedUser = mongoose.Types.ObjectId.isValid(userId) ? userId : undefined;

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
      user: normalizedUser,
      status: "pending",
      orderId,
      date: now,
    });

    o.billHtml = generateOrderBillHtml(o);
    await o.save();

    notifyAdmin(o).catch((err) => console.error("Admin notification error:", err.message));

    res.json({ msg: "Order placed", orderId: o.orderId, mongoId: o._id });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id/status", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ msg: "Access denied" });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ msg: "Order not found" });

    const { status } = req.body;
    const allowed = ["awaiting_payment", "pending", "accepted", "dispatched", "delivered", "cancelled"];
    if (!allowed.includes(status)) return res.status(400).json({ msg: "Invalid status" });
    if (status === order.status) return res.json(order);

    const allowedTransitions = {
      awaiting_payment: new Set(["cancelled", "pending"]),
      pending: new Set(["accepted", "cancelled"]),
      accepted: new Set(["dispatched"]),
      dispatched: new Set(["delivered"]),
      delivered: new Set(),
      cancelled: new Set(),
    };

    if (!allowedTransitions[order.status]?.has(status)) {
      return res.status(400).json({ msg: `Invalid transition: ${order.status} -> ${status}` });
    }

    const now = new Date();
    if (status === "accepted") order.acceptedAt = now;
    if (status === "dispatched") order.dispatchedAt = now;
    if (status === "delivered") order.deliveredAt = now;
    if (status === "cancelled") order.cancelledAt = now;

    const oldStatus = order.status;
    order.status = status;
    await order.save();

    if (status === "delivered" && oldStatus !== "delivered") {
      notifyDelivery(order).catch((err) => console.error("Delivery notification error:", err.message));

      if (order.user) {
        const cashback = Math.floor(Number(order.total || 0) * 0.01);
        if (cashback > 0) {
          User.findByIdAndUpdate(order.user, { $inc: { wallet: cashback } })
            .then(() => console.log(`Added ?${cashback} cashback to user ${order.user}`))
            .catch((err) => console.error("Cashback update error:", err.message));
        }
      }
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Razorpay Integration
router.post("/razorpay/create", auth, async (req, res) => {
  try {
    if (!razorpay) return res.status(500).json({ message: "Razorpay is not configured on the server" });

    const customerName = String(req.body?.customerName || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const address = String(req.body?.address || "").trim();
    const phone = String(req.body?.phone || "").trim();

    if (!customerName || !email || !address || !phone) {
      return res.status(400).json({ message: "Customer name, email, address and phone are required" });
    }

    const { items, subtotal } = await normalizeOrderItems(req.body?.items);
    const { tax, deliveryCharge, total, deliverySlot } = calculateCharges(subtotal, req.body?.deliverySlot);

    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, "");
    const sequenceKey = `orderId-${dateStr}`;
    const sequenceNum = await getNextSequenceValue(sequenceKey);
    const orderId = `GKS-${dateStr}-${sequenceNum.toString().padStart(3, "0")}`;

    const userId = req.user?.id;
    const normalizedUser = mongoose.Types.ObjectId.isValid(userId) ? userId : undefined;

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
      user: normalizedUser,
      status: "awaiting_payment",
      paymentMethod: "Razorpay",
      paymentStatus: "pending",
      orderId,
      date: now,
    });

    o.billHtml = generateOrderBillHtml(o);

    const options = {
      amount: Math.round(total * 100), // amount in paise
      currency: "INR",
      receipt: orderId,
    };
    
    const razorpayOrder = await razorpay.orders.create(options);
    o.razorpayOrderId = razorpayOrder.id;

    await o.save();

    res.json({ 
      msg: "Razorpay order created", 
      razorpayOrderId: razorpayOrder.id, 
      mongoId: o._id,
      amount: options.amount,
      currency: options.currency
    });
  } catch (err) {
    console.error("Razorpay Create Error:", err);
    res.status(400).json({ message: err.message });
  }
});

router.post("/razorpay/verify", auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mongoId } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      const order = await Order.findById(mongoId);
      if (!order) return res.status(404).json({ message: "Order not found" });

      order.status = "pending";
      order.paymentStatus = "paid";
      order.razorpayPaymentId = razorpay_payment_id;
      
      await order.save();
      
      notifyAdmin(order).catch((err) => console.error("Admin notification error:", err.message));

      res.json({ msg: "Payment verified successfully", orderId: order.orderId });
    } else {
      res.status(400).json({ message: "Invalid signature sent!" });
    }
  } catch (err) {
    console.error("Razorpay Verify Error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
