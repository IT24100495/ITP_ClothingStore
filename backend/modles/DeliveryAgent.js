const mongoose = require('mongoose');

const deliveryAgentSchema = new mongoose.Schema({
    agentId: { type: String, required: true, unique: true },
    agentName: { type: String, required: true },
    contactNo: { type: String, required: true },
    email: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DeliveryAgent', deliveryAgentSchema);
