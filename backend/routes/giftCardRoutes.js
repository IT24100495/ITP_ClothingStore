const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
	purchaseGiftCard,
	getMyGiftCards,
	getAllGiftCardsForAdmin,
	validateGiftCard,
	deleteGiftCard,
	getPendingBankTransfers,
	getCardPaymentGiftCards,
	confirmBankTransfer,
	rejectBankTransfer
} = require('../controllers/giftCardController');

router.post('/purchase', protect, purchaseGiftCard);
router.get('/my', protect, getMyGiftCards);
router.get('/validate/:code', protect, validateGiftCard);
router.get('/admin/all', protect, admin, getAllGiftCardsForAdmin);
router.get('/admin/pending-transfers', protect, admin, getPendingBankTransfers);
router.get('/admin/card-payments', protect, admin, getCardPaymentGiftCards);
router.post('/admin/confirm-transfer/:giftCardId', protect, admin, confirmBankTransfer);
router.post('/admin/reject-transfer/:giftCardId', protect, admin, rejectBankTransfer);
router.delete('/:cardId', protect, deleteGiftCard);

module.exports = router;
