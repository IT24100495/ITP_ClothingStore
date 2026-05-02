import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { CreditCard, Landmark, Check, ChevronRight, Lock, ShieldCheck, AlertCircle, Upload, Trash2, Eye, Copy, X, Search, Filter } from 'lucide-react';
import confetti from 'canvas-confetti';
import io from 'socket.io-client';

const amounts = [25, 50, 100, 150, 250, 500];
const voucherTemplates = [
    {
        id: 'aurora',
        name: 'Aurora Glow',
        image: '/gift-vouchers/voucher-aurora.svg'
    },
    {
        id: 'sunset',
        name: 'Sunset Pop',
        image: '/gift-vouchers/voucher-sunset.svg'
    },
    {
        id: 'noir',
        name: 'Noir Signature',
        image: '/gift-vouchers/voucher-noir.svg'
    }
];

const Gift = () => {
    const navigate = useNavigate();
    const { userInfo } = useContext(AuthContext);

    // Gift card form state
    const [type, setType] = useState('e-gift');
    const [amount, setAmount] = useState(50);
    const [recipientName, setRecipientName] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [senderName, setSenderName] = useState('');
    const [message, setMessage] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [shippingAddress, setShippingAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [giftCards, setGiftCards] = useState([]);
    const [selectedVoucher, setSelectedVoucher] = useState(voucherTemplates[0]);

    // Payment state
    const [showPayment, setShowPayment] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('Card');
    const [cardData, setCardData] = useState({ number: '', name: '', expiry: '', cvv: '' });
    const [bankStatement, setBankStatement] = useState(null);
    const [bankStatementError, setBankStatementError] = useState('');
    const [paymentError, setPaymentError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [createdGiftCard, setCreatedGiftCard] = useState(null);
    const [showSuccessBanner, setShowSuccessBanner] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState({ show: false, cardId: null, cardAmount: 0 });

    // Gift card enhancements - Preview, Filter, Copy
    const [showVoucherPreview, setShowVoucherPreview] = useState(false);
    const [previewVoucher, setPreviewVoucher] = useState(null);
    const [searchGiftCards, setSearchGiftCards] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [copiedCodeId, setCopiedCodeId] = useState(null);

    useEffect(() => {
        if (!userInfo) {
            navigate('/login', { state: { from: '/gift' } });
            return;
        }

        const fetchHistory = async () => {
            try {
                const { data } = await api.get('/gift-cards/my');
                setGiftCards(Array.isArray(data) ? data : []);
                setHistoryLoading(false);
            } catch (error) {
                console.error('Error fetching gift card history:', error);
                setHistoryLoading(false);
            }
        };

        // Initial fetch
        fetchHistory();

        // Set up Socket.IO for real-time updates - suppress all warnings
        let socket = null;
        try {
            const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
            const socketBaseUrl = String(apiBaseUrl).replace(/\/api\/?$/, '');
            socket = io(socketBaseUrl, {
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 2,
                transports: ['websocket', 'polling'],
                closeOnBeforeunload: true,
                upgrade: false
            });

            socket.on('connect', () => {
                // Silent success
            });

            socket.on('connect_error', () => {
                // Silently suppress - app works fine without WebSocket
            });

            socket.on('error', () => {
                // Silently suppress
            });

            socket.on('disconnect', (reason) => {
                if (reason === 'io server disconnect') {
                    socket.connect();
                }
            });

            socket.on('giftcard:created', (newGiftCard) => {
                if (!newGiftCard || String(newGiftCard.purchaser) !== String(userInfo?._id)) {
                    return;
                }

                setGiftCards((prevCards) => {
                    const exists = prevCards.some((card) => String(card._id) === String(newGiftCard._id));
                    return exists ? prevCards : [newGiftCard, ...prevCards];
                });
            });
        } catch (error) {
            // Silently fail - Socket.IO is optional for core functionality
        }

        // Refresh list periodically as backup
        const refreshInterval = setInterval(() => {
            fetchHistory();
        }, 10000); // Refresh every 10 seconds

        return () => {
            if (socket) socket.disconnect();
            clearInterval(refreshInterval);
        };
    }, [userInfo, navigate]);

    const canSubmit = useMemo(() => {
        if (type === 'e-gift') {
            return recipientEmail.trim().includes('@');
        }
        return shippingAddress.trim().length > 5;
    }, [type, recipientEmail, shippingAddress]);

    // Filter gift cards by search and type
    const filteredGiftCards = useMemo(() => {
        return giftCards.filter(card => {
            const matchesSearch = (card.code ? card.code.toLowerCase().includes(searchGiftCards.toLowerCase()) : false) || 
                                String(card.amount).includes(searchGiftCards) ||
                                (card.recipientEmail || '').toLowerCase().includes(searchGiftCards.toLowerCase());
            const matchesType = filterType === 'all' || card.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [giftCards, searchGiftCards, filterType]);

    // Copy gift card code to clipboard
    const handleCopyCode = (code, cardId) => {
        navigator.clipboard.writeText(code).then(() => {
            setCopiedCodeId(cardId);
            setTimeout(() => setCopiedCodeId(null), 2000);
        });
    };

    // Open voucher template preview modal
    const handleVoucherPreview = (voucher) => {
        setPreviewVoucher(voucher);
        setShowVoucherPreview(true);
    };

    const handlePurchase = async (e) => {
        if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }

        if (!canSubmit) {
            alert(type === 'e-gift' ? 'Please provide a valid recipient email.' : 'Please provide a shipping address.');
            return;
        }

        setPaymentError('');
        setShowPayment(true);
    };

    const formatExpiryInput = (value) => {
        const digits = value.replace(/\D/g, '').slice(0, 4);
        if (digits.length <= 2) return digits;
        return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) {
            setBankStatement(null);
            setBankStatementError('');
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        const maxSize = 5 * 1024 * 1024;

        if (!allowedTypes.includes(file.type)) {
            setBankStatementError('Invalid file type. Only JPEG, PNG, and PDF allowed.');
            setBankStatement(null);
            return;
        }

        if (file.size > maxSize) {
            setBankStatementError('File size exceeds 5MB limit.');
            setBankStatement(null);
            return;
        }

        setBankStatement(file);
        setBankStatementError('');
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        console.log('=== PAYMENT STARTED ===');
        setPaymentError('');

        if (paymentMethod === 'BankTransfer' && !bankStatement) {
            setBankStatementError('Please upload bank statement to proceed.');
            setPaymentError('Please upload bank statement to proceed.');
            return;
        }

        if (paymentMethod === 'Card') {
            if (!cardData.name || !cardData.number || !cardData.expiry || !cardData.cvv) {
                setPaymentError('Please fill in all card details.');
                return;
            }
            if (!/^\d{4} \d{4} \d{4} \d{4}$/.test(cardData.number)) {
                setPaymentError('Card number must be 16 digits.');
                return;
            }
            const expiryMatch = cardData.expiry.match(/^(\d{2})\/(\d{2})$/);
            if (!expiryMatch) {
                setPaymentError('Expiry must be MM/YY.');
                return;
            }
            const month = Number(expiryMatch[1]);
            if (month < 1 || month > 12) {
                setPaymentError('Expiry month must be between 01 and 12.');
                return;
            }
            if (!/^\d{3}$/.test(cardData.cvv)) {
                setPaymentError('CVV must be 3 digits.');
                return;
            }
        }

        setIsProcessing(true);

        setTimeout(async () => {
            console.log('=== PAYMENT PROCESSING ===');
            try {
                const giftCardDetails = {
                    type,
                    amount,
                    recipientName,
                    recipientEmail,
                    senderName,
                    message,
                    deliveryDate,
                    shippingAddress,
                    voucherTemplate: {
                        id: selectedVoucher.id,
                        name: selectedVoucher.name,
                        image: selectedVoucher.image
                    }
                };

                const payload = {
                    items: [],
                    totalAmount: amount,
                    paymentMethod,
                    giftCardPurchase: giftCardDetails
                };

                console.log('Sending payment payload:', payload);

                let response;
                if (paymentMethod === 'BankTransfer' && bankStatement) {
                    const formData = new FormData();
                    formData.append('items', JSON.stringify(payload.items));
                    formData.append('totalAmount', payload.totalAmount);
                    formData.append('paymentMethod', payload.paymentMethod);
                    formData.append('giftCardPurchase', JSON.stringify(payload.giftCardPurchase));
                    formData.append('bankStatement', bankStatement);
                    console.log('Sending with FormData (Bank Transfer)');
                    response = await api.post('/orders', formData);
                } else {
                    console.log('Sending with JSON (Card Payment)');
                    response = await api.post('/orders', payload);
                }

                console.log('API Response received:', response);
                const orderData = response.data;
                console.log('=== ORDER SUCCESS ===');
                console.log('Order created successfully:', orderData);
                
                // Extract gift card data with fallbacks
                const giftCardCode = orderData?.giftCardCreated?.code || 
                                    (typeof orderData?.code === 'string' ? orderData.code : '') ||
                                    'GC-' + Date.now();
                                    
                const giftCardAmount = orderData?.giftCardCreated?.amount || 
                                      orderData?.amount ||
                                      amount;
                                      
                const giftCardType = orderData?.giftCardCreated?.type || 
                                    orderData?.type ||
                                    type;
                
                console.log('Extracted gift card:', { code: giftCardCode, amount: giftCardAmount, type: giftCardType });
                
                // Set the created gift card state
                setCreatedGiftCard({
                    code: giftCardCode,
                    amount: giftCardAmount,
                    type: giftCardType
                });
                
                // Show success banner and modal
                setShowSuccessBanner(true);
                setShowSuccessModal(true);
                
                // IMMEDIATE ALERT - Show success right away
                alert(`✓ PAYMENT SUCCESSFUL!\n\nYour gift card code:\n\n${giftCardCode}\n\nAmount: $${giftCardAmount}\nType: ${giftCardType}`);

                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#f4ad36', '#fff4dd', '#acc7ea']
                });

                // Refresh gift cards list
                try {
                    const { data: updatedCards } = await api.get('/gift-cards/my');
                    setGiftCards(Array.isArray(updatedCards) ? updatedCards : []);
                } catch (refreshError) {
                    console.warn('Could not refresh gift cards:', refreshError.message);
                }

                // Keep payment section visible to show success
                setIsProcessing(false);
            } catch (error) {
                console.error('🔴 PAYMENT ERROR 🔴');
                console.error('Error object:', error);
                console.error('Error response:', error.response);
                console.error('Error message:', error.message);
                let errorMessage = 'Payment failed. Please try again.';
                
                if (error.response) {
                    if (error.response.data && error.response.data.message) {
                        errorMessage = String(error.response.data.message);
                    } else if (error.response.status) {
                        errorMessage = `Payment failed (Error ${error.response.status}). Please try again.`;
                    }
                } else if (error.message) {
                    errorMessage = String(error.message);
                }
                
                alert(`Payment failed:\n\n${errorMessage}`);
                setPaymentError(errorMessage);
                setIsProcessing(false);
            }
        }, 2000);
    };

    // Delete gift card handler
    const handleDeleteGiftCard = async (cardId, cardAmount) => {
        // Show custom confirmation modal
        setDeleteConfirmModal({ show: true, cardId, cardAmount });
    };

    // Confirm deletion
    const confirmDelete = async () => {
        const { cardId } = deleteConfirmModal;
        if (!cardId) return;

        try {
            await api.delete(`/gift-cards/${cardId}`);
            // Remove from state
            setGiftCards(giftCards.filter(card => card._id !== cardId));
            setDeleteConfirmModal({ show: false, cardId: null, cardAmount: 0 });
            alert('✓ Gift card deleted successfully.');
        } catch (error) {
            console.error('Error deleting gift card:', error);
            alert(`Failed to delete gift card: ${error.response?.data?.message || error.message}`);
            setDeleteConfirmModal({ show: false, cardId: null, cardAmount: 0 });
        }
    };

    // Cancel deletion
    const cancelDelete = () => {
        setDeleteConfirmModal({ show: false, cardId: null, cardAmount: 0 });
    };

    if (!userInfo) return null;

    return (
        <>
            {showSuccessModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    backdropFilter: 'blur(5px)'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                        border: '2px solid #00ff88',
                        borderRadius: '20px',
                        padding: '40px',
                        maxWidth: '500px',
                        width: '90%',
                        textAlign: 'center',
                        boxShadow: '0 20px 60px rgba(0, 255, 136, 0.3)',
                        animation: 'scaleIn 0.3s ease-out'
                    }}>
                        {/* Success Checkmark */}
                        <div style={{
                            width: '100px',
                            height: '100px',
                            background: 'linear-gradient(135deg, #00ff88, #00f2ff)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            boxShadow: '0 0 40px rgba(0, 255, 136, 0.6)'
                        }}>
                            <Check size={60} color="#000" strokeWidth={3} />
                        </div>

                        {/* Success Title */}
                        <h2 style={{
                            fontSize: '2rem',
                            fontWeight: 700,
                            color: '#00ff88',
                            margin: '0 0 12px 0',
                            letterSpacing: '1px'
                        }}>
                            PAYMENT SUCCESSFUL!
                        </h2>

                        {/* Payment Method Status */}
                        <p style={{
                            color: '#00f2ff',
                            fontSize: '1rem',
                            margin: '0 0 24px 0',
                            fontWeight: 600
                        }}>
                            {paymentMethod === 'Card' ? '✓ Card Payment Confirmed' : '✓ Bank Transfer Submitted for Verification'}
                        </p>

                        {/* Gift Card Code Section */}
                        <div style={{
                            background: 'rgba(0, 255, 136, 0.1)',
                            border: '2px solid rgba(0, 255, 136, 0.3)',
                            borderRadius: '12px',
                            padding: '20px',
                            marginBottom: '24px'
                        }}>
                            <p style={{
                                color: '#999',
                                fontSize: '0.85rem',
                                margin: '0 0 10px 0',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '2px'
                            }}>
                                Your Gift Card Code
                            </p>
                            <div style={{
                                background: 'rgba(0, 242, 255, 0.1)',
                                padding: '16px',
                                borderRadius: '8px',
                                border: '1px solid rgba(0, 242, 255, 0.3)',
                                marginBottom: '12px'
                            }}>
                                <p style={{
                                    fontFamily: 'monospace',
                                    fontSize: '1.6rem',
                                    color: '#00ff88',
                                    fontWeight: 700,
                                    letterSpacing: '4px',
                                    margin: 0,
                                    wordBreak: 'break-all'
                                }}>
                                    {createdGiftCard?.code}
                                </p>
                            </div>
                            
                            {/* Amount and Type */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '10px'
                            }}>
                                <div style={{
                                    background: 'rgba(0, 242, 255, 0.05)',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(0, 242, 255, 0.2)'
                                }}>
                                    <p style={{ color: '#999', fontSize: '0.8rem', margin: '0 0 4px 0' }}>Amount</p>
                                    <p style={{ color: '#00ff88', fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
                                        ${createdGiftCard?.amount}
                                    </p>
                                </div>
                                <div style={{
                                    background: 'rgba(0, 242, 255, 0.05)',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(0, 242, 255, 0.2)'
                                }}>
                                    <p style={{ color: '#999', fontSize: '0.8rem', margin: '0 0 4px 0' }}>Type</p>
                                    <p style={{ color: '#00f2ff', fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
                                        {createdGiftCard?.type === 'e-gift' ? 'E-Gift' : 'Physical'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Info Message */}
                        <div style={{
                            background: 'rgba(0, 255, 136, 0.08)',
                            border: '1px solid rgba(0, 255, 136, 0.2)',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '24px'
                        }}>
                            <p style={{
                                color: '#ccc',
                                fontSize: '0.9rem',
                                margin: 0,
                                lineHeight: '1.5'
                            }}>
                                {paymentMethod === 'Card' 
                                    ? '✓ Your gift card is ready to use immediately!' 
                                    : '⏳ Your gift card will be activated within 24 hours after verification.'}
                            </p>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={() => {
                                setShowSuccessModal(false);
                                setShowSuccessBanner(false);
                            }}
                            style={{
                                width: '100%',
                                padding: '14px 24px',
                                background: 'linear-gradient(135deg, #00ff88, #00f2ff)',
                                color: '#000',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 15px rgba(0, 255, 136, 0.3)'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 6px 20px rgba(0, 255, 136, 0.5)';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.3)';
                            }}
                        >
                            CONTINUE & VIEW PURCHASE
                        </button>
                    </div>
                    
                    <style>{`
                        @keyframes scaleIn {
                            from {
                                transform: scale(0.8);
                                opacity: 0;
                            }
                            to {
                                transform: scale(1);
                                opacity: 1;
                            }
                        }
                    `}</style>
                </div>
            )}
            {showSuccessBanner && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(135deg, #00ff88 0%, #00f2ff 100%)',
                    color: '#000',
                    padding: '20px',
                    textAlign: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    zIndex: 9999,
                    boxShadow: '0 4px 20px rgba(0, 255, 136, 0.5)'
                }}>
                    ✓ PAYMENT SUCCESSFUL! Your gift card is ready! Code: {createdGiftCard?.code}
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirmModal.show && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(5px)'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                        border: '2px solid #ef4444',
                        borderRadius: '16px',
                        padding: '32px',
                        maxWidth: '450px',
                        width: '90%',
                        textAlign: 'center',
                        boxShadow: '0 20px 60px rgba(239, 68, 68, 0.3)',
                        animation: 'scaleIn 0.3s ease-out'
                    }}>
                        {/* Delete Icon */}
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            border: '2px solid rgba(239, 68, 68, 0.5)'
                        }}>
                            <Trash2 size={40} color="#ef4444" strokeWidth={2} />
                        </div>

                        {/* Title */}
                        <h2 style={{
                            fontSize: '1.8rem',
                            fontWeight: 700,
                            color: '#ef4444',
                            margin: '0 0 8px 0',
                            letterSpacing: '0.5px'
                        }}>
                            Delete Gift Card?
                        </h2>

                        {/* Description */}
                        <p style={{
                            color: 'var(--text-secondary)',
                            fontSize: '1rem',
                            margin: '0 0 24px 0',
                            lineHeight: '1.6'
                        }}>
                            You're about to delete this {deleteConfirmModal.cardAmount && `$${deleteConfirmModal.cardAmount}`} gift card. This action cannot be undone.
                        </p>

                        {/* Warning Box */}
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '10px',
                            padding: '12px',
                            marginBottom: '24px',
                            fontSize: '0.85rem',
                            color: '#ffb0b0'
                        }}>
                            ⚠️ This action is permanent and cannot be reversed.
                        </div>

                        {/* Button Group */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <button
                                onClick={cancelDelete}
                                style={{
                                    padding: '12px 20px',
                                    background: 'var(--border-color)',
                                    color: 'var(--text-primary)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => {
                                    e.target.style.background = 'rgba(255,255,255,0.1)';
                                }}
                                onMouseOut={(e) => {
                                    e.target.style.background = 'var(--border-color)';
                                }}
                            >
                                Keep It
                            </button>
                            <button
                                onClick={confirmDelete}
                                style={{
                                    padding: '12px 20px',
                                    background: '#ef4444',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
                                }}
                                onMouseOver={(e) => {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.5)';
                                }}
                                onMouseOut={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)';
                                }}
                            >
                                Delete Forever
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="container" style={{ padding: '60px 0', marginTop: showSuccessBanner ? '60px' : '0' }}>
            <div className="glass-card" style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '2.2rem', marginBottom: '8px' }}>GIFT CARDS</h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Send an instant e-gift card by email or ship a physical gift card.
                </p>
            </div>

            <div className="glass-card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <h2>Gift Voucher Pictures</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>Choose a style for your gift moment.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 340px) 1fr', gap: '14px' }}>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {voucherTemplates.map((template) => (
                            <div key={template.id} style={{ position: 'relative' }}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedVoucher(template)}
                                    style={{
                                        textAlign: 'left',
                                        borderRadius: '12px',
                                        border: selectedVoucher.id === template.id ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                                        background: selectedVoucher.id === template.id ? 'rgba(0,242,255,0.08)' : 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        padding: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        width: '100%',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = selectedVoucher.id === template.id ? 'var(--accent)' : 'var(--border-color)'}
                                >
                                    <img
                                        src={template.image}
                                        alt={template.name}
                                        style={{ width: '76px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }}
                                    />
                                    <div>
                                        <p style={{ fontWeight: 700, margin: '0 0 2px 0' }}>{template.name}</p>
                                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                            Voucher style preview
                                        </p>
                                    </div>
                                </button>
                                {/* Preview Button */}
                                <button
                                    type="button"
                                    onClick={() => handleVoucherPreview(template)}
                                    style={{
                                        position: 'absolute',
                                        top: '8px',
                                        right: '8px',
                                        background: 'rgba(0, 242, 255, 0.2)',
                                        border: '1px solid rgba(0, 242, 255, 0.5)',
                                        borderRadius: '6px',
                                        padding: '6px 8px',
                                        color: '#00f2ff',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 242, 255, 0.3)'; e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.8)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 242, 255, 0.2)'; e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.5)'; }}
                                    title="Preview design"
                                >
                                    <Eye size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '14px', padding: '10px', background: 'var(--bg-secondary)' }}>
                        <img
                            src={selectedVoucher.image}
                            alt={selectedVoucher.name}
                            style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', display: 'block' }}
                        />
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 1fr', gap: '20px' }}>
                <div className="glass-card">
                    <h2 style={{ marginBottom: '12px' }}>Purchase Gift Card</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={() => setType('e-gift')}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '999px',
                                    border: '1px solid var(--border-color)',
                                    background: type === 'e-gift' ? 'var(--accent)' : 'transparent',
                                    color: type === 'e-gift' ? '#000' : 'var(--text-primary)',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                E-Gift Card
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('physical')}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '999px',
                                    border: '1px solid var(--border-color)',
                                    background: type === 'physical' ? 'var(--accent)' : 'transparent',
                                    color: type === 'physical' ? '#000' : 'var(--text-primary)',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Physical Gift Card
                            </button>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                Select Amount
                            </label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {amounts.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => setAmount(option)}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-color)',
                                            background: amount === option ? 'var(--accent)' : 'var(--bg-secondary)',
                                            color: amount === option ? '#000' : 'var(--text-primary)',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ${option}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <input
                            type="text"
                            placeholder="Recipient name (optional)"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff' }}
                        />

                        {type === 'e-gift' ? (
                            <input
                                type="email"
                                placeholder="Recipient email"
                                required
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff' }}
                            />
                        ) : (
                            <textarea
                                placeholder="Shipping address"
                                required
                                rows={3}
                                value={shippingAddress}
                                onChange={(e) => setShippingAddress(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff', resize: 'vertical' }}
                            />
                        )}

                        <input
                            type="text"
                            placeholder="Sender name (optional)"
                            value={senderName}
                            onChange={(e) => setSenderName(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff' }}
                        />

                        <textarea
                            placeholder="Personal message (optional)"
                            rows={3}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff', resize: 'vertical' }}
                        />

                        {type === 'e-gift' && (
                            <input
                                type="date"
                                value={deliveryDate}
                                onChange={(e) => setDeliveryDate(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff' }}
                            />
                        )}

                        <button
                            type="button"
                            onClick={handlePurchase}
                            className="btn-primary"
                            disabled={!canSubmit || showPayment}
                            style={{ padding: '12px', fontWeight: 700 }}
                        >
                            {showPayment ? 'Payment Active' : 'Continue to Payment'}
                        </button>

                        {showPayment && (
                            <div style={{ 
                                background: 'rgba(0, 242, 255, 0.08)', 
                                border: '2px solid var(--accent)', 
                                borderRadius: '12px', 
                                padding: '20px', 
                                marginTop: '20px' 
                            }}>
                                <h3 style={{ color: 'var(--accent)', marginBottom: '16px', marginTop: 0 }}>🔒 SECURE PAYMENT</h3>

                                {paymentError && (
                                    <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid #ff6b6b', borderRadius: '8px', padding: '12px', color: '#ffb0b0', display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                        <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <span>{paymentError}</span>
                                    </div>
                                )}

                                {isProcessing ? (
                                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                        <div style={{ width: '50px', height: '50px', border: '4px solid rgba(0,242,255,0.3)', borderTop: '4px solid var(--accent)', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }}></div>
                                        <p style={{ fontSize: '1rem', fontWeight: 700 }}>Processing Payment...</p>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '10px' }}>Please wait</p>
                                    </div>
                                ) : createdGiftCard ? (
                                    <div style={{ textAlign: 'center', padding: '30px 20px', animation: 'fadeIn 0.5s ease-in' }}>
                                        <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #00f2ff, #00ff88)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 30px rgba(0,242,255,0.4)' }}>
                                            <Check size={50} color="#000" strokeWidth={3} />
                                        </div>
                                        
                                        <div style={{ background: 'rgba(0, 255, 136, 0.15)', border: '2px solid rgba(0, 255, 136, 0.5)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                                            <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 8px 0', color: '#00ff88' }}>✓ PAYMENT SUCCESSFUL!</p>
                                            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
                                                {paymentMethod === 'Card' ? 'Card payment confirmed' : 'Bank transfer submitted for verification'}
                                            </p>
                                        </div>

                                        <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 20px 0' }}>🎁 GIFT CARD CREATED!</p>
                                        
                                        <div style={{ background: 'rgba(0,242,255,0.05)', border: '2px solid rgba(0,242,255,0.4)', borderRadius: '10px', padding: '18px', margin: '0 0 20px 0', color: 'var(--text-secondary)' }}>
                                            <p style={{ fontSize: '0.85rem', margin: '0 0 10px 0', fontWeight: 600, color: 'var(--text-secondary)' }}>YOUR GIFT CARD CODE</p>
                                            <div style={{ background: 'rgba(0,242,255,0.1)', borderRadius: '8px', padding: '16px', marginBottom: '12px', border: '1px solid rgba(0,242,255,0.3)' }}>
                                                <p style={{ fontFamily: 'monospace', fontSize: '1.4rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '4px', margin: 0 }}>
                                                    {createdGiftCard.code}
                                                </p>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
                                                <div style={{ padding: '10px', background: 'rgba(0,242,255,0.05)', borderRadius: '6px' }}>
                                                    <p style={{ margin: '0 0 4px 0', color: 'var(--text-secondary)' }}>Amount</p>
                                                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>${createdGiftCard.amount}</p>
                                                </div>
                                                <div style={{ padding: '10px', background: 'rgba(0,242,255,0.05)', borderRadius: '6px' }}>
                                                    <p style={{ margin: '0 0 4px 0', color: 'var(--text-secondary)' }}>Type</p>
                                                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                                                        {createdGiftCard.type === 'e-gift' ? 'E-Gift' : 'Physical'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.3)', borderRadius: '8px', padding: '14px', marginBottom: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                            <p style={{ margin: '0 0 8px 0', fontWeight: 700, color: '#00ff88' }}>✓ What happens next?</p>
                                            {paymentMethod === 'Card' ? (
                                                <p style={{ margin: 0 }}>Your gift card is ready to use immediately. Share the code with the recipient or we'll email it to them.</p>
                                            ) : (
                                                <p style={{ margin: 0 }}>Your bank transfer is being verified. Gift card will be activated within 24 hours.</p>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCreatedGiftCard(null);
                                                setIsProcessing(false);
                                                setCardData({ number: '', name: '', expiry: '', cvv: '' });
                                                setBankStatement(null);
                                                setBankStatementError('');
                                                setPaymentError('');
                                                setPaymentMethod('Card');
                                                // Reset gift card form
                                                setType('e-gift');
                                                setAmount(50);
                                                setRecipientName('');
                                                setRecipientEmail('');
                                                setSenderName('');
                                                setMessage('');
                                                setDeliveryDate('');
                                                setShippingAddress('');
                                                setShowPayment(false);
                                            }}
                                            className="btn-primary"
                                            style={{ marginTop: '20px', padding: '14px 28px', fontSize: '1rem', fontWeight: 700 }}
                                        >
                                            BUY ANOTHER GIFT CARD
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {/* Payment Method Selection */}
                                        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('Card')}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    borderRadius: '8px',
                                                    border: paymentMethod === 'Card' ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                                                    background: paymentMethod === 'Card' ? 'rgba(0,242,255,0.08)' : 'var(--bg-secondary)',
                                                    color: 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    fontSize: '0.9rem'
                                                }}
                                            >
                                                <CreditCard size={18} /> Card
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('BankTransfer')}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    borderRadius: '8px',
                                                    border: paymentMethod === 'BankTransfer' ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                                                    background: paymentMethod === 'BankTransfer' ? 'rgba(0,242,255,0.08)' : 'var(--bg-secondary)',
                                                    color: 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    fontSize: '0.9rem'
                                                }}
                                            >
                                                <Landmark size={18} /> Bank
                                            </button>
                                        </div>

                                        {paymentMethod === 'Card' ? (
                                            <>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CARDHOLDER NAME</label>
                                                    <input
                                                        type="text"
                                                        placeholder="John Doe"
                                                        value={cardData.name}
                                                        onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                                                        style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.9rem' }}
                                                    />
                                                </div>

                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CARD NUMBER</label>
                                                    <input
                                                        type="text"
                                                        placeholder="0000 0000 0000 0000"
                                                        value={cardData.number}
                                                        onChange={(e) => {
                                                            const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                                                            const formatted = digits.replace(/(\d{4})/g, '$1 ').trim();
                                                            setCardData({ ...cardData, number: formatted });
                                                        }}
                                                        style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.9rem', letterSpacing: '1px' }}
                                                    />
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                    <div>
                                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>EXPIRY</label>
                                                        <input
                                                            type="text"
                                                            placeholder="MM/YY"
                                                            value={cardData.expiry}
                                                            onChange={(e) => setCardData({ ...cardData, expiry: formatExpiryInput(e.target.value) })}
                                                            maxLength="5"
                                                            style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.9rem' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CVV</label>
                                                        <div style={{ position: 'relative' }}>
                                                            <input
                                                                type="password"
                                                                placeholder="***"
                                                                value={cardData.cvv}
                                                                onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                                                                maxLength="3"
                                                                style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.9rem' }}
                                                            />
                                                            <Lock size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.3)', borderRadius: '8px', padding: '12px', marginBottom: '10px', fontSize: '0.85rem' }}>
                                                    <p style={{ margin: '0 0 6px 0', fontWeight: 700 }}>AUREX Finance Bank</p>
                                                    <p style={{ margin: '0 0 4px 0', color: 'var(--text-secondary)' }}><strong>Account:</strong> 1234567890</p>
                                                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>Routing:</strong> AUREX001</p>
                                                </div>

                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>UPLOAD BANK STATEMENT</label>
                                                    <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '16px', textAlign: 'center', cursor: 'pointer', background: 'rgba(0,242,255,0.02)' }}>
                                                        <input
                                                            type="file"
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                            onChange={handleFileSelect}
                                                            style={{ display: 'none' }}
                                                            id="bank-statement-gift"
                                                        />
                                                        <label htmlFor="bank-statement-gift" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', margin: 0 }}>
                                                            <Upload size={22} color="var(--accent)" />
                                                            {bankStatement ? (
                                                                <div>
                                                                    <p style={{ margin: '0 0 2px 0', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 700 }}>✓ {bankStatement.name}</p>
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <p style={{ margin: '0 0 2px 0', fontSize: '0.85rem', fontWeight: 600 }}>Click to upload or drag</p>
                                                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PDF, JPG, PNG • Max 5MB</p>
                                                                </div>
                                                            )}
                                                        </label>
                                                    </div>
                                                    {bankStatementError && (
                                                        <p style={{ margin: '6px 0 0 0', color: '#ffb0b0', fontSize: '0.8rem' }}>
                                                            {bankStatementError}
                                                        </p>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        <button
                                            type="button"
                                            onClick={handlePayment}
                                            className="btn-primary"
                                            style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}
                                        >
                                            PAY ${amount} <ChevronRight size={18} />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setShowPayment(false)}
                                            className="btn-outline"
                                            style={{ padding: '10px' }}
                                        >
                                            Cancel Payment
                                        </button>

                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <ShieldCheck size={14} /> SSL SECURED
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Lock size={14} /> ENCRYPTED
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ marginBottom: 0 }}>My Gift Card Purchases</h2>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {filteredGiftCards.length} of {giftCards.length}
                        </span>
                    </div>

                    {giftCards.length > 0 && (
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                                <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                                <input
                                    type="text"
                                    placeholder="Search by code, amount, or recipient..."
                                    value={searchGiftCards}
                                    onChange={(e) => setSearchGiftCards(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 8px 8px 36px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.9rem'
                                    }}
                                />
                            </div>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                style={{
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="all">All Types</option>
                                <option value="e-gift">E-Gift Cards</option>
                                <option value="physical">Physical Cards</option>
                            </select>
                        </div>
                    )}

                    {historyLoading ? (
                        <p style={{ color: 'var(--text-secondary)' }}>Loading gift card history...</p>
                    ) : filteredGiftCards.length === 0 && giftCards.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>No gift card purchases yet.</p>
                    ) : filteredGiftCards.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>No gift cards match your search.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredGiftCards.map((card) => (
                                <div key={card._id} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px', background: 'var(--bg-secondary)', position: 'relative' }}>
                                    {/* Delete Button */}
                                    <button
                                        onClick={() => handleDeleteGiftCard(card._id, card.amount)}
                                        style={{
                                            position: 'absolute',
                                            top: '12px',
                                            right: '12px',
                                            background: 'rgba(239, 68, 68, 0.2)',
                                            border: '1px solid rgba(239, 68, 68, 0.5)',
                                            borderRadius: '8px',
                                            padding: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s ease',
                                            color: '#ef4444'
                                        }}
                                        onMouseOver={(e) => {
                                            e.target.style.background = 'rgba(239, 68, 68, 0.3)';
                                            e.target.style.borderColor = 'rgba(239, 68, 68, 0.8)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                                            e.target.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                                        }}
                                        title="Delete gift card"
                                    >
                                        <Trash2 size={18} />
                                    </button>

                                    {card.voucherTemplate?.image && (
                                        <img
                                            src={card.voucherTemplate.image}
                                            alt={card.voucherTemplate?.name || 'Voucher template'}
                                            style={{ width: '100%', maxWidth: '260px', borderRadius: '10px', marginBottom: '10px', border: '1px solid rgba(255,255,255,0.2)' }}
                                        />
                                    )}
                                    <div style={{ marginBottom: '8px' }}>
                                        <p style={{ margin: '0 0 4px 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {card.type === 'e-gift' ? 'E-Gift Card' : 'Physical Gift Card'} - ${Number(card.amount || 0).toFixed(2)}
                                            {card.emailDeliveryStatus === 'sent' && <Check size={16} style={{ color: '#22c55e' }} />}
                                        </p>
                                        {card.voucherTemplate?.name && (
                                            <p style={{ margin: '0 0 4px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                Design: {card.voucherTemplate.name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Code with Copy Button */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                                        <code style={{ flex: 1, fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--accent)' }}>
                                            {card.code}
                                        </code>
                                        <button
                                            onClick={() => handleCopyCode(card.code, card._id)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: copiedCodeId === card._id ? '#22c55e' : 'var(--accent)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                padding: '4px 8px',
                                                transition: 'color 0.2s ease'
                                            }}
                                            title={copiedCodeId === card._id ? 'Copied!' : 'Copy code'}
                                        >
                                            <Copy size={14} />
                                            {copiedCodeId === card._id ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>

                                    {card.payment?.status && (
                                        <p style={{ margin: '0 0 4px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            Payment: {card.payment.method || 'Card'} • <span style={{ color: '#22c55e', fontWeight: 600 }}>{card.payment.status}</span>
                                        </p>
                                    )}
                                    {card.recipientEmail && (
                                        <p style={{ margin: '0 0 4px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            Recipient: {card.recipientEmail}
                                        </p>
                                    )}
                                    {card.shippingAddress && (
                                        <p style={{ margin: '0 0 4px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            Shipping: {card.shippingAddress}
                                        </p>
                                    )}
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                        Purchased: {new Date(card.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            </div>

            {/* Voucher Template Preview Modal */}
            {showVoucherPreview && previewVoucher && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 999,
                    backdropFilter: 'blur(4px)'
                }} onClick={() => setShowVoucherPreview(false)}>
                    <div style={{
                        background: 'var(--bg-primary)',
                        borderRadius: '16px',
                        padding: '30px',
                        maxWidth: '600px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        border: '1px solid var(--border-color)',
                        position: 'relative'
                    }} onClick={(e) => e.stopPropagation()}>
                        {/* Close Button */}
                        <button
                            onClick={() => setShowVoucherPreview(false)}
                            style={{
                                position: 'absolute',
                                top: '15px',
                                right: '15px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '1.5rem'
                            }}
                        >
                            <X size={24} />
                        </button>

                        <h2 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>{previewVoucher.name}</h2>
                        
                        {/* Large Voucher Preview */}
                        <img
                            src={previewVoucher.image}
                            alt={previewVoucher.name}
                            style={{
                                width: '100%',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                marginBottom: '20px'
                            }}
                        />

                        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                            <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                This design will be used for your gift card. It's a beautiful way to present your gift!
                            </p>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                ✓ Fully customizable with recipient name and personal message
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                setSelectedVoucher(previewVoucher);
                                setShowVoucherPreview(false);
                            }}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'var(--accent)',
                                color: '#2a1d06',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                        >
                            Select This Design
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default Gift;
