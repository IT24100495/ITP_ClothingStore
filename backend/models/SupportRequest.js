const mongoose = require('mongoose');

const supportRequestSchema = new mongoose.Schema({
    ticketId: { type: String, required: true, unique: true },
    topic: { type: String, default: 'General' },
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['open', 'in-progress', 'closed'], default: 'open' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SupportRequest', supportRequestSchema);
