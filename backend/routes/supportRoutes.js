const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
    submitReturnRequest,
    submitSupportRequest,
    getAllReturnRequests,
    getAllSupportRequests
} = require('../controllers/supportController');

router.post('/returns', submitReturnRequest);
router.post('/requests', submitSupportRequest);

router.get('/admin/returns', protect, admin, getAllReturnRequests);
router.get('/admin/requests', protect, admin, getAllSupportRequests);

module.exports = router;
