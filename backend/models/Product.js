const mongoose = require("mongoose");
module.exports = mongoose.model("Product",
    new mongoose.Schema({
        name: String,
        price: Number,
        mrp: Number,
        unit: String,
        unitQuantity: String,
        category: String,
        stock: Number,
        imageUrl: String
    })
);