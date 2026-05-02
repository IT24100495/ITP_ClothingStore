const ReturnRequest = require('../models/ReturnRequest');
const SupportRequest = require('../models/SupportRequest');

exports.submitReturnRequest = async (req, res) => {
    try {
        const { orderId, email, reason, details } = req.body;

        if (!orderId || !String(orderId).trim()) {
            return res.status(400).json({ message: 'Order ID is required.' });
        }

        if (!email || !String(email).includes('@')) {
            return res.status(400).json({ message: 'Valid email is required.' });
        }

        const request = await ReturnRequest.create({
            requestId: `RET-${Date.now()}`,
            orderId: String(orderId).trim(),
            email: String(email).trim(),
            reason: reason ? String(reason).trim() : 'General Return',
            details: details ? String(details).trim() : '',
            userId: req.user?._id || null,
            status: 'pending'
        });

        if (global.io) {
            global.io.emit('admin:newReturnRequest', request);
        }

        return res.status(201).json({ message: 'Return request submitted successfully.', request });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.submitSupportRequest = async (req, res) => {
    try {
        const { topic, name, email, message } = req.body;

        if (!name || !String(name).trim()) {
            return res.status(400).json({ message: 'Name is required.' });
        }

        if (!email || !String(email).includes('@')) {
            return res.status(400).json({ message: 'Valid email is required.' });
        }

        if (!message || !String(message).trim()) {
            return res.status(400).json({ message: 'Message is required.' });
        }

        const request = await SupportRequest.create({
            ticketId: `REQ-${Date.now()}`,
            topic: topic ? String(topic).trim() : 'General',
            name: String(name).trim(),
            email: String(email).trim(),
            message: String(message).trim(),
            userId: req.user?._id || null,
            status: 'open'
        });

        if (global.io) {
            global.io.emit('admin:newSupportRequest', request);
        }

        return res.status(201).json({ message: 'Support request submitted successfully.', request });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.getAllReturnRequests = async (_req, res) => {
    try {
        const requests = await ReturnRequest.find({}).sort({ createdAt: -1 }).lean();
        return res.json(requests);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.getAllSupportRequests = async (_req, res) => {
    try {
        const requests = await SupportRequest.find({}).sort({ createdAt: -1 }).lean();
        return res.json(requests);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
