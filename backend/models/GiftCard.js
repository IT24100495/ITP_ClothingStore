const mongoose = require('mongoose');

const giftCardSchema = new mongoose.Schema({
    purchaseId: { type: String, required: true, unique: true },
    code: { type: String, default: null },
    purchaser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    purchaserName: { type: String, required: true },
    purchaserEmail: { type: String, default: '' },
    type: { type: String, enum: ['e-gift', 'physical'], required: true },
    amount: { type: Number, required: true },
    remainingBalance: { type: Number, default: 0 },
    senderName: { type: String, required: true },
    recipientName: { type: String, default: '' },
    recipientEmail: { type: String, default: '' },
    shippingAddress: { type: String, default: '' },
    message: { type: String, default: '' },
    deliveryDate: { type: String, default: null },
    voucherTemplate: {
        id: { type: String, default: 'aurora' },
        name: { type: String, default: 'Aurora Glow' },
        image: { type: String, default: '/gift-vouchers/voucher-aurora.svg' }
    },
    payment: {
        method: { type: String, default: 'Card' },
        status: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Verified' },
        transactionId: { type: String, required: true }
    },
    bankPaymentData: {
        statementPath: { type: String, default: null },
        uploadedAt: { type: Date, default: null },
        confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        confirmedAt: { type: Date, default: null },
        rejectionReason: { type: String, default: null }
    },
    purchaseSummary: {
        orderId: { type: String, default: '' },
        paymentMethod: { type: String, default: 'Card' },
        paymentStatus: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Verified' },
        totalPaid: { type: Number, default: 0 },
        paidAt: { type: Date, default: Date.now }
    },
    emailDeliveryStatus: { type: String, default: 'pending' },
    status: { type: String, enum: ['pending', 'active', 'redeemed', 'disabled', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GiftCard', giftCardSchema);
