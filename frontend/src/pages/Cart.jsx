import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { Trash2, ShoppingBag, CreditCard, ArrowRight, Plus, Minus, Edit2, Check, BookmarkPlus, RotateCcw, MapPin, Truck } from 'lucide-react';
import { formatPrice } from '../utils/currency';

// ==================== SRI LANKA SHIPPING ZONES DATABASE ====================
const SRI_LANKA_DISTRICTS = [
    { id: 1, name: 'Colombo', zone: 'Western Central', distance: 0, baseShipping: 0, deliveryDays: '1-2', emoji: '🏙️' },
    { id: 2, name: 'Gampaha', zone: 'Western', distance: 25, baseShipping: 150, deliveryDays: '1-2', emoji: '🌆' },
    { id: 3, name: 'Kalutara', zone: 'Western', distance: 40, baseShipping: 250, deliveryDays: '2-3', emoji: '🏖️' },
    { id: 4, name: 'Galle', zone: 'Southern', distance: 120, baseShipping: 400, deliveryDays: '2-3', emoji: '🏔️' },
    { id: 5, name: 'Matara', zone: 'Southern', distance: 160, baseShipping: 500, deliveryDays: '3-4', emoji: '🌴' },
    { id: 6, name: 'Hambantota', zone: 'Southern', distance: 240, baseShipping: 650, deliveryDays: '3-4', emoji: '🏝️' },
    { id: 7, name: 'Kandy', zone: 'Central Highland', distance: 115, baseShipping: 400, deliveryDays: '2-3', emoji: '⛰️' },
    { id: 8, name: 'Matale', zone: 'Central Highland', distance: 155, baseShipping: 500, deliveryDays: '2-3', emoji: '🌿' },
    { id: 9, name: 'Nuwara Eliya', zone: 'Central Highland', distance: 180, baseShipping: 600, deliveryDays: '3-4', emoji: '❄️' },
    { id: 10, name: 'Jaffna', zone: 'Northern', distance: 400, baseShipping: 1000, deliveryDays: '4-5', emoji: '🌊' },
    { id: 11, name: 'Mullaitivu', zone: 'Eastern', distance: 350, baseShipping: 900, deliveryDays: '4-5', emoji: '🏴' },
    { id: 12, name: 'Batticaloa', zone: 'Eastern', distance: 280, baseShipping: 800, deliveryDays: '3-4', emoji: '🚤' },
    { id: 13, name: 'Ampara', zone: 'Eastern', distance: 320, baseShipping: 850, deliveryDays: '3-4', emoji: '🐠' },
    { id: 14, name: 'Trincomalee', zone: 'Eastern', distance: 260, baseShipping: 750, deliveryDays: '3-4', emoji: '⛱️' },
    { id: 15, name: 'Anuradhapura', zone: 'North Central', distance: 210, baseShipping: 600, deliveryDays: '3-4', emoji: '🏛️' },
    { id: 16, name: 'Polonnaruwa', zone: 'North Central', distance: 220, baseShipping: 650, deliveryDays: '3-4', emoji: '🗿' },
    { id: 17, name: 'Kurunegala', zone: 'North Western', distance: 90, baseShipping: 300, deliveryDays: '2-3', emoji: '🌾' },
    { id: 18, name: 'Puttalm', zone: 'North Western', distance: 130, baseShipping: 400, deliveryDays: '2-3', emoji: '🐚' },
    { id: 19, name: 'Vavuniya', zone: 'Northern', distance: 290, baseShipping: 800, deliveryDays: '3-4', emoji: '🦁' },
    { id: 20, name: 'Badulla', zone: 'Uva', distance: 280, baseShipping: 800, deliveryDays: '3-4', emoji: '🌄' },
    { id: 21, name: 'Monaragala', zone: 'Uva', distance: 320, baseShipping: 850, deliveryDays: '3-4', emoji: '🦅' },
    { id: 22, name: 'Ratnapura', zone: 'Sabaragamuwa', distance: 100, baseShipping: 350, deliveryDays: '2-3', emoji: '💎' },
    { id: 23, name: 'Kegalle', zone: 'Sabaragamuwa', distance: 85, baseShipping: 300, deliveryDays: '2-3', emoji: '🌲' },
];

const Cart = () => {
    const {
        cartItems,
        removeFromCart,
        updateQuantity,
        appliedCoupon,
        removeCoupon,
        totalAmount,
        discountAmount,
        finalTotal,
        saveForLater,
        savedForLater,
        moveToCartFromSaved,
        removeSavedForLater,
        stockIssues,
        setStockIssues,
        tryApplyCouponCode,
        beginCheckoutSession,
        checkoutExpiryMessage,
        clearCheckoutExpiryMessage
    } = useContext(CartContext);
    const { userInfo } = useContext(AuthContext);
    const navigate = useNavigate();
    const selectedCurrencyCode = localStorage.getItem('selectedCurrencyCode') || 'USD';
    const [isProcessing, setIsProcessing] = useState(false);
    const [shippingError, setShippingError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [editingProductId, setEditingProductId] = useState(null);
    const [editQuantity, setEditQuantity] = useState('');
    const [couponCodeInput, setCouponCodeInput] = useState(appliedCoupon?.couponCode || '');
    const [couponMessage, setCouponMessage] = useState('');
    const [shippingDetails, setShippingDetails] = useState({
        fullName: '',
        phone: '',
        email: userInfo?.email || '',
        addressLine1: '',
        city: '',
        district: '', // NEW: Selected district for location-based shipping
        postalCode: '',
        country: 'Sri Lanka'
    });
    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [showDistrictInfo, setShowDistrictInfo] = useState(false);

    const getItemId = (item) => item.cartKey || (item.size ? `${item.product}::${item.size}` : item.product);

    const handleShippingChange = (field, value) => {
        const next = { ...shippingDetails, [field]: value };
        setShippingDetails(next);
        
        // Real-time validation: clear error for this field when user starts typing
        if (fieldErrors[field]) {
            setFieldErrors({
                ...fieldErrors,
                [field]: undefined
            });
        }
    };

    // Handle district selection with location info display
    const handleDistrictSelect = (district) => {
        setSelectedDistrict(district);
        handleShippingChange('district', district.name);
        setShowDistrictInfo(true);
        // Auto-hide info after 3 seconds
        setTimeout(() => setShowDistrictInfo(false), 3000);
    };

    const handleEditQuantity = (productId, currentQuantity) => {
        setEditingProductId(productId);
        setEditQuantity(currentQuantity.toString());
    };

    const handleSaveQuantity = (productId) => {
        const newQuantity = parseInt(editQuantity, 10);
        if (isNaN(newQuantity) || newQuantity < 1) {
            alert('Please enter a valid quantity (minimum 1)');
            return;
        }
        updateQuantity(productId, newQuantity);
        setEditingProductId(null);
        setEditQuantity('');
    };

    const handleApplyCoupon = () => {
        const result = tryApplyCouponCode(couponCodeInput);
        if (result.ok) {
            setCouponMessage(`Coupon applied: ${result.coupon.discount}% off`);
            return;
        }
        setCouponMessage(result.message || 'Unable to apply coupon');
    };

    const handleCancelEdit = () => {
        setEditingProductId(null);
        setEditQuantity('');
    };

    // ==================== CART LOGIC FUNCTIONS ====================
    
    // Calculate comprehensive cart summary statistics
    const calculateCartSummary = () => {
        if (cartItems.length === 0) {
            return {
                totalItems: 0,
                uniqueProducts: 0,
                averageItemPrice: 0,
                mostExpensive: 0,
                leastExpensive: 0,
                totalWeight: 0
            };
        }

        const prices = cartItems.map(item => item.price);
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        
        return {
            totalItems,
            uniqueProducts: cartItems.length,
            averageItemPrice: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2),
            mostExpensive: Math.max(...prices).toFixed(2),
            leastExpensive: Math.min(...prices).toFixed(2),
            calculatedAt: new Date().toLocaleTimeString()
        };
    };

    // Calculate amount saved with current discount/coupon
    const calculateSavings = () => {
        if (!appliedCoupon && discountAmount === 0) {
            return { savedAmount: 0, savingPercentage: 0, hasDiscount: false };
        }

        const savedAmount = Number(discountAmount) || 0;
        const savingPercentage = totalAmount > 0 ? ((savedAmount / totalAmount) * 100).toFixed(1) : 0;
        
        return {
            savedAmount: savedAmount.toFixed(2),
            savingPercentage,
            discountSource: appliedCoupon ? `Coupon: ${appliedCoupon.couponCode}` : 'Automatic discount',
            hasDiscount: savedAmount > 0
        };
    };

    // Validate cart readiness for checkout with detailed feedback
    const validateCartForCheckout = () => {
        const validation = {
            isValid: true,
            issues: [],
            warnings: [],
            readyToCheckout: true
        };

        // Check cart is not empty
        if (cartItems.length === 0) {
            validation.isValid = false;
            validation.issues.push('Cart is empty');
            validation.readyToCheckout = false;
            return validation;
        }

        // Check for stock issues
        if (stockIssues && stockIssues.length > 0) {
            validation.isValid = false;
            validation.issues.push(...stockIssues);
            validation.readyToCheckout = false;
        }

        // Check shipping details
        const shippingErrors = validateShippingDetails();
        if (Object.keys(shippingErrors).length > 0) {
            validation.isValid = false;
            validation.issues.push('Shipping information incomplete');
            validation.readyToCheckout = false;
        }

        // Check if user is logged in
        if (!userInfo) {
            validation.warnings.push('Please log in to complete checkout');
            validation.isValid = false;
        }

        // Check minimum order value (optional: set to $5 minimum)
        const minOrderValue = 5;
        if (finalTotal < minOrderValue) {
            validation.warnings.push(`Minimum order value is ${formatPrice(minOrderValue, selectedCurrencyCode)}`);
        }

        // Check for bulk discount eligibility
        const cartSummary = calculateCartSummary();
        if (cartSummary.totalItems >= 5) {
            validation.warnings.push('🎉 You\'re eligible for bulk discount on next purchase!');
        }

        return validation;
    };

    // Calculate shipping cost based on Sri Lanka district/location
    const calculateDistrictShippingCost = () => {
        // If no district selected, return default rates
        if (!shippingDetails.district) {
            return {
                baseCost: 0,
                itemSurcharge: 0,
                totalCost: 0,
                discountApplied: false,
                message: 'Select a district to calculate shipping',
            };
        }

        const district = SRI_LANKA_DISTRICTS.find(d => d.name === shippingDetails.district);
        if (!district) return { totalCost: 0, message: 'District not found' };

        // Base cost from district database (LKR rates)
        let baseCost = district.baseShipping;
        const cartSummary = calculateCartSummary();
        
        // Free shipping in Colombo for orders over 2500 LKR (~$8 USD)
        if (district.name === 'Colombo' && finalTotal >= 2500) {
            return {
                baseCost,
                itemSurcharge: 0,
                totalCost: 0,
                discountApplied: true,
                message: '✨ Free shipping in Central Zone!',
                district: district.name,
                deliveryDays: district.deliveryDays
            };
        }

        // Per-item surcharge for bulky orders
        const itemSurcharge = cartSummary.totalItems > 10 ? cartSummary.totalItems * 50 : 0;
        
        let totalCost = baseCost + itemSurcharge;

        // Volume discount: 15% off on orders over 5000 LKR
        if (finalTotal >= 5000) {
            const discount = Math.floor(totalCost * 0.15);
            totalCost -= discount;
            return {
                baseCost,
                itemSurcharge,
                totalCost: Math.max(totalCost, 0), // Minimum 0
                discountApplied: true,
                discount,
                message: `🎯 15% shipping discount applied (${discount} LKR saved)`,
                district: district.name,
                deliveryDays: district.deliveryDays,
                distance: district.distance
            };
        }

        return {
            baseCost,
            itemSurcharge,
            totalCost,
            discountApplied: false,
            district: district.name,
            deliveryDays: district.deliveryDays,
            distance: district.distance
        };
    };

    // Estimate shipping cost based on cart contents and location
    const estimateShippingCost = () => {
        // Use district-based calculation if available
        if (shippingDetails.district) {
            return calculateDistrictShippingCost();
        }

        // Fallback to generic calculation
        const baseShipping = 5.00;
        const cartSummary = calculateCartSummary();
        
        // Base rate + $0.50 per item
        const itemCost = cartSummary.totalItems * 0.50;
        
        // Free shipping on orders over $50
        if (finalTotal >= 50) {
            return {
                estimatedCost: 0,
                isFree: true,
                reason: 'Free shipping on orders over LKR 2,500!',
                savings: (baseShipping + itemCost).toFixed(2)
            };
        }

        // International shipping surcharge
        const isInternational = shippingDetails.country !== 'Sri Lanka';
        const shippingSurcharge = isInternational ? 10.00 : 0;
        
        const totalShipping = baseShipping + itemCost + shippingSurcharge;

        return {
            estimatedCost: totalShipping.toFixed(2),
            breakdown: {
                baseShipping: baseShipping.toFixed(2),
                itemCost: itemCost.toFixed(2),
                surcharge: shippingSurcharge.toFixed(2)
            },
            isFree: false,
            nextFreeShippingThreshold: (50 - finalTotal).toFixed(2)
        };
    };

    const handleIncreaseQuantity = (productId, currentQuantity) => {
        updateQuantity(productId, currentQuantity + 1);
    };

    const handleDecreaseQuantity = (productId, currentQuantity) => {
        if (currentQuantity > 1) {
            updateQuantity(productId, currentQuantity - 1);
        } else {
            removeFromCart(productId);
        }
    };

    const validateShippingDetails = () => {
        const errors = {};
        
        // Check empty fields
        if (!shippingDetails.fullName?.trim()) {
            errors.fullName = 'Full name is required';
        }
        
        if (!shippingDetails.phone?.trim()) {
            errors.phone = 'Phone number is required';
        } else if (!/^\d{10}$/.test(shippingDetails.phone.replace(/\D/g, ''))) {
            errors.phone = 'Please enter a valid 10-digit phone number';
        }
        
        if (!shippingDetails.email?.trim()) {
            errors.email = 'Email address is required';
        } else if (!/^\S+@\S+\.\S+$/.test(shippingDetails.email.trim())) {
            errors.email = 'Please enter a valid email address';
        }
        
        if (!shippingDetails.addressLine1?.trim()) {
            errors.addressLine1 = 'Address is required';
        }
        
        // District is now required instead of city/state
        if (!shippingDetails.district?.trim()) {
            errors.district = 'Please select your district';
        }
        
        if (!shippingDetails.postalCode?.trim()) {
            errors.postalCode = 'Postal code is required';
        }
        
        if (!shippingDetails.country?.trim()) {
            errors.country = 'Country is required';
        }
        
        return errors;
    };

    const handleCheckout = async () => {
        const errors = validateShippingDetails();
        
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setShippingError('Please fix the errors below to continue checkout');
            return;
        }

        setFieldErrors({});
        setShippingError('');

        if (cartItems.length === 0) {
            setShippingError('Your cart is empty. Add items before checkout.');
            return;
        }

        if (stockIssues.length > 0) {
            setShippingError('Please resolve stock issues before checkout.');
            return;
        }

        if (!userInfo) {
            navigate('/login', { state: { from: '/payment' } });
            return;
        }

        setIsProcessing(true);
        try {
            // Calculate and store shipping cost for payment page
            const shippingCalc = estimateShippingCost();
            const shippingData = {
                district: shippingDetails.district,
                cost: shippingCalc.totalCost || 0, // Store in LKR (rupees)
                distance: shippingCalc.distance || 0,
                deliveryDays: shippingCalc.deliveryDays || '3-5',
                baseCost: shippingCalc.baseCost || 0,
                discountApplied: shippingCalc.discountApplied || false
            };
            localStorage.setItem('shippingInfo', JSON.stringify(shippingData));
            
            beginCheckoutSession();
            // navigate to payment instead of creating order immediately
            setIsProcessing(false);
            navigate('/payment');
        } catch (error) {
            console.error(error);
            alert('Checkout failed. Please try again.');
            setIsProcessing(false);
        }
    };

    if (cartItems.length === 0) {
        return (
            <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
                <ShoppingBag size={80} style={{ color: 'var(--text-secondary)', marginBottom: '20px' }} />
                <h2 style={{ fontSize: '2rem', marginBottom: '14px', fontFamily: 'Sora, sans-serif' }}>Your cart is empty</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '18px' }}>Add a few products to continue checkout.</p>
                <Link to="/shop" className="btn-primary">Continue shopping</Link>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '44px 0 70px' }}>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', marginBottom: '34px', fontFamily: 'Sora, sans-serif' }}>Your selection</h1>

            {userInfo?.referralUsed && !userInfo?.referralApplied && (
                <div style={{ marginBottom: '20px', padding: '16px', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)', border: '2px solid rgba(34, 197, 94, 0.4)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.6rem' }}>🎁</span>
                    <div>
                        <p style={{ margin: 0, fontWeight: 700, color: '#22c55e', fontSize: '0.95rem' }}>Welcome! 10% First-Order Referral Discount</p>
                        <p style={{ margin: '4px 0 0 0', color: '#22c55e', fontSize: '0.85rem' }}>Your referral bonus will be automatically applied at checkout</p>
                    </div>
                </div>
            )}

            {checkoutExpiryMessage && (
                <div style={{ marginBottom: '18px', border: '1px solid rgba(255, 140, 0, 0.5)', background: 'rgba(255, 140, 0, 0.12)', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>{checkoutExpiryMessage}</p>
                    <button
                        onClick={clearCheckoutExpiryMessage}
                        style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', padding: '6px 10px' }}
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {stockIssues.length > 0 && (
                <div style={{ marginBottom: '18px', border: '1px solid rgba(239, 68, 68, 0.5)', background: 'rgba(239, 68, 68, 0.12)', borderRadius: '10px', padding: '12px 14px' }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: 700 }}>Stock validation alerts</p>
                    {stockIssues.map((issue, idx) => (
                        <p key={`${issue}-${idx}`} style={{ margin: '0 0 4px 0', fontSize: '0.86rem' }}>• {issue}</p>
                    ))}
                    <button
                        onClick={() => setStockIssues([])}
                        style={{ marginTop: '8px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', padding: '6px 10px' }}
                    >
                        Clear alerts
                    </button>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
                {/* Cart Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {cartItems.map(item => (
                        <div key={getItemId(item)} className="glass-card" style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '18px' }}>
                            <img
                                src={item.image?.startsWith('http://') || item.image?.startsWith('https://') ? item.image : `http://localhost:5001${item.image}`}
                                alt={item.name}
                                style={{ width: '92px', height: '92px', objectFit: 'cover', borderRadius: '12px' }}
                            />
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{item.name}</h3>
                                {item.size && (
                                    <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        Size: <strong>{item.size}</strong>
                                    </p>
                                )}
                                
                                {editingProductId === getItemId(item) ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="number"
                                            min="1"
                                            value={editQuantity}
                                            onChange={(e) => setEditQuantity(e.target.value)}
                                            style={{
                                                width: '70px',
                                                padding: '6px 10px',
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--accent)',
                                                borderRadius: '6px',
                                                color: '#fff',
                                                fontSize: '0.95rem',
                                                fontWeight: 600
                                            }}
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => handleSaveQuantity(getItemId(item))}
                                            style={{
                                                background: 'var(--accent)',
                                                color: '#241804',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '6px 10px',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <Check size={16} /> Save
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            style={{
                                                background: 'transparent',
                                                color: 'var(--text-secondary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                padding: '6px 10px',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '8px' }}>
                                            <button
                                                onClick={() => handleDecreaseQuantity(getItemId(item), item.quantity)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '4px'
                                                }}
                                            >
                                                <Minus size={16} />
                                            </button>
                                            <span style={{ fontWeight: 600, minWidth: '30px', textAlign: 'center' }}>Qty: {item.quantity}</span>
                                            <button
                                                onClick={() => handleIncreaseQuantity(getItemId(item), item.quantity)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '4px'
                                                }}
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleEditQuantity(getItemId(item), item.quantity)}
                                            style={{
                                                background: 'transparent',
                                                color: 'var(--accent)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                padding: '6px 10px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '0.85rem',
                                                fontWeight: 600
                                            }}
                                        >
                                            <Edit2 size={14} /> Edit
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent)' }}>{formatPrice(item.price * item.quantity, selectedCurrencyCode)}</p>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                                    <button
                                        onClick={() => saveForLater(getItemId(item))}
                                        style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        title="Save for later"
                                    >
                                        <BookmarkPlus size={16} />
                                    </button>
                                    <button onClick={() => removeFromCart(getItemId(item))} style={{ background: 'transparent', color: 'var(--error)', border: 'none', cursor: 'pointer' }}>
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {savedForLater.length > 0 && (
                        <div className="glass-card" style={{ padding: '16px' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Saved for later</h3>
                            <div style={{ display: 'grid', gap: '12px' }}>
                                {savedForLater.map((item) => (
                                    <div key={`saved-${getItemId(item)}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 600 }}>{item.name}</p>
                                            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                                                {formatPrice(item.price, selectedCurrencyCode)} • Qty {item.quantity}{item.size ? ` • Size ${item.size}` : ''}
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => moveToCartFromSaved(getItemId(item))}
                                                style={{ background: 'rgba(56, 211, 159, 0.18)', color: 'var(--success)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px' }}
                                            >
                                                Move to cart
                                            </button>
                                            <button
                                                onClick={() => removeSavedForLater(getItemId(item))}
                                                style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px' }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Summary */}
                <div className="glass-card" style={{ height: 'fit-content' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', fontFamily: 'Sora, sans-serif' }}>Order summary</h2>

                    <div style={{ marginBottom: '16px', padding: '12px', border: '1px dashed var(--border-color)', borderRadius: '10px' }}>
                        <h3 style={{ marginBottom: '10px', fontSize: '0.95rem' }}>Summary review</h3>
                        <p style={{ margin: '0 0 4px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Items in cart: {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                        </p>
                        <p style={{ margin: '0 0 4px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Saved for later: {savedForLater.length}
                        </p>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Coupon: {appliedCoupon?.couponCode || 'Not applied'}
                        </p>
                    </div>

                    {/* Cart Intelligence Panel */}
                    {cartItems.length > 0 && (() => {
                        const summary = calculateCartSummary();
                        const savings = calculateSavings();
                        const validation = validateCartForCheckout();
                        const shipping = estimateShippingCost();

                        return (
                            <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid var(--accent-light)', borderRadius: '10px', background: 'rgba(107, 70, 193, 0.05)' }}>
                                <h3 style={{ marginBottom: '10px', fontSize: '0.95rem', color: 'var(--accent)' }}>📊 Cart Intelligence</h3>
                                
                                {/* Cart Stats */}
                                <div style={{ marginBottom: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div style={{ fontSize: '0.8rem', padding: '6px', background: 'rgba(107, 70, 193, 0.1)', borderRadius: '6px' }}>
                                        <p style={{ margin: '0 0 3px 0', color: 'var(--text-secondary)' }}>Avg Price:</p>
                                        <p style={{ margin: 0, fontWeight: 600 }}>{formatPrice(summary.averageItemPrice, selectedCurrencyCode)}</p>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', padding: '6px', background: 'rgba(107, 70, 193, 0.1)', borderRadius: '6px' }}>
                                        <p style={{ margin: '0 0 3px 0', color: 'var(--text-secondary)' }}>Unique Items:</p>
                                        <p style={{ margin: 0, fontWeight: 600 }}>{summary.uniqueProducts}</p>
                                    </div>
                                </div>

                                {/* Savings Alert */}
                                {savings.hasDiscount && (
                                    <div style={{ marginBottom: '8px', padding: '8px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px' }}>
                                        <p style={{ margin: '0 0 2px 0', fontSize: '0.8rem', color: 'var(--success)' }}>✨ You're saving:</p>
                                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--success)' }}>
                                            {formatPrice(savings.savedAmount, selectedCurrencyCode)} ({savings.savingPercentage}%)
                                        </p>
                                    </div>
                                )}

                                {/* Validation Status */}
                                {!validation.isValid && validation.issues.length > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                                        <p style={{ margin: '0 0 3px 0', fontWeight: 600 }}>⚠️ {validation.issues[0]}</p>
                                    </div>
                                )}

                                {/* Location-Based Shipping Info */}
                                {shippingDetails.district && (
                                    <div style={{ marginBottom: '8px', padding: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px' }}>
                                        <p style={{ margin: '0 0 2px 0', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}>📍 {shippingDetails.district}</p>
                                        {SRI_LANKA_DISTRICTS.find(d => d.name === shippingDetails.district) && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.75rem' }}>
                                                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>📏 {SRI_LANKA_DISTRICTS.find(d => d.name === shippingDetails.district).distance} km away</p>
                                                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>🚚 {SRI_LANKA_DISTRICTS.find(d => d.name === shippingDetails.district).deliveryDays}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Shipping Cost Display */}
                                {shippingDetails.district && (
                                    <div style={{ fontSize: '0.8rem', padding: '6px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px' }}>
                                        <p style={{ margin: '0 0 3px 0', color: 'var(--text-secondary)' }}>💰 Shipping Cost:</p>
                                        {(() => {
                                            const shipping = estimateShippingCost();
                                            const isFreeSLShipping = shipping.totalCost === 0;
                                            return isFreeSLShipping ? (
                                                <p style={{ margin: 0, fontWeight: 600, color: 'var(--success)' }}>FREE</p>
                                            ) : (
                                                <p style={{ margin: 0, fontWeight: 600, color: '#f59e0b' }}>{formatPrice(shipping.totalCost / 100, selectedCurrencyCode)}</p>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'rgba(255,255,255,0.02)' }}>
                        <h3 style={{ marginBottom: '10px', fontSize: '0.95rem' }}>Apply coupon</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                            <input
                                type="text"
                                value={couponCodeInput}
                                onChange={(e) => {
                                    setCouponCodeInput(e.target.value);
                                    setCouponMessage('');
                                }}
                                placeholder="Enter coupon code"
                                style={{ width: '100%', padding: '9px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }}
                            />
                            <button
                                onClick={handleApplyCoupon}
                                style={{ background: 'var(--accent)', color: '#241804', border: 'none', borderRadius: '8px', padding: '9px 12px', fontWeight: 700 }}
                            >
                                Apply
                            </button>
                        </div>
                        {couponMessage && (
                            <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', color: couponMessage.startsWith('Coupon applied') ? 'var(--success)' : '#ef4444' }}>
                                {couponMessage}
                            </p>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                        <span>{formatPrice(totalAmount, selectedCurrencyCode)}</span>
                    </div>

                    {/* Dynamic Shipping Cost Display Based on Location */}
                    {(() => {
                        const shipping = estimateShippingCost();
                        const isFreeSLShipping = shippingDetails.district && shipping.totalCost === 0;
                        
                        return (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                    🚚 Shipping {shipping.district && `(${shipping.district})`}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {!shippingDetails.district ? (
                                        <span style={{ fontSize: '0.85rem', color: '#ef4444' }}>Select district above</span>
                                    ) : isFreeSLShipping ? (
                                        <>
                                            <span style={{ color: 'var(--success)', fontWeight: 600, textDecoration: 'line-through', textDecorationColor: 'rgba(34, 197, 94, 0.5)' }}>
                                                {formatPrice(shipping.baseCost / 100, selectedCurrencyCode)}
                                            </span>
                                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>FREE</span>
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ color: 'var(--text-secondary)', textDecoration: 'line-through', textDecorationColor: 'rgba(255,255,255,0.2)', fontSize: '0.9rem' }}>
                                                {formatPrice(shipping.baseCost / 100, selectedCurrencyCode)}
                                            </span>
                                            <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                                                {formatPrice(shipping.totalCost / 100, selectedCurrencyCode)}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {appliedCoupon && appliedCoupon.available && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: 'var(--success)' }}>Discount ({appliedCoupon.discount}%)</span>
                                <span style={{ fontSize: '0.75rem', background: 'rgba(56, 211, 159, 0.2)', color: 'var(--success)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                    {appliedCoupon.couponCode}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: 'var(--success)', fontWeight: 600 }}>-{formatPrice(discountAmount, selectedCurrencyCode)}</span>
                                <button 
                                    onClick={removeCoupon}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    )}

                    {userInfo?.referralUsed && !userInfo?.referralApplied && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center', padding: '12px', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '0.95rem' }}>🎉 Referral Bonus (10%)</span>
                                <span style={{ fontSize: '0.7rem', background: 'rgba(34, 197, 94, 0.3)', color: '#22c55e', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                    FIRST ORDER
                                </span>
                            </div>
                            <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '0.95rem' }}>Applied at checkout</span>
                        </div>
                    )}

                    {userInfo?.referralUsed && !userInfo?.referralApplied && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#22c55e', fontWeight: 600 }}>Referral Bonus (10%)</span>
                                <span style={{ fontSize: '0.75rem', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                    NEW USER
                                </span>
                            </div>
                            <span style={{ color: '#22c55e', fontWeight: 600 }}>Save 10% on first order</span>
                        </div>
                    )}

                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '20px 0' }}></div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.45rem', fontWeight: 700, marginBottom: '26px' }}>
                        <span>Total</span>
                        <span className="text-gradient">
                            {(() => {
                                const baseTotal = appliedCoupon && appliedCoupon.available ? finalTotal : totalAmount;
                                const shipping = estimateShippingCost();
                                // shipping.totalCost is in paise, convert to LKR by dividing by 100
                                const shippingInLKR = (shipping.totalCost || 0) / 100;
                                // If displaying in USD, convert; otherwise keep in LKR
                                const shippingInSelectedCurrency = selectedCurrencyCode === 'USD' ? shippingInLKR / 300 : shippingInLKR;
                                const totalWithShipping = baseTotal + shippingInSelectedCurrency;
                                return formatPrice(totalWithShipping, selectedCurrencyCode);
                            })()}
                        </span>
                    </div>

                    <div style={{ marginBottom: '24px', padding: '14px', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'rgba(255,255,255,0.02)' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>SHIPMENT DETAILS</h3>

                        <div style={{ display: 'grid', gap: '10px' }}>
                            <div>
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={shippingDetails.fullName}
                                    onChange={(e) => handleShippingChange('fullName', e.target.value)}
                                    style={{ 
                                        width: '100%', 
                                        padding: '10px', 
                                        background: 'var(--bg-secondary)', 
                                        border: fieldErrors.fullName ? '2px solid #ef4444' : '1px solid var(--border-color)', 
                                        borderRadius: '8px', 
                                        color: '#fff' 
                                    }}
                                />
                                {fieldErrors.fullName && (
                                    <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '5px 0 0 0' }}>⚠ {fieldErrors.fullName}</p>
                                )}
                            </div>
                            
                            <div>
                                <input
                                    type="text"
                                    placeholder="Phone Number"
                                    value={shippingDetails.phone}
                                    onChange={(e) => handleShippingChange('phone', e.target.value)}
                                    style={{ 
                                        width: '100%', 
                                        padding: '10px', 
                                        background: 'var(--bg-secondary)', 
                                        border: fieldErrors.phone ? '2px solid #ef4444' : '1px solid var(--border-color)', 
                                        borderRadius: '8px', 
                                        color: '#fff' 
                                    }}
                                />
                                {fieldErrors.phone && (
                                    <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '5px 0 0 0' }}>⚠ {fieldErrors.phone}</p>
                                )}
                            </div>
                            
                            <div>
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={shippingDetails.email}
                                    onChange={(e) => handleShippingChange('email', e.target.value)}
                                    style={{ 
                                        width: '100%', 
                                        padding: '10px', 
                                        background: 'var(--bg-secondary)', 
                                        border: fieldErrors.email ? '2px solid #ef4444' : '1px solid var(--border-color)', 
                                        borderRadius: '8px', 
                                        color: '#fff' 
                                    }}
                                />
                                {fieldErrors.email && (
                                    <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '5px 0 0 0' }}>⚠ {fieldErrors.email}</p>
                                )}
                            </div>
                            
                            <div>
                                <input
                                    type="text"
                                    placeholder="Address Line 1"
                                    value={shippingDetails.addressLine1}
                                    onChange={(e) => handleShippingChange('addressLine1', e.target.value)}
                                    style={{ 
                                        width: '100%', 
                                        padding: '10px', 
                                        background: 'var(--bg-secondary)', 
                                        border: fieldErrors.addressLine1 ? '2px solid #ef4444' : '1px solid var(--border-color)', 
                                        borderRadius: '8px', 
                                        color: '#fff' 
                                    }}
                                />
                                {fieldErrors.addressLine1 && (
                                    <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '5px 0 0 0' }}>⚠ {fieldErrors.addressLine1}</p>
                                )}
                            </div>
                            
                            {/* District Selector with Location Intelligence */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
                                    📍 Select District (Shipping Zone)
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={shippingDetails.district}
                                        onChange={(e) => handleDistrictSelect(SRI_LANKA_DISTRICTS.find(d => d.name === e.target.value))}
                                        style={{ 
                                            width: '100%', 
                                            padding: '10px', 
                                            background: 'var(--bg-secondary)', 
                                            border: fieldErrors.district ? '2px solid #ef4444' : '1px solid var(--border-color)', 
                                            borderRadius: '8px', 
                                            color: '#fff',
                                            cursor: 'pointer',
                                            fontSize: '0.95rem'
                                        }}
                                    >
                                        <option value="">-- Select Your District --</option>
                                        {SRI_LANKA_DISTRICTS.map((district) => (
                                            <option key={district.id} value={district.name}>
                                                {district.emoji} {district.name} ({district.zone})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                {/* District Info Card with Shipping Details */}
                                {selectedDistrict && showDistrictInfo && (
                                    <div style={{ 
                                        marginTop: '12px', 
                                        padding: '12px', 
                                        background: 'rgba(107, 70, 193, 0.1)', 
                                        border: '1px solid rgba(107, 70, 193, 0.3)',
                                        borderRadius: '8px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '1.5rem' }}>{selectedDistrict.emoji}</span>
                                            <div>
                                                <p style={{ margin: '0 0 2px 0', fontWeight: 600, fontSize: '0.95rem' }}>{selectedDistrict.name}</p>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedDistrict.zone}</p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                                            <div>
                                                <p style={{ margin: '0 0 2px 0', color: 'var(--text-secondary)' }}>📏 Distance:</p>
                                                <p style={{ margin: 0, fontWeight: 600 }}>{selectedDistrict.distance} km</p>
                                            </div>
                                            <div>
                                                <p style={{ margin: '0 0 2px 0', color: 'var(--text-secondary)' }}>🚚 Est. Delivery:</p>
                                                <p style={{ margin: 0, fontWeight: 600 }}>{selectedDistrict.deliveryDays}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {fieldErrors.district && (
                                    <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '5px 0 0 0' }}>⚠ {fieldErrors.district}</p>
                                )}
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Postal Code"
                                        value={shippingDetails.postalCode}
                                        onChange={(e) => handleShippingChange('postalCode', e.target.value)}
                                        style={{ 
                                            width: '100%', 
                                            padding: '10px', 
                                            background: 'var(--bg-secondary)', 
                                            border: fieldErrors.postalCode ? '2px solid #ef4444' : '1px solid var(--border-color)', 
                                            borderRadius: '8px', 
                                            color: '#fff' 
                                        }}
                                    />
                                    {fieldErrors.postalCode && (
                                        <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '5px 0 0 0' }}>⚠ {fieldErrors.postalCode}</p>
                                    )}
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Country"
                                        value={shippingDetails.country}
                                        onChange={(e) => handleShippingChange('country', e.target.value)}
                                        style={{ 
                                            width: '100%', 
                                            padding: '10px', 
                                            background: 'var(--bg-secondary)', 
                                            border: fieldErrors.country ? '2px solid #ef4444' : '1px solid var(--border-color)', 
                                            borderRadius: '8px', 
                                            color: '#fff' 
                                        }}
                                    />
                                    {fieldErrors.country && (
                                        <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '5px 0 0 0' }}>⚠ {fieldErrors.country}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {shippingError && (
                        <div style={{ 
                            padding: '12px 14px', 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            border: '1px solid #ef4444', 
                            borderRadius: '8px',
                            color: '#ef4444', 
                            fontSize: '0.9rem',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px'
                        }}>
                            <span style={{ fontWeight: 700, marginTop: '2px' }}>✕</span>
                            <div>
                                <p style={{ margin: 0, fontWeight: 600 }}>Validation Error</p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>{shippingError}</p>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleCheckout}
                        className="btn-primary"
                        style={{ width: '100%', padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'PROCESSING...' : (
                            <>
                                <CreditCard size={20} /> SECURE CHECKOUT <ArrowRight size={20} />
                            </>
                        )}
                    </button>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '15px' }}>
                        30-day returns. Secure encrypted payments. Checkout reservations auto-expire in 15 minutes.
                    </p>

                    <button
                        onClick={() => navigate('/shop')}
                        style={{ marginTop: '10px', width: '100%', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '10px', padding: '11px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                    >
                        <RotateCcw size={16} /> Continue shopping
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Cart;
