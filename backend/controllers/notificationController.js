const Notification = require('../models/Notification');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({
            $or: [
                { userId: req.user._id },
                { userId: null } // Broadcast notifications
            ]
        }).sort({ createdAt: -1 });

        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        // Check if notification belongs to user (if not broadcast)
        if (notification.userId && notification.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        notification.isRead = true;
        await notification.save();

        res.status(200).json(notification);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a notification (Admin or System)
// @route   POST /api/notifications
// @access  Private/Admin
exports.createNotification = async (req, res) => {
    try {
        const { userId, title, message, type } = req.body;

        const notification = await Notification.create({
            userId: userId || null,
            title,
            message,
            type: type || 'system'
        });

        // Emit real-time notification via Socket.IO if configured
        if (global.io) {
            if (userId) {
                // Send to specific user room
                global.io.to(userId.toString()).emit('newNotification', notification);
            } else {
                // Broadcast to all
                global.io.emit('newNotification', notification);
            }
        }

        res.status(201).json(notification);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
