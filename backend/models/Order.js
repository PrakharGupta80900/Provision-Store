const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerName: String,
    items: Array,
    total: Number,
    address: String,
    phone: String,
    // No enum constraint — validation is done in the route.
    // This avoids breaking existing DB documents that have old status values.
    status: { type: String, default: 'pending' },
    date: { type: Date, default: Date.now },
    deliveredAt: { type: Date },
    acceptedAt: { type: Date },
    dispatchedAt: { type: Date },
    cancelledAt: { type: Date },
    orderId: { type: String },
    billHtml: { type: String }
});

module.exports = mongoose.model("Order", OrderSchema);