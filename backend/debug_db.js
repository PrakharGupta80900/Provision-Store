const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('./models/Order');

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const orders = await Order.find({});
        console.log(JSON.stringify(orders.map(o => ({ id: o._id, status: o.status })), null, 2));
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
