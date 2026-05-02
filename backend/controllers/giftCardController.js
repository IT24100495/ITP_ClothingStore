const GiftCard = require('../models/GiftCard');
const { sendGiftCardEmail } = require('../utils/giftCardEmail');

const allowedAmounts = [25, 50, 100, 150, 250, 500];
const allowedVoucherTemplates = {
    aurora: {
        id: 'aurora',
        name: 'Aurora Glow',
        image: '/gift-vouchers/voucher-aurora.svg'
    },
    sunset: {
        id: 'sunset',
        name: 'Sunset Pop',
        image: '/gift-vouchers/voucher-sunset.svg'
    },
    noir: {
        id: 'noir',
        name: 'Noir Signature',
        image: '/gift-vouchers/voucher-noir.svg'
    }
};

const generateGiftCardCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'AUX-';
    for (let i = 0; i < 4; i += 1) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    code += '-';
    for (let i = 0; i < 4; i += 1) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
};

const createGiftCardInternal = async (giftCardData, userId, userName, userEmail) => {
    const {
        type,
        amount,
        recipientName,
        recipientEmail,
        senderName,
        message,
        deliveryDate,
        shippingAddress,
        voucherTemplate,
        paymentMethod,
        paymentStatus,
        transactionId,
        bankStatementPath
    } = giftCardData;

    const normalizedType = String(type || '').toLowerCase();
    if (normalizedType !== 'e-gift' && normalizedType !== 'physical') {
        throw new Error('Invalid gift card type.');
    }

    const parsedAmount = Number(amount);
    if (!allowedAmounts.includes(parsedAmount)) {
        throw new Error(`Amount must be one of: ${allowedAmounts.join(', ')}`);
    }

    if (normalizedType === 'e-gift') {
        if (!recipientEmail || !String(recipientEmail).includes('@')) {
            throw new Error('Valid recipient email is required for e-gift cards.');
        }
    }

    if (normalizedType === 'physical') {
        if (!shippingAddress || !String(shippingAddress).trim()) {
            throw new Error('Shipping address is required for physical gift cards.');
        }
    }

    const requestedTemplateId = String(voucherTemplate?.id || '').toLowerCase();
    const selectedTemplate = allowedVoucherTemplates[requestedTemplateId] || allowedVoucherTemplates.aurora;
    const normalizedPaymentMethod = String(paymentMethod || 'Card');
    const normalizedPaymentStatus = String(paymentStatus || 'Verified');

    // For bank transfers, don't generate code yet - wait for admin confirmation
    const shouldGenerateCode = normalizedPaymentMethod === 'Card' || normalizedPaymentStatus === 'Verified';
    const giftCardCode = shouldGenerateCode ? generateGiftCardCode() : null;

    const giftCard = {
        purchaseId: `GC-${Date.now()}`,
        code: giftCardCode,
        purchaser: userId,
        purchaserName: userName || userEmail,
        purchaserEmail: userEmail || '',
        type: normalizedType,
        amount: parsedAmount,
        remainingBalance: shouldGenerateCode ? parsedAmount : 0,
        senderName: senderName ? String(senderName).trim() : userName || 'AUREX Customer',
        recipientName: recipientName ? String(recipientName).trim() : '',
        recipientEmail: recipientEmail ? String(recipientEmail).trim() : '',
        shippingAddress: shippingAddress ? String(shippingAddress).trim() : '',
        message: message ? String(message).trim() : '',
        deliveryDate: deliveryDate || null,
        voucherTemplate: selectedTemplate,
        payment: {
            method: normalizedPaymentMethod,
            status: normalizedPaymentStatus,
            transactionId: transactionId ? String(transactionId) : `GFT-${Date.now()}`
        },
        bankPaymentData: {
            statementPath: normalizedPaymentMethod === 'BankTransfer' ? (bankStatementPath || null) : null,
            uploadedAt: normalizedPaymentMethod === 'BankTransfer' ? new Date() : null,
            confirmedBy: null,
            confirmedAt: null,
            rejectionReason: null
        },
        purchaseSummary: {
            orderId: transactionId ? String(transactionId) : '',
            paymentMethod: normalizedPaymentMethod,
            paymentStatus: normalizedPaymentStatus,
            totalPaid: parsedAmount,
            paidAt: new Date()
        },
        emailDeliveryStatus: normalizedType === 'e-gift' ? 'pending' : 'not-required',
        status: normalizedPaymentStatus === 'Pending' ? 'pending' : 'active',
        createdAt: new Date()
    };

    // Only send email for verified card payments or confirmed bank transfers
    if (giftCard.type === 'e-gift' && shouldGenerateCode) {
        try {
            await sendGiftCardEmail({
                recipientEmail: giftCard.recipientEmail,
                recipientName: giftCard.recipientName,
                senderName: giftCard.senderName,
                amount: giftCard.amount,
                code: giftCard.code,
                message: giftCard.message,
                deliveryDate: giftCard.deliveryDate
            });
            giftCard.emailDeliveryStatus = 'sent';
        } catch (emailError) {
            console.error('Email sending error:', emailError.message);
            giftCard.emailDeliveryStatus = 'failed';
        }
    }

    console.log('=== CREATING GIFT CARD ===');
    console.log('Payment Method:', normalizedPaymentMethod);
    console.log('Payment Status:', normalizedPaymentStatus);
    console.log('Gift Card Status:', giftCard.status);
    console.log('Gift Card Code:', giftCard.code);
    console.log('Should Generate Code:', shouldGenerateCode);
    
    const createdCard = await GiftCard.create(giftCard);
    console.log('Gift Card Created Successfully:', createdCard._id);
    console.log('Created Card Data:', {
        _id: createdCard._id,
        status: createdCard.status,
        paymentMethod: createdCard.payment?.method,
        paymentStatus: createdCard.payment?.status,
        code: createdCard.code
    });
    
    if (global.io) {
        global.io.emit('admin:giftCardCreated', createdCard);
    }
    
    return createdCard;
};

exports.purchaseGiftCard = async (req, res) => {
    try {
        const createdGiftCard = await createGiftCardInternal(
            req.body,
            req.user._id,
            req.user.name,
            req.user.email
        );

        return res.status(201).json({
            message: createdGiftCard.type === 'e-gift'
                ? 'E-gift card purchased and sent to recipient email.'
                : 'Physical gift card purchased successfully.',
            giftCard: createdGiftCard
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.createGiftCardInternal = createGiftCardInternal;

exports.getMyGiftCards = async (req, res) => {
    try {
        const dbCards = await GiftCard.find({ purchaser: req.user._id }).sort({ createdAt: -1 }).lean();

        return res.json(dbCards);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.getAllGiftCardsForAdmin = async (req, res) => {
    try {
        const all = await GiftCard.find({}).sort({ createdAt: -1 }).lean();
        return res.json(all);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.validateGiftCard = async (req, res) => {
    try {
        const { code } = req.params;
        const requestedTotal = Number(req.query.orderTotal);
        if (!code || !String(code).trim()) {
            return res.status(400).json({ message: 'Gift card code is required.' });
        }

        const card = await GiftCard.findOne({ code: String(code).toUpperCase() });
        if (!card) {
            return res.status(404).json({ message: 'Gift card not found.' });
        }

        if (card.status !== 'active') {
            return res.status(400).json({ message: 'Gift card is not active.' });
        }

        const remainingBalance = Number(card.remainingBalance ?? card.amount ?? 0);
        if (remainingBalance <= 0) {
            return res.status(400).json({ message: 'Gift card has no balance left.' });
        }

        const maxApplicable = Number.isFinite(requestedTotal) && requestedTotal > 0
            ? Math.min(remainingBalance, requestedTotal)
            : remainingBalance;

        return res.json({
            code: card.code,
            status: card.status,
            remainingBalance,
            maxApplicable,
            type: card.type
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Delete a gift card
exports.deleteGiftCard = async (req, res) => {
    try {
        const { cardId } = req.params;
        const userId = req.user._id; // From auth middleware - use _id not id

        // Find the gift card
        const card = await GiftCard.findById(cardId);
        if (!card) {
            return res.status(404).json({ message: 'Gift card not found.' });
        }

        // Check if user owns this gift card (purchaser field)
        if (card.purchaser.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'You are not authorized to delete this gift card.' });
        }

        // Delete the gift card
        await GiftCard.findByIdAndDelete(cardId);

        return res.json({ message: 'Gift card deleted successfully.', cardId });
    } catch (error) {
        console.error('Error deleting gift card:', error);
        return res.status(500).json({ message: error.message });
    }
};

// Get pending bank transfer confirmations for admin
exports.getPendingBankTransfers = async (req, res) => {
    try {
        console.log('=== FETCHING PENDING BANK TRANSFERS ===');
        
        // Query for pending bank transfers - simple and direct
        const pending = await GiftCard.find({
            'payment.method': 'BankTransfer',
            'payment.status': 'Pending',
            'status': 'pending'
        }).sort({ createdAt: -1 });

        console.log(`Found ${pending.length} pending bank transfer confirmations`);

        // Map records with necessary user info
        const records = pending.map(card => ({
            _id: card._id,
            purchaseId: card.purchaseId,
            purchaser: card.purchaser,
            purchaserName: card.purchaserName || 'Unknown',
            purchaserEmail: card.purchaserEmail || '',
            type: card.type,
            amount: card.amount,
            senderName: card.senderName,
            recipientName: card.recipientName,
            recipientEmail: card.recipientEmail,
            payment: {
                method: card.payment?.method || 'BankTransfer',
                status: card.payment?.status || 'Pending',
                transactionId: card.payment?.transactionId || ''
            },
            bankPaymentData: card.bankPaymentData,
            createdAt: card.createdAt,
            status: card.status
        }));

        return res.json({
            message: `Found ${records.length} pending bank transfer confirmations.`,
            count: records.length,
            records: records
        });
    } catch (error) {
        console.error('Error fetching pending bank transfers:', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json({ 
            message: 'Failed to fetch pending bank transfers',
            error: error.message 
        });
    }
};

// Get card payment gift cards for admin dashboard
exports.getCardPaymentGiftCards = async (req, res) => {
    try {
        console.log('=== FETCHING CARD PAYMENT GIFT CARDS ===');
        
        // Query for card payment gift cards - ordered by newest first
        const cardPayments = await GiftCard.find({
            'payment.method': 'Card',
            'payment.status': 'Verified'
        }).sort({ createdAt: -1 });

        console.log(`Found ${cardPayments.length} card payment gift cards`);

        // Map records with necessary info
        const records = cardPayments.map(card => ({
            _id: card._id,
            purchaseId: card.purchaseId,
            purchaser: card.purchaser,
            purchaserName: card.purchaserName || 'Unknown',
            purchaserEmail: card.purchaserEmail || '',
            type: card.type,
            amount: card.amount,
            code: card.code,
            senderName: card.senderName,
            recipientName: card.recipientName,
            recipientEmail: card.recipientEmail,
            status: card.status,
            remainingBalance: card.remainingBalance,
            createdAt: card.createdAt,
            payment: {
                method: card.payment?.method || 'Card',
                status: card.payment?.status || 'Verified',
                transactionId: card.payment?.transactionId || ''
            }
        }));

        return res.json({
            message: `Found ${records.length} card payment gift cards.`,
            count: records.length,
            records: records
        });
    } catch (error) {
        console.error('Error fetching card payment gift cards:', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json({ 
            message: 'Failed to fetch card payment gift cards',
            error: error.message 
        });
    }
};

// Confirm bank transfer and activate gift card
exports.confirmBankTransfer = async (req, res) => {
    try {
        const { giftCardId } = req.params;
        const adminId = req.user._id;

        // Find the gift card
        const giftCard = await GiftCard.findById(giftCardId);
        if (!giftCard) {
            return res.status(404).json({ message: 'Gift card record not found.' });
        }

        // Verify it's a pending bank transfer
        if (giftCard.payment.method !== 'BankTransfer' || giftCard.payment.status !== 'Pending') {
            return res.status(400).json({ message: 'This gift card is not a pending bank transfer.' });
        }

        // Generate gift card code if not already generated
        if (!giftCard.code) {
            giftCard.code = generateGiftCardCode();
        }

        // Update payment status and activate card
        giftCard.payment.status = 'Verified';
        giftCard.purchaseSummary.paymentStatus = 'Verified';
        giftCard.status = 'active';
        giftCard.remainingBalance = giftCard.amount;
        
        // Preserve all bankPaymentData fields while adding confirmation info
        giftCard.bankPaymentData.confirmedBy = adminId;
        giftCard.bankPaymentData.confirmedAt = new Date();
        
        // Log the update
        console.log('=== CONFIRMING BANK TRANSFER ===');
        console.log('Gift Card ID:', giftCardId);
        console.log('New Status:', giftCard.status);
        console.log('New Code:', giftCard.code);
        console.log('Remaining Balance:', giftCard.remainingBalance);
        console.log('Payment Status:', giftCard.payment.status);

        await giftCard.save();
        
        console.log('Gift card saved after confirmation');

        // Send email if it's an e-gift card
        if (giftCard.type === 'e-gift') {
            try {
                await sendGiftCardEmail({
                    recipientEmail: giftCard.recipientEmail,
                    recipientName: giftCard.recipientName,
                    senderName: giftCard.senderName,
                    amount: giftCard.amount,
                    code: giftCard.code,
                    message: giftCard.message,
                    deliveryDate: giftCard.deliveryDate
                });
                giftCard.emailDeliveryStatus = 'sent';
                await giftCard.save();
            } catch (emailError) {
                console.error('Email sending error:', emailError.message);
                giftCard.emailDeliveryStatus = 'failed';
                await giftCard.save();
            }
        } else {
            giftCard.emailDeliveryStatus = 'not-required';
            await giftCard.save();
        }

        if (global.io) {
            global.io.emit('admin:giftCardUpdated', giftCard);
        }

        return res.json({
            message: 'Bank transfer confirmed successfully. Gift card is now active.',
            giftCard
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Reject bank transfer
exports.rejectBankTransfer = async (req, res) => {
    try {
        const { giftCardId } = req.params;
        const { reason } = req.body;
        const adminId = req.user._id;

        if (!reason || !String(reason).trim()) {
            return res.status(400).json({ message: 'Rejection reason is required.' });
        }

        // Find the gift card
        const giftCard = await GiftCard.findById(giftCardId);
        if (!giftCard) {
            return res.status(404).json({ message: 'Gift card record not found.' });
        }

        // Verify it's a pending bank transfer
        if (giftCard.payment.method !== 'BankTransfer' || giftCard.payment.status !== 'Pending') {
            return res.status(400).json({ message: 'This gift card is not a pending bank transfer.' });
        }

        // Update status to rejected
        giftCard.payment.status = 'Rejected';
        giftCard.purchaseSummary.paymentStatus = 'Rejected';
        giftCard.status = 'rejected';
        
        // Preserve all bankPaymentData fields while adding rejection info
        giftCard.bankPaymentData.confirmedBy = adminId;
        giftCard.bankPaymentData.confirmedAt = new Date();
        giftCard.bankPaymentData.rejectionReason = String(reason).trim();
        
        console.log('=== REJECTING BANK TRANSFER ===');
        console.log('Gift Card ID:', giftCardId);
        console.log('New Status:', giftCard.status);
        console.log('Rejection Reason:', giftCard.bankPaymentData.rejectionReason);

        await giftCard.save();

        if (global.io) {
            global.io.emit('admin:giftCardUpdated', giftCard);
        }

        return res.json({
            message: 'Bank transfer rejected successfully.',
            giftCard
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
