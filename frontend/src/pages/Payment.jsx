import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import { CreditCard, ShieldCheck, Lock, ChevronRight, Check, Landmark, Upload, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatPrice, getCurrencyByCode } from '../utils/currency';

const Payment = () => {
    const { cartItems, totalAmount, appliedCoupon, discountAmount, finalTotal, clearCart } = useContext(CartContext);
    const { userInfo, refreshUserProfile } = useContext(AuthContext);
    const navigate = useNavigate();
    const luckyReward = userInfo?.luckySpinReward || null;
    const selectedCurrencyCode = localStorage.getItem('selectedCurrencyCode') || 'USD';
    const isFirstOrder = userInfo?.referralUsed && !userInfo?.referralApplied;
    const [giftCardDetails, setGiftCardDetails] = useState(null);

    // Payment method state
    const [paymentMethod, setPaymentMethod] = useState('Card'); // 'Card' or 'BankTransfer'
    const [bankStatement, setBankStatement] = useState(null);
    const [bankStatementUploadError, setBankStatementUploadError] = useState('');

    const [cardData, setCardData] = useState({
        number: '',
        name: '',
        expiry: '',
        cvv: ''
    });
    const [formError, setFormError] = useState('');
    const [backendErrorDetail, setBackendErrorDetail] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState(1); // 1: Info, 2: Processing, 3: Success
    const [placedOrder, setPlacedOrder] = useState(null);
    const [useLuckyOffer, setUseLuckyOffer] = useState(Boolean(luckyReward));
    const [giftCardCode, setGiftCardCode] = useState('');
    const [giftCardValidation, setGiftCardValidation] = useState(null);
    const [giftCardError, setGiftCardError] = useState('');
    const [birthdayPromoCode, setBirthdayPromoCode] = useState('');
    const [birthdayPromoValidation, setBirthdayPromoValidation] = useState(null);
    const [birthdayPromoError, setBirthdayPromoError] = useState('');

    useEffect(() => {
        if (userInfo?.token) {
            refreshUserProfile().catch(() => {
                // Keep checkout usable even if profile refresh fails.
            });
        }
    }, [userInfo?.token]);

    useEffect(() => {
        if (luckyReward) {
            setUseLuckyOffer(true);
        }
    }, [luckyReward]);

    useEffect(() => {
        // Load gift card details from Gift page if available
        const storedGiftCard = localStorage.getItem('giftCardDetails');
        if (storedGiftCard) {
            try {
                setGiftCardDetails(JSON.parse(storedGiftCard));
            } catch (error) {
                console.error('Failed to parse gift card details:', error);
            }
        }
    }, []);

    const shippingFee = 5.99;
    const [shippingCost, setShippingCost] = useState(null);
    const [shippingInfoData, setShippingInfoData] = useState(null);
    
    useEffect(() => {
        // Get shipping info from Cart's location-based calculation
        const stored = localStorage.getItem('shippingInfo');
        if (stored) {
            try {
                const info = JSON.parse(stored);
                setShippingInfoData(info);
                
                // Cost is stored in paise (LKR * 100)
                // Convert to main display unit (LKR or USD)
                const costInLKR = (info.cost || 0) / 100; // Convert paise to LKR
                
                let costToUse = 0;
                if (selectedCurrencyCode === 'LKR') {
                    costToUse = costInLKR; // Display in LKR
                } else {
                    costToUse = costInLKR / 300; // Convert LKR to USD
                }
                setShippingCost(parseFloat(costToUse.toFixed(2)));
            } catch (error) {
                console.error('Failed to parse shipping info:', error);
                setShippingCost(null); // Set to null to indicate error
            }
        } else {
            setShippingCost(null); // Set to null when no data
        }
    }, [selectedCurrencyCode]);
    
    // Use location-based shipping if available, otherwise use default
    const finalShippingFee = shippingCost !== null ? shippingCost : shippingFee;
    // Use finalTotal if coupon is applied, otherwise use totalAmount
    const subtotal = appliedCoupon && appliedCoupon.available ? finalTotal : totalAmount;
    const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    const getOfferDiscountAmount = () => {
        if (!useLuckyOffer || !luckyReward) return 0;

        if (luckyReward.type === 'discount') {
            return (subtotal * Number(luckyReward.value || 0)) / 100;
        }

        if (luckyReward.type === 'bundle-discount') {
            if (itemCount < 2) return 0;
            return (subtotal * Number(luckyReward.value || 0)) / 100;
        }

        if (luckyReward.type === 'flat-discount') {
            return Math.min(Number(luckyReward.value || 0), subtotal);
        }

        if (luckyReward.type === 'shipping') {
            return finalShippingFee;
        }

        return 0;
    };

    const offerDiscount = getOfferDiscountAmount();
    
    // Calculate referral discount for new users
    const referralDiscount = userInfo?.referralUsed && !userInfo?.referralApplied ? (subtotal * 10) / 100 : 0;
    
    const preGiftTotal = Math.max(0, subtotal + finalShippingFee - offerDiscount - referralDiscount);
    const giftCardDiscount = giftCardValidation ? Number(giftCardValidation.maxApplicable || 0) : 0;
    const finalPayable = Math.max(0, preGiftTotal - giftCardDiscount);
    
    // Calculate total including gift card purchase
    const orderTotal = giftCardDetails 
        ? (cartItems.length === 0 ? giftCardDetails.amount : finalPayable + giftCardDetails.amount)
        : finalPayable;
    
    const bundleOfferNotEligible =
        useLuckyOffer && luckyReward?.type === 'bundle-discount' && itemCount < 2;

    const applyGiftCard = async () => {
        const normalized = giftCardCode.trim().toUpperCase();
        if (!normalized) {
            setGiftCardError('Please enter a gift card code.');
            return;
        }

        try {
            setGiftCardError('');
            const { data } = await api.get(`/gift-cards/validate/${encodeURIComponent(normalized)}`, {
                params: { orderTotal: preGiftTotal }
            });
            setGiftCardValidation(data);
            setGiftCardCode(normalized);
        } catch (error) {
            setGiftCardValidation(null);
            setGiftCardError(error.response?.data?.message || 'Unable to apply gift card.');
        }
    };

    const removeGiftCard = () => {
        setGiftCardValidation(null);
        setGiftCardCode('');
        setGiftCardError('');
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) {
            setBankStatement(null);
            setBankStatementUploadError('');
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.type)) {
            setBankStatementUploadError('Invalid file type. Only JPEG, PNG, and PDF allowed.');
            setBankStatement(null);
            return;
        }

        if (file.size > maxSize) {
            setBankStatementUploadError('File size exceeds 5MB limit.');
            setBankStatement(null);
            return;
        }

        setBankStatement(file);
        setBankStatementUploadError('');
    };

    const formatExpiryInput = (value) => {
        const digits = value.replace(/\D/g, '').slice(0, 4);
        if (digits.length <= 2) return digits;
        return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setBackendErrorDetail('');

        if (!userInfo?.token) {
            setFormError('Please login before placing an order.');
            navigate('/login', { state: { from: '/payment' } });
            return;
        }
        
        // Validate payment method specific requirements
        setFormError('');
        if (paymentMethod === 'BankTransfer' && !bankStatement) {
            setBankStatementUploadError('Please upload bank statement copy to proceed.');
            setFormError('Please upload bank statement copy to proceed.');
            return;
        }

        if (paymentMethod === 'Card') {
            if (!cardData.name || !cardData.number || !cardData.expiry || !cardData.cvv) {
                setFormError('Please fill in all card details.');
                return;
            }
            // Simple card number validation
            if (!/^\d{4} \d{4} \d{4} \d{4}$/.test(cardData.number)) {
                setFormError('Card number must be 16 digits (0000 0000 0000 0000).');
                return;
            }

            const expiryMatch = cardData.expiry.trim().match(/^(\d{2})\s*\/\s*(\d{2})$/);
            if (!expiryMatch) {
                setFormError('Expiry must be MM/YY.');
                return;
            }

            const month = Number(expiryMatch[1]);
            if (month < 1 || month > 12) {
                setFormError('Expiry month must be between 01 and 12.');
                return;
            }

            if (!/^\d{3}$/.test(cardData.cvv)) {
                setFormError('CVV must be 3 digits.');
                return;
            }
        }

        setIsProcessing(true);
        setStep(2);

        try {
            const orderItems = cartItems && cartItems.length > 0
                ? cartItems.map((item) => ({
                    product: item.product,
                    name: item.name,
                    size: item.size || '',
                    quantity: item.quantity,
                    price: item.price
                }))
                : [];

            console.log('=== PAYMENT DEBUG ===');
            console.log('Order Items:', orderItems);
            console.log('Gift Card Details:', giftCardDetails);
            console.log('Order Total (USD):', orderTotal);
            
            // Convert orderTotal to LKR for backend processing (backend always uses LKR for loyalty points)
            const currencyRate = getCurrencyByCode(selectedCurrencyCode).rate || 1;
            const orderTotalInLKR = orderTotal * currencyRate;
            console.log(`Order Total (${selectedCurrencyCode}):`, orderTotalInLKR);

            let orderData;

            if (paymentMethod === 'BankTransfer') {
                const formData = new FormData();
                formData.append('items', JSON.stringify(orderItems));
                formData.append('totalAmount', orderTotalInLKR);
                formData.append('paymentMethod', paymentMethod);
                if (giftCardDetails) {
                    formData.append('giftCardPurchase', JSON.stringify(giftCardDetails));
                }
                if (useLuckyOffer && luckyReward && !bundleOfferNotEligible) {
                    formData.append('appliedOffer', JSON.stringify({
                        code: luckyReward.code,
                        label: luckyReward.label,
                        type: luckyReward.type,
                        value: luckyReward.value,
                        discountAmount: Number(offerDiscount.toFixed(2))
                    }));
                }
                if (appliedCoupon && appliedCoupon.available) {
                    formData.append('appliedCoupon', JSON.stringify({
                        couponCode: appliedCoupon.couponCode,
                        discount: appliedCoupon.discount,
                        discountAmount: Number(discountAmount.toFixed(2))
                    }));
                }
                if (birthdayPromoValidation) {
                    formData.append('birthdayPromo', JSON.stringify({
                        promoCode: birthdayPromoValidation.promoCode,
                        discountPercentage: birthdayPromoValidation.discountPercentage,
                        discountAmount: birthdayPromoValidation.discountAmount
                    }));
                }
                if (giftCardValidation) {
                    formData.append('giftCardRedemption', JSON.stringify({
                        code: giftCardValidation.code,
                        amount: Number(giftCardValidation.maxApplicable || 0)
                    }));
                }
                if (referralDiscount > 0) {
                    formData.append('referralApplied', JSON.stringify({
                        discountAmount: Number(referralDiscount.toFixed(2)),
                        discountPercent: 10
                    }));
                }
                formData.append('bankStatement', bankStatement);

                const response = await api.post('/orders', formData);
                orderData = response.data;
            } else {
                const orderPayload = {
                    items: orderItems,
                    totalAmount: orderTotalInLKR,
                    paymentMethod,
                    ...(giftCardDetails && { giftCardPurchase: giftCardDetails }),
                    appliedOffer: useLuckyOffer && luckyReward && !bundleOfferNotEligible
                        ? {
                            code: luckyReward.code,
                            label: luckyReward.label,
                            type: luckyReward.type,
                            value: luckyReward.value,
                            discountAmount: Number(offerDiscount.toFixed(2))
                        }
                        : null,
                    appliedCoupon: appliedCoupon && appliedCoupon.available
                        ? {
                            couponCode: appliedCoupon.couponCode,
                            discount: appliedCoupon.discount,
                            discountAmount: Number(discountAmount.toFixed(2))
                        }
                        : null,
                    birthdayPromo: birthdayPromoValidation
                        ? {
                            promoCode: birthdayPromoValidation.promoCode,
                            discountPercentage: birthdayPromoValidation.discountPercentage,
                            discountAmount: birthdayPromoValidation.discountAmount
                        }
                        : null,
                    giftCardRedemption: giftCardValidation
                        ? {
                            code: giftCardValidation.code,
                            amount: Number(giftCardValidation.maxApplicable || 0)
                        }
                        : null,
                    referralApplied: referralDiscount > 0
                        ? {
                            discountAmount: Number(referralDiscount.toFixed(2)),
                            discountPercent: 10
                        }
                        : null
                };

                const response = await api.post('/orders', orderPayload);
                orderData = response.data;
            }

            setPlacedOrder(orderData);

            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#f4ad36', '#fff4dd', '#acc7ea']
            });

            if (appliedCoupon && appliedCoupon.available) {
                const subscribersData = JSON.parse(localStorage.getItem('subscribersData')) || {};
                if (subscribersData[appliedCoupon.email]) {
                    subscribersData[appliedCoupon.email].used = true;
                    subscribersData[appliedCoupon.email].orderId = orderData?._id || '';
                    localStorage.setItem('subscribersData', JSON.stringify(subscribersData));
                }
                localStorage.removeItem('currentCoupon');
            }

            alert(`Payment successful!\n\nOrder ID: ${orderData?.orderId || 'Generated'}`);
            
            // Refresh user profile to update referral status
            try {
                await refreshUserProfile();
            } catch (err) {
                console.error('Failed to refresh user profile:', err);
            }
            
            setStep(3);
            clearCart();
            localStorage.removeItem('giftCardDetails');
        } catch (error) {
            console.error('Payment error:', error);
            const statusCode = error.response?.status;
            const isNetworkError = !error.response;
            const serverMessage = error.response?.data?.message || error.message || 'Please try again.';
            const userMessage = isNetworkError
                ? 'Network error: Cannot connect to server. Please make sure backend is running on port 5001.'
                : `Payment failed. ${serverMessage}`;

            setFormError(userMessage);
            setBackendErrorDetail(`Backend response${statusCode ? ` (${statusCode})` : ''}: ${serverMessage}`);
            alert(userMessage);
            setStep(1);
            setIsProcessing(false);
        }
    };

    if (cartItems.length === 0 && !giftCardDetails && step !== 3) {
        return (
            <div className="container" style={{ padding: '100px', textAlign: 'center' }}>
                <h2>NO PENDING PAYMENTS</h2>
                <button onClick={() => navigate('/shop')} className="btn-primary" style={{ marginTop: '20px' }}>GO TO SHOP</button>
            </div>
        );
    }

    if (!userInfo?.token) {
        return (
            <div className="container" style={{ padding: '100px', textAlign: 'center' }}>
                <h2>LOGIN REQUIRED</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
                    Please login to complete card or bank transfer payments.
                </p>
                <button onClick={() => navigate('/login', { state: { from: '/payment' } })} className="btn-primary" style={{ marginTop: '20px' }}>
                    GO TO LOGIN
                </button>
            </div>
        );
    }

    if (step === 3) {
        const currencyRate = getCurrencyByCode(selectedCurrencyCode).rate || 1;
        const totalAmountInLKR = (placedOrder?.totalAmount || orderTotal || 0) * currencyRate;
        const loyaltyPointsEarned = Math.floor(totalAmountInLKR / 100) * 5;
        
        return (
            <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
                <div className="glass-card fade-in" style={{ maxWidth: '500px', margin: '0 auto', padding: '60px 40px' }}>
                    <div style={{ width: '80px', height: '80px', background: 'var(--success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px' }}>
                        <Check size={40} color="#000" />
                    </div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>PAYMENT RECEIVED</h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
                        {paymentMethod === 'BankTransfer' 
                            ? 'Bank statement received. Admin will verify within 24 hours.' 
                            : 'Your order has been confirmed and is being processed.'}
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '30px' }}>
                        Order ID: {placedOrder?.orderId || 'Generated'}
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <button
                            onClick={() => navigate(placedOrder?._id ? `/tracking/${placedOrder._id}` : '/tracking')}
                            className="btn-primary"
                        >
                            VIEW MY ORDERS
                        </button>
                        <button onClick={() => navigate('/shop')} className="btn-outline">CONTINUE SHOPPING</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '44px 0 70px' }}>
            {isFirstOrder && (
                <div style={{ maxWidth: '1200px', margin: '0 auto 30px', padding: '16px', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)', border: '2px solid rgba(34, 197, 94, 0.4)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.8rem' }}>🎉</span>
                    <div>
                        <p style={{ margin: 0, fontWeight: 700, color: '#22c55e', fontSize: '1rem' }}>First Order Referral Bonus Applied!</p>
                        <p style={{ margin: '4px 0 0 0', color: '#22c55e', fontSize: '0.9rem' }}>You'll save 10% on this purchase — thanks for joining via referral!</p>
                    </div>
                </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
                <div>
                    <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', marginBottom: '10px', fontFamily: 'Sora, sans-serif' }}>Secure payment</h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Choose your payment method to complete the transaction.</p>

                    <div className="glass-card">
                        {/* Payment Method Selector */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
                            <div
                                onClick={() => { setPaymentMethod('Card'); setBankStatementUploadError(''); }}
                                style={{
                                    padding: '15px',
                                    background: paymentMethod === 'Card' ? 'linear-gradient(120deg, var(--accent), var(--accent-soft))' : 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    border: `2px solid ${paymentMethod === 'Card' ? 'var(--accent)' : 'var(--border-color)'}`,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <CreditCard color={paymentMethod === 'Card' ? '#2a1d06' : 'var(--accent-soft)'} />
                                <div>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: paymentMethod === 'Card' ? '#2a1d06' : '#fff' }}>Credit Card</p>
                                    <p style={{ fontSize: '0.7rem', color: paymentMethod === 'Card' ? 'rgba(42,29,6,0.75)' : 'var(--text-secondary)', margin: 0 }}>Visa, Mastercard</p>
                                </div>
                            </div>

                            <div
                                onClick={() => { setPaymentMethod('BankTransfer'); setBankStatementUploadError(''); }}
                                style={{
                                    padding: '15px',
                                    background: paymentMethod === 'BankTransfer' ? 'linear-gradient(120deg, var(--accent), var(--accent-soft))' : 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    border: `2px solid ${paymentMethod === 'BankTransfer' ? 'var(--accent)' : 'var(--border-color)'}`,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Landmark color={paymentMethod === 'BankTransfer' ? '#2a1d06' : 'var(--accent-soft)'} />
                                <div>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: paymentMethod === 'BankTransfer' ? '#2a1d06' : '#fff' }}>Bank Transfer</p>
                                    <p style={{ fontSize: '0.7rem', color: paymentMethod === 'BankTransfer' ? 'rgba(42,29,6,0.75)' : 'var(--text-secondary)', margin: 0 }}>Direct Transfer</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handlePayment}>
                            {backendErrorDetail && (
                                <div
                                    style={{
                                        background: 'rgba(255, 77, 77, 0.12)',
                                        border: '1px solid rgba(255, 77, 77, 0.35)',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        marginBottom: '16px'
                                    }}
                                >
                                    <p style={{ margin: '0 0 6px 0', color: '#ff8080', fontWeight: 700 }}>
                                        Payment Error Details
                                    </p>
                                    <p style={{ margin: 0, color: '#ffd1d1', fontSize: '0.9rem', wordBreak: 'break-word' }}>
                                        {backendErrorDetail}
                                    </p>
                                </div>
                            )}

                            {/* Card Payment Form */}
                            {paymentMethod === 'Card' && (
                                <>
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CARDHOLDER NAME</label>
                                        <input
                                            type="text"
                                            placeholder="JOHN DOE"
                                            value={cardData.name}
                                            required
                                            style={{ width: '100%', padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }}
                                            onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CARD NUMBER</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="text"
                                                placeholder="0000 0000 0000 0000"
                                                value={cardData.number}
                                                required
                                                maxLength="19"
                                                style={{ width: '100%', padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }}
                                                onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                                            />
                                            <CreditCard size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>EXPIRY DATE</label>
                                            <input
                                                type="text"
                                                placeholder="MM/YY"
                                                value={cardData.expiry}
                                                required
                                                maxLength="5"
                                                style={{ width: '100%', padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }}
                                                onChange={(e) => setCardData({ ...cardData, expiry: formatExpiryInput(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CVV</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="password"
                                                    placeholder="***"
                                                    value={cardData.cvv}
                                                    required
                                                    maxLength="3"
                                                    style={{ width: '100%', padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }}
                                                    onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                                                />
                                                <Lock size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {luckyReward && (
                                <div style={{ marginBottom: '20px', background: 'rgba(0, 212, 212, 0.12)', border: '1px solid rgba(0, 212, 212, 0.35)', borderRadius: '8px', padding: '12px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={useLuckyOffer}
                                            onChange={(e) => setUseLuckyOffer(e.target.checked)}
                                        />
                                        <span style={{ fontWeight: 700, color: '#9ef7ff' }}>
                                            Apply Lucky Spin Offer: {luckyReward.label} ({luckyReward.code})
                                        </span>
                                    </label>
                                    {bundleOfferNotEligible && (
                                        <p style={{ margin: '8px 0 0', color: '#ffb0b0', fontSize: '0.85rem' }}>
                                            This offer requires at least 2 items in cart.
                                        </p>
                                    )}
                                </div>
                            )}

                            <div style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                                <p style={{ margin: '0 0 8px 0', fontWeight: 700 }}>Gift Card</p>
                                {giftCardValidation ? (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                        <p style={{ margin: 0, color: '#9ef7ff', fontSize: '0.9rem' }}>
                                            Applied {giftCardValidation.code} (-{formatPrice(Number(giftCardValidation.maxApplicable || 0), selectedCurrencyCode)})
                                        </p>
                                        <button
                                            type="button"
                                            onClick={removeGiftCard}
                                            style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                            <input
                                                type="text"
                                                placeholder="Enter gift card code"
                                                value={giftCardCode}
                                                onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                                                style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={applyGiftCard}
                                                style={{ padding: '10px 12px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                                            >
                                                Apply
                                            </button>
                                        </div>
                                        {giftCardError && <p style={{ margin: 0, color: '#ffb0b0', fontSize: '0.85rem' }}>{giftCardError}</p>}
                                    </>
                                )}
                            </div>

                            {/* Bank Transfer Form */}
                            {paymentMethod === 'BankTransfer' && (
                                <>
                                    <div style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid var(--accent)', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
                                        <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <AlertCircle size={18} color="var(--accent)" />
                                            Bank Transfer Details
                                        </h4>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                            <p><strong>Bank Name:</strong> AUREX Finance Bank</p>
                                            <p><strong>Account Name:</strong> AUREX Limited</p>
                                            <p><strong>Account Number:</strong> 1234567890</p>
                                            <p><strong>Routing Number:</strong> AUREX001</p>
                                            <p style={{ marginTop: '10px', color: '#fff' }}>Please include your Order ID in the transfer reference and upload a copy of the bank statement.</p>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>UPLOAD BANK STATEMENT COPY</label>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '10px',
                                                padding: '30px',
                                                background: 'var(--bg-secondary)',
                                                border: `2px dashed ${bankStatement ? 'var(--accent)' : 'var(--border-color)'}`,
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                position: 'relative'
                                            }}
                                            onClick={() => document.getElementById('bankStatementInput').click()}
                                        >
                                            <input
                                                id="bankStatementInput"
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.pdf"
                                                onChange={handleFileSelect}
                                                style={{ display: 'none' }}
                                            />
                                            <Upload size={20} color={bankStatement ? 'var(--accent)' : 'var(--text-secondary)'} />
                                            <div style={{ textAlign: 'left' }}>
                                                <p style={{ margin: 0, fontWeight: 600, color: bankStatement ? 'var(--accent)' : '#fff' }}>
                                                    {bankStatement ? bankStatement.name : 'Click to upload or drag file'}
                                                </p>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    JPEG, PNG, or PDF (max 5MB)
                                                </p>
                                            </div>
                                        </div>
                                        {bankStatementUploadError && (
                                            <p style={{ color: '#ff8080', fontSize: '0.85rem', marginTop: '8px' }}>
                                                {bankStatementUploadError}
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}

                            {formError && (
                                <p style={{ color: '#ff8080', fontSize: '0.95rem', marginBottom: '12px', textAlign: 'center' }}>{formError}</p>
                            )}
                            <button
                                type="submit"
                                className="btn-primary"
                                style={{ width: '100%', padding: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '1.1rem' }}
                                disabled={isProcessing || (paymentMethod === 'BankTransfer' && !bankStatement)}
                            >
                                {isProcessing ? 'PROCESSING...' : (
                                    <>
                                        {paymentMethod === 'Card' ? 'PAY' : 'SUBMIT'} {formatPrice(orderTotal, selectedCurrencyCode)} <ChevronRight size={20} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                <ShieldCheck size={16} /> SSL SECURED
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                <Lock size={16} /> SECURE TRANSFER
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-card" style={{ height: 'fit-content' }}>
                    <h3 style={{ marginBottom: '20px' }}>ORDER SUMMARY</h3>
                    {giftCardDetails && (
                        <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(0,242,255,0.08)', border: '1px solid rgba(0,242,255,0.3)', borderRadius: '8px' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: 'var(--accent)' }}>GIFT CARD PURCHASE</h4>
                            {giftCardDetails.voucherTemplate?.image && (
                                <img
                                    src={giftCardDetails.voucherTemplate.image}
                                    alt={giftCardDetails.voucherTemplate.name}
                                    style={{ width: '100%', maxWidth: '200px', borderRadius: '8px', marginBottom: '10px' }}
                                />
                            )}
                            <p style={{ margin: '6px 0', fontSize: '0.9rem' }}>
                                <strong>Type:</strong> {giftCardDetails.type === 'e-gift' ? 'E-Gift Card' : 'Physical Gift Card'}
                            </p>
                            <p style={{ margin: '6px 0', fontSize: '0.9rem' }}>
                                <strong>Amount:</strong> {formatPrice(giftCardDetails.amount, selectedCurrencyCode)}
                            </p>
                            {giftCardDetails.voucherTemplate?.name && (
                                <p style={{ margin: '6px 0', fontSize: '0.9rem' }}>
                                    <strong>Design:</strong> {giftCardDetails.voucherTemplate.name}
                                </p>
                            )}
                            {giftCardDetails.recipientName && (
                                <p style={{ margin: '6px 0', fontSize: '0.9rem' }}>
                                    <strong>Recipient:</strong> {giftCardDetails.recipientName}
                                </p>
                            )}
                            {giftCardDetails.recipientEmail && (
                                <p style={{ margin: '6px 0', fontSize: '0.9rem' }}>
                                    <strong>Email:</strong> {giftCardDetails.recipientEmail}
                                </p>
                            )}
                            {giftCardDetails.message && (
                                <p style={{ margin: '6px 0', fontSize: '0.9rem' }}>
                                    <strong>Message:</strong> {giftCardDetails.message}
                                </p>
                            )}
                        </div>
                    )}
                    {cartItems.map(item => (
                        <div key={item.product} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{item.name} x {item.quantity}</span>
                            <span>{formatPrice(item.price * item.quantity, selectedCurrencyCode)}</span>
                        </div>
                    ))}
                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '15px 0' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>SUBTOTAL</span>
                        <span>{formatPrice(giftCardDetails ? giftCardDetails.amount + subtotal : subtotal, selectedCurrencyCode)}</span>
                    </div>
                    {cartItems.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem', alignItems: 'center' }}>
                            <div>
                                <span style={{ color: 'var(--text-secondary)' }}>SHIPPING</span>
                                {shippingInfoData && (
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        📍 {shippingInfoData.district}
                                    </p>
                                )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ color: finalShippingFee === 0 ? 'var(--success)' : '#fff', fontWeight: finalShippingFee === 0 ? 600 : 400 }}>
                                    {finalShippingFee === 0 ? 'FREE' : formatPrice(finalShippingFee, selectedCurrencyCode)}
                                </div>
                                {shippingInfoData?.discountApplied && (
                                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--success)' }}>✨ Discount</p>
                                )}
                            </div>
                        </div>
                    )}
                    {appliedCoupon && appliedCoupon.available && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem' }}>
                            <span style={{ color: '#76DD66' }}>NEWSLETTER DISCOUNT ({appliedCoupon.discount}%)</span>
                            <span style={{ color: '#76DD66' }}>-{formatPrice(discountAmount, selectedCurrencyCode)}</span>
                        </div>
                    )}
                    {useLuckyOffer && luckyReward && !bundleOfferNotEligible && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem' }}>
                            <span style={{ color: '#9ef7ff' }}>LUCKY OFFER ({luckyReward.code})</span>
                            <span style={{ color: '#9ef7ff' }}>-{formatPrice(offerDiscount, selectedCurrencyCode)}</span>
                        </div>
                    )}
                    {giftCardValidation && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem' }}>
                            <span style={{ color: '#9ef7ff' }}>GIFT CARD ({giftCardValidation.code})</span>
                            <span style={{ color: '#9ef7ff' }}>-{formatPrice(giftCardDiscount, selectedCurrencyCode)}</span>
                        </div>
                    )}
                    {referralDiscount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem' }}>
                            <span style={{ color: '#22c55e', fontWeight: 600 }}>REFERRAL BONUS (10%)</span>
                            <span style={{ color: '#22c55e', fontWeight: 600 }}>-{formatPrice(referralDiscount, selectedCurrencyCode)}</span>
                        </div>
                    )}
                    
                    {/* Loyalty Points Earned Preview */}
                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '15px 0' }}></div>

                    
                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '15px 0' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 700 }}>
                        <span>TOTAL</span>
                        <span style={{ color: 'var(--accent)' }}>{formatPrice(orderTotal, selectedCurrencyCode)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Payment;
