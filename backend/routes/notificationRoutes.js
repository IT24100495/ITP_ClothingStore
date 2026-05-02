const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, createNotification } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getNotifications);
router.put('/:id/read', protect, markAsRead);
router.post('/', protect, createNotification);

module.exports = router;
