import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { Package, Truck, CheckCircle, Clock, MapPin, Search, ChevronRight, AlertCircle, Calendar, Mail, Instagram, Phone, User, MessageSquare, Bell, X } from 'lucide-react';

const OrderTracking = () => {
    const { id } = useParams();
    const [orderId, setOrderId] = useState(id || '');
    const [trackingData, setTrackingData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchMode, setSearchMode] = useState(!id);
    const [agentFormData, setAgentFormData] = useState({
        agentName: '',
        agentId: '',
        contactNo: ''
    });
    const { userInfo } = useContext(AuthContext);
    const [feedback, setFeedback] = useState({ rating: 5, comment: '' });
    const [actionMessage, setActionMessage] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [lastRefreshTime, setLastRefreshTime] = useState(null);

    const statusSteps = [
        { label: 'Pending', icon: <Clock size={20} />, key: 'Pending' },
        { label: 'Order Confirmed', icon: <CheckCircle size={20} />, key: 'Order Confirmed' },
        { label: 'Processing', icon: <Package size={20} />, key: 'Processing' },
        { label: 'Shipped', icon: <Truck size={20} />, key: 'Shipped' },
        { label: 'In Transit', icon: <MapPin size={20} />, key: 'In Transit' },
        { label: 'Out for Delivery', icon: <Truck size={20} />, key: 'Out for Delivery' },
        { label: 'Delivered', icon: <CheckCircle size={20} />, key: 'Delivered' },
        { label: 'Failed', icon: <AlertCircle size={20} />, key: 'Failed' },
        { label: 'Returned', icon: <Package size={20} />, key: 'Returned' },
        { label: 'Cancelled', icon: <X size={20} />, key: 'Cancelled' }
    ];

    const getStatusIndex = (status) => {
        return statusSteps.findIndex(s => s.key === status);
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!orderId.trim()) return;

        setLoading(true);
        setError('');
        setTrackingData(null);

        try {
            // First try to get all orders and search locally
            const { data } = await api.get('/orders/myorders');
            const foundOrder = data.find(o => o.orderId === orderId || o._id === orderId);

            if (foundOrder) {
                console.log('Found order from /orders/myorders:', foundOrder);
                setTrackingData(foundOrder);
                setSearchMode(false);
            } else {
                setError('Order not found. Please check your Order ID and try again.');
            }
        } catch (err) {
            setError('Could not retrieve order details. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            setOrderId(id);
            handleSearch();
        }
    }, [id]);

    useEffect(() => {
        if (!trackingData?._id) return undefined;
        
        // Fetch fresh data immediately when order loads
        const freshFetch = async () => {
            try {
                const { data } = await api.get(`/orders/tracking/${trackingData._id}`);
                console.log('Fresh tracking data received:', data);
                console.log('Delivery Agent:', data.deliveryAgent);
                setTrackingData(data);
                setRefreshing(false);
            } catch (_error) {
                console.error('Error in fresh fetch:', _error);
                // keep current UI when polling fails
            }
        };
        
        // Initial fetch
        if (trackingData.status === 'Out for Delivery' || trackingData.status === 'In Transit') {
            freshFetch();
        }
        
        // Poll every 2 seconds for faster real-time updates
        const interval = setInterval(async () => {
            try {
                const { data } = await api.get(`/orders/tracking/${trackingData._id}`);
                console.log('Polling update:', { status: data.status, deliveryAgent: data.deliveryAgent });
                setTrackingData(data);
                setLastRefreshTime(new Date());
            } catch (_error) {
                console.error('Polling error:', _error);
                // keep current UI when polling fails
            }
        }, 2000);
        
        return () => clearInterval(interval);
    }, [trackingData?._id]);

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const daysUntilDelivery = (estimatedDate) => {
        if (!estimatedDate) return 'N/A';
        const now = new Date();
        const delivery = new Date(estimatedDate);
        const diff = Math.ceil((delivery - now) / (1000 * 60 * 60 * 24));
        return diff > 0 ? `${diff} days` : 'Delivered';
    };

    const refreshTrackingById = async (mongoId) => {
        if (!mongoId) return;
        setRefreshing(true);
        try {
            const { data } = await api.get(`/orders/tracking/${mongoId}`);
            setTrackingData(data);
            setLastRefreshTime(new Date());
        } catch (err) {
            console.error('Error refreshing tracking:', err);
        } finally {
            setRefreshing(false);
        }
    };

    const handleFeedbackSubmit = async () => {
        if (!trackingData?._id) return;
        try {
            const { data } = await api.post(`/orders/tracking/${trackingData._id}/feedback`, feedback);
            setActionMessage(data.message || 'Feedback submitted');
            await refreshTrackingById(trackingData._id);
        } catch (err) {
            setActionMessage(err.response?.data?.message || 'Feedback submission failed');
        }
    };

    return (
        <div className="container" style={{ padding: '60px 20px', minHeight: '100vh' }}>
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
            {/* Search Section */}
            {searchMode && (
                <div style={{ marginBottom: '60px' }}>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '15px', textAlign: 'center' }}>Track Your Order</h1>
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '40px' }}>
                        Enter your Order ID to get real-time delivery updates
                    </p>

                    <form onSubmit={handleSearch} style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                value={orderId}
                                onChange={(e) => setOrderId(e.target.value)}
                                placeholder="Enter Order ID (e.g., ORD-1234567-890)"
                                style={{
                                    flex: 1,
                                    padding: '15px 20px',
                                    background: 'var(--bg-secondary)',
                                    border: '2px solid var(--border-color)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    padding: '15px 30px',
                                    background: 'linear-gradient(135deg, #00ff88, var(--accent))',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#000',
                                    fontWeight: 700,
                                    cursor: loading ? 'wait' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Search size={20} /> Search
                            </button>
                        </div>
                    </form>

                    {error && (
                        <div style={{
                            marginTop: '20px',
                            padding: '15px 20px',
                            background: 'rgba(255, 50, 50, 0.1)',
                            border: '2px solid #ff3232',
                            borderRadius: '8px',
                            color: '#ff8080',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}

                    {loading && (
                        <div style={{ textAlign: 'center', marginTop: '30px' }}>
                            <div style={{
                                display: 'inline-block',
                                width: '40px',
                                height: '40px',
                                border: '4px solid var(--border-color)',
                                borderTop: '4px solid var(--accent)',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }}></div>
                            <p style={{ marginTop: '15px', color: 'var(--text-secondary)' }}>Searching for your order...</p>
                        </div>
                    )}
                </div>
            )}

            {/* Tracking Details */}
            {trackingData && (
                <div>
                    {/* Header */}
                    <div style={{ marginBottom: '40px' }}>
                        <button
                            onClick={() => setSearchMode(true)}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                color: 'var(--accent)',
                                padding: '8px 15px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                marginBottom: '20px',
                                fontSize: '0.9rem'
                            }}
                        >
                            ← Search Another Order
                        </button>

                        <div className="glass-card" style={{ padding: '25px', marginBottom: '30px' }}>
                            <h1 style={{ fontSize: '2rem', marginBottom: '20px' }}>Order: {trackingData.orderId}</h1>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                <div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '5px' }}>TRACKING NUMBER</p>
                                    <p style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace' }}>
                                        {trackingData.trackingNumber}
                                    </p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '5px' }}>CARRIER</p>
                                    <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{trackingData.carrier}</p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '5px' }}>STATUS</p>
                                    <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>
                                        {trackingData.status}
                                    </p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '5px' }}>ESTIMATED DELIVERY</p>
                                    <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                                        {daysUntilDelivery(trackingData.estimatedDelivery)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {actionMessage && (
                        <div style={{ marginBottom: '18px', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0, 242, 255, 0.08)' }}>
                            {actionMessage}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                        <div className="glass-card" style={{ padding: '16px' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '5px' }}>DELIVERY FEE</p>
                            <p style={{ fontWeight: 700, fontSize: '1.15rem' }}>${Number(trackingData.deliveryFee || 0).toFixed(2)}</p>
                        </div>
                        <div className="glass-card" style={{ padding: '16px' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '5px' }}>OTP VERIFIED</p>
                            <p style={{ fontWeight: 700, fontSize: '1.15rem', color: trackingData.deliveryOtpVerified ? 'var(--success)' : '#ffc832' }}>
                                {trackingData.deliveryOtpVerified ? 'YES' : 'PENDING'}
                            </p>
                        </div>
                        <div className="glass-card" style={{ padding: '16px' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '5px' }}>DELIVERY SLOT</p>
                            <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                {trackingData.deliveryTimeSlot?.date && trackingData.deliveryTimeSlot?.slot
                                    ? `${trackingData.deliveryTimeSlot.date} (${trackingData.deliveryTimeSlot.slot})`
                                    : 'Not scheduled'}
                            </p>
                        </div>
                    </div>



                    {/* Timeline */}
                    <div className="glass-card" style={{ padding: '30px', marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '30px' }}>Tracking Timeline</h2>

                        {/* Status Progress Bar */}
                        <div style={{ marginBottom: '40px' }}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                                {statusSteps.map((step, idx) => {
                                    const currentIdx = getStatusIndex(trackingData.status);
                                    const isCompleted = currentIdx >= 0 ? idx <= currentIdx : false;
                                    const isCurrent = idx === currentIdx;

                                    return (
                                        <div
                                            key={step.key}
                                            style={{
                                                flex: 1,
                                                height: '6px',
                                                background: isCompleted ? 'var(--accent)' : 'var(--border-color)',
                                                borderRadius: isCurrent ? '6px' : '3px',
                                                transition: 'all 0.3s'
                                            }}
                                        />
                                    );
                                })}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${statusSteps.length}, 1fr)`, gap: '10px' }}>
                                {statusSteps.map((step, idx) => {
                                    const currentIdx = getStatusIndex(trackingData.status);
                                    const isCompleted = currentIdx >= 0 ? idx <= currentIdx : false;

                                    return (
                                        <div key={step.key} style={{ textAlign: 'center' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                margin: '0 auto 10px',
                                                borderRadius: '50%',
                                                background: isCompleted ? 'var(--accent)' : 'var(--bg-secondary)',
                                                border: `2px solid ${isCompleted ? 'var(--accent)' : 'var(--border-color)'}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: isCompleted ? '#000' : 'var(--text-secondary)'
                                            }}>
                                                {step.icon}
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {step.label}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Detailed History */}
                        <div>
                            <h3 style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>UPDATES</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {trackingData.trackingHistory && trackingData.trackingHistory.map((event, idx) => {
                                    const currentIdx = getStatusIndex(trackingData.status);
                                    const eventIdx = statusSteps.findIndex(s => s.key === event.status);
                                    const isCompleted = eventIdx >= 0 && currentIdx >= 0 ? eventIdx <= currentIdx : true;

                                    return (
                                        <div key={idx} style={{ position: 'relative', paddingLeft: '40px' }}>
                                            {/* Timeline dot */}
                                            <div style={{
                                                position: 'absolute',
                                                left: 0,
                                                top: 0,
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                background: isCompleted ? 'var(--accent)' : 'var(--bg-secondary)',
                                                border: `2px solid ${isCompleted ? 'var(--accent)' : 'var(--border-color)'}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {isCompleted && <CheckCircle size={12} color="#000" />}
                                            </div>

                                            {/* Timeline line */}
                                            {idx !== trackingData.trackingHistory.length - 1 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    left: '10px',
                                                    top: '20px',
                                                    width: '2px',
                                                    height: '40px',
                                                    background: isCompleted ? 'var(--accent)' : 'var(--border-color)'
                                                }} />
                                            )}

                                            {/* Event details */}
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                                    <div>
                                                        <h4 style={{ margin: 0, marginBottom: '5px' }}>
                                                            {event.status}
                                                            {isCompleted && <span style={{ color: 'var(--success)' }}> ✓</span>}
                                                        </h4>
                                                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                            {event.description}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '15px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <Calendar size={14} />
                                                        {formatDate(event.timestamp)}
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <MapPin size={14} />
                                                        {event.location}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="glass-card" style={{ padding: '30px' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Order Items</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {trackingData.items.map((item, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '15px',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '8px'
                                }}>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 600 }}>{item.name}</p>
                                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            Quantity: {item.quantity}
                                        </p>
                                    </div>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>
                                        ${(item.price * item.quantity).toFixed(2)}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div style={{
                            marginTop: '20px',
                            paddingTop: '20px',
                            borderTop: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Total Amount:</p>
                            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>
                                ${(trackingData.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0).toFixed(2)}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '24px', marginBottom: '24px' }}>
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquare size={18} /> Customer feedback</h3>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                <select value={feedback.rating} onChange={(e) => setFeedback((p) => ({ ...p, rating: Number(e.target.value) }))} style={{ padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff' }}>
                                    <option value={5}>5 - Excellent</option>
                                    <option value={4}>4 - Good</option>
                                    <option value={3}>3 - Average</option>
                                    <option value={2}>2 - Poor</option>
                                    <option value={1}>1 - Bad</option>
                                </select>
                                <textarea value={feedback.comment} onChange={(e) => setFeedback((p) => ({ ...p, comment: e.target.value }))} rows={3} placeholder="Write your feedback" style={{ padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff' }} />
                                <button onClick={handleFeedbackSubmit} style={{ padding: '9px', borderRadius: '8px', border: 'none', background: '#7ed6ff', color: '#032536', fontWeight: 700 }}>
                                    Submit feedback
                                </button>
                            </div>
                            {trackingData.customerFeedback?.rating && (
                                <p style={{ marginTop: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                    Existing feedback: {trackingData.customerFeedback.rating}/5
                                </p>
                            )}
                        </div>

                        <div className="glass-card" style={{ padding: '20px' }}>
                            <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Bell size={18} /> Customer notifications (email/SMS simulated)</h3>
                            <div style={{ maxHeight: '210px', overflowY: 'auto', display: 'grid', gap: '8px' }}>
                                {(trackingData.notifications || []).length === 0 ? (
                                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No notifications yet.</p>
                                ) : (
                                    (trackingData.notifications || []).slice().reverse().map((note, idx) => (
                                        <div key={`note-${idx}`} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 10px' }}>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{String(note.channel || 'system').toUpperCase()} • {formatDate(note.createdAt)}</p>
                                            <p style={{ margin: '3px 0 0 0' }}>{note.message}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Delivery Agent Information / Form */}
                    {trackingData.status === 'Out for Delivery' && (
                        <div className="glass-card" style={{ padding: '25px', marginBottom: '30px', background: 'linear-gradient(135deg, rgba(0,242,255,0.08), rgba(0,255,136,0.08))', borderLeft: '4px solid var(--accent)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '1.2rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Truck size={24} color="var(--accent)" />
                                    Your Delivery Agent
                                </h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {/* Live Tracking Indicator */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#00ff88' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff88', animation: 'pulse 2s infinite' }}></span>
                                        <span>Live</span>
                                    </div>
                                    {/* Manual Refresh Button */}
                                    <button
                                        onClick={() => refreshTrackingById(trackingData._id)}
                                        disabled={refreshing}
                                        style={{
                                            padding: '8px 14px',
                                            background: 'var(--accent)',
                                            border: 'none',
                                            color: '#000',
                                            borderRadius: '6px',
                                            cursor: refreshing ? 'not-allowed' : 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            opacity: refreshing ? 0.6 : 1,
                                            transition: 'all 0.2s'
                                        }}
                                        title="Manually refresh delivery status"
                                    >
                                        {refreshing ? 'Refreshing...' : '🔄 Refresh'}
                                    </button>
                                </div>
                            </div>

                            {trackingData.deliveryAgent && trackingData.deliveryAgent._id ? (
                                // Display agent details if already assigned
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                    {console.log('Rendering delivery agent details:', trackingData.deliveryAgent)}
                                    {trackingData.deliveryAgent?.agentName && (
                                        <div>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '5px' }}>AGENT NAME</p>
                                            <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{trackingData.deliveryAgent.agentName}</p>
                                        </div>
                                    )}
                                    {trackingData.deliveryAgent?.agentId && (
                                        <div>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '5px' }}>AGENT ID</p>
                                            <p style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace' }}>{trackingData.deliveryAgent.agentId}</p>
                                        </div>
                                    )}
                                    {trackingData.deliveryAgent?.contactNo && (
                                        <div>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '5px' }}>CONTACT NUMBER</p>
                                            <p style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Phone size={18} />
                                                <a href={`tel:${trackingData.deliveryAgent.contactNo}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                                                    {trackingData.deliveryAgent.contactNo}
                                                </a>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Show message if agent not yet assigned
                                <div style={{
                                    padding: '20px',
                                    background: 'rgba(255,200,50,0.1)',
                                    border: '1px solid rgba(255,200,50,0.3)',
                                    borderRadius: '8px',
                                    color: '#ffc832'
                                }}>
                                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffc832', animation: 'pulse 1.5s infinite' }}></span>
                                        Your order is out for delivery!
                                    </p>
                                    <p style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                                        Delivery agent is being assigned. The contact details will appear here automatically in real-time. Updates are refreshed every 2 seconds.
                                    </p>
                                    {/* DEBUG: Show delivery agent state */}
                                    <div style={{ marginTop: '12px', fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                                        <p style={{ margin: '0 0 4px 0' }}>Debug: deliveryAgent = {JSON.stringify(trackingData.deliveryAgent)}</p>
                                        <p style={{ margin: 0 }}>Status: {trackingData.status}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Display existing agent info for other statuses */}
                    {trackingData.status !== 'Out for Delivery' && trackingData.deliveryAgent && trackingData.deliveryAgent._id && (
                        <div className="glass-card" style={{ padding: '25px', marginBottom: '30px', background: 'linear-gradient(135deg, rgba(0,242,255,0.08), rgba(0,255,136,0.08))', borderLeft: '4px solid var(--accent)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '1.2rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <User size={24} color="var(--accent)" />
                                    Delivery Agent
                                </h2>
                                <button
                                    onClick={() => refreshTrackingById(trackingData._id)}
                                    disabled={refreshing}
                                    style={{
                                        padding: '8px 14px',
                                        background: 'var(--accent)',
                                        border: 'none',
                                        color: '#000',
                                        borderRadius: '6px',
                                        cursor: refreshing ? 'not-allowed' : 'pointer',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        opacity: refreshing ? 0.6 : 1,
                                        transition: 'all 0.2s'
                                    }}
                                    title="Manually refresh delivery status"
                                >
                                    {refreshing ? 'Refreshing...' : '🔄 Refresh'}
                                </button>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                {trackingData.deliveryAgent?.agentName && (
                                    <div>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '5px' }}>AGENT NAME</p>
                                        <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{trackingData.deliveryAgent.agentName}</p>
                                    </div>
                                )}
                                {trackingData.deliveryAgent?.agentId && (
                                    <div>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '5px' }}>AGENT ID</p>
                                        <p style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace' }}>{trackingData.deliveryAgent.agentId}</p>
                                    </div>
                                )}
                                {trackingData.deliveryAgent?.contactNo && (
                                    <div>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '5px' }}>CONTACT NUMBER</p>
                                        <p style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Phone size={18} />
                                            <a href={`tel:${trackingData.deliveryAgent.contactNo}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                                                {trackingData.deliveryAgent.contactNo}
                                            </a>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* No Results */}
            {!trackingData && !searchMode && !loading && (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <AlertCircle size={48} style={{ margin: '0 auto 20px', color: 'var(--text-secondary)' }} />
                    <h2>No Order Found</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                        Enter a valid Order ID to track your shipment
                    </p>
                    <button
                        onClick={() => setSearchMode(true)}
                        className="btn-primary"
                    >
                        Search Order
                    </button>
                </div>
            )}

            <footer style={{ marginTop: '80px', borderTop: '1px solid var(--border-color)', background: 'linear-gradient(180deg, #1f1f21, #161618)', borderRadius: '14px', padding: '32px 20px 20px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '28px', marginBottom: '26px' }}>
                    <div>
                        <h3 style={{ marginBottom: '12px', fontSize: '2rem', letterSpacing: '1px' }}>MENU</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Link to="/" style={{ color: '#f2f2f2', textDecoration: 'none', fontWeight: 600 }}>Home</Link>
                            <Link to="/shop" style={{ color: '#f2f2f2', textDecoration: 'none', fontWeight: 600 }}>Shop</Link>
                        </div>
                    </div>

                    <div>
                        <h3 style={{ marginBottom: '12px', fontSize: '2rem', letterSpacing: '1px' }}>SUPPORT</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Link to="/order-tracking" style={{ color: '#f2f2f2', textDecoration: 'none', fontWeight: 600 }}>Delivery</Link>
                            <Link to="/order-tracking" style={{ color: '#f2f2f2', textDecoration: 'none', fontWeight: 600 }}>Orders</Link>
                            <Link to="/make-return" style={{ color: '#f2f2f2', textDecoration: 'none', fontWeight: 600 }}>Make A Return</Link>
                            <Link to="/returns" style={{ color: '#f2f2f2', textDecoration: 'none', fontWeight: 600 }}>Returns</Link>
                            <Link to="/submit-request" style={{ color: '#f2f2f2', textDecoration: 'none', fontWeight: 600 }}>Submit A Request</Link>
                        </div>
                    </div>

                    <div>
                        <h3 style={{ marginBottom: '12px', fontSize: '2rem', letterSpacing: '1px' }}>MY ACCOUNT</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Link to="/login" style={{ color: '#f2f2f2', textDecoration: 'none', fontWeight: 600 }}>Login</Link>
                            <Link to="/register" style={{ color: '#f2f2f2', textDecoration: 'none', fontWeight: 600 }}>Register</Link>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button onClick={() => alert('Email signup feature coming soon!')} style={{ borderRadius: '999px', background: '#f0f0f0', color: '#151515', border: 'none', fontWeight: 700, padding: '12px 16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' }}>
                            <Mail size={20} /> EMAIL SIGN UP
                        </button>
                        <Link to="/order-tracking" style={{ borderRadius: '999px', background: '#f0f0f0', color: '#151515', textDecoration: 'none', fontWeight: 700, padding: '12px 16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                            <MapPin size={20} /> TRACK YOUR ORDER
                        </Link>
                    </div>
                </div>

                <div style={{ marginBottom: '16px', border: '1px solid #3a3a3a', borderRadius: '10px', padding: '10px 12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {['VISA', 'MASTERCARD', 'DISCOVER', 'AMEX', 'JCB', 'UNIONPAY', 'KOKO'].map((pay) => (
                        <span key={pay} style={{ border: '1px solid #5a5a5a', borderRadius: '7px', color: '#e9e9e9', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {pay}
                        </span>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <p style={{ color: '#d9d9d9', margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                        © 2026 | AUREX | All Rights Reserved.
                    </p>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <button onClick={() => alert('Contact Information page coming soon!')} style={{ background: 'transparent', border: 'none', color: '#f2f2f2', textDecoration: 'none', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Contact Information</button>
                        <button onClick={() => alert('Refund Policy page coming soon!')} style={{ background: 'transparent', border: 'none', color: '#f2f2f2', textDecoration: 'none', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Refund Policy</button>
                        <button onClick={() => alert('Shipping Policy page coming soon!')} style={{ background: 'transparent', border: 'none', color: '#f2f2f2', textDecoration: 'none', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Shipping Policy</button>
                        <button onClick={() => alert('Terms of Service page coming soon!')} style={{ background: 'transparent', border: 'none', color: '#f2f2f2', textDecoration: 'none', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Terms of Service</button>
                    </div>
                    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{ width: '46px', height: '46px', borderRadius: '999px', border: '1px solid #555', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#f5f5f5' }}>
                        <Instagram size={20} />
                    </a>
                </div>
            </footer>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default OrderTracking;
