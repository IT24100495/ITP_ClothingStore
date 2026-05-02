import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { Bell, CheckCircle, AlertCircle, Info, Package, Tag, Trash2, Check, BellOff } from 'lucide-react';
import io from 'socket.io-client';

const Notifications = () => {
    const { userInfo } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (!userInfo?.token) return;

        const fetchNotifications = async () => {
            try {
                const { data } = await api.get('/notifications');
                setNotifications(data);
            } catch (error) {
                console.error('Error fetching notifications:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();

        // Set up Socket.IO for real-time notifications
        try {
            const socket = io('http://localhost:5001', {
                auth: { token: userInfo.token },
                reconnection: true
            });

            socket.on('newNotification', (notification) => {
                setNotifications((prev) => [notification, ...prev]);
                setToast({
                    title: notification.title,
                    message: notification.message,
                    type: notification.type
                });
                setTimeout(() => setToast(null), 5000);
            });

            return () => {
                socket.disconnect();
            };
        } catch (error) {
            console.error('Socket connection error:', error);
        }
    }, [userInfo]);

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications((prev) =>
                prev.map((notif) =>
                    notif._id === id ? { ...notif, isRead: true } : notif
                )
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const unread = notifications.filter(n => !n.isRead);
            await Promise.all(unread.map(n => api.put(`/notifications/${n._id}/read`)));
            setNotifications((prev) =>
                prev.map((notif) => ({ ...notif, isRead: true }))
            );
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'order':
                return <Package size={20} color="#38bdf8" />;
            case 'promo':
                return <Tag size={20} color="#fbbf24" />;
            case 'system':
            default:
                return <Info size={20} color="#a855f7" />;
        }
    };

    const getBgColor = (type, isRead) => {
        if (isRead) return 'rgba(255, 255, 255, 0.02)';
        switch (type) {
            case 'order':
                return 'rgba(56, 189, 248, 0.08)';
            case 'promo':
                return 'rgba(251, 191, 36, 0.08)';
            case 'system':
            default:
                return 'rgba(168, 85, 247, 0.08)';
        }
    };

    const getBorderColor = (type, isRead) => {
        if (isRead) return 'var(--border-color)';
        switch (type) {
            case 'order':
                return 'rgba(56, 189, 248, 0.3)';
            case 'promo':
                return 'rgba(251, 191, 36, 0.3)';
            case 'system':
            default:
                return 'rgba(168, 85, 247, 0.3)';
        }
    };

    const filteredNotifications = notifications.filter((notif) => {
        if (filter === 'all') return true;
        return notif.type === filter;
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    if (!userInfo) {
        return (
            <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
                <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto', padding: '40px' }}>
                    <BellOff size={48} style={{ color: 'var(--text-secondary)', marginBottom: '20px' }} />
                    <h2>Access Denied</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                        Please sign in to view your notifications and messages.
                    </p>
                    <Link to="/login" className="btn-primary">Sign In</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '40px 0 70px', maxWidth: '800px' }}>
            {toast && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(30, 30, 40, 0.95)',
                    border: '1px solid var(--accent)',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <Bell size={24} color="var(--accent)" />
                    <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>{toast.title}</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{toast.message}</p>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ fontSize: '2.3rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Bell size={32} color="var(--accent)" /> Notifications
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Stay updated with the latest orders, promotions, and system updates.
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button 
                        onClick={markAllAsRead}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                    >
                        <Check size={16} /> Mark All Read
                    </button>
                )}
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
                {['all', 'order', 'promo', 'system'].map((t) => (
                    <button
                        key={t}
                        onClick={() => setFilter(t)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: '1px solid',
                            borderColor: filter === t ? 'var(--accent)' : 'var(--border-color)',
                            background: filter === t ? 'var(--accent)' : 'rgba(255, 255, 255, 0.02)',
                            color: filter === t ? '#241804' : 'var(--text-primary)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {t} {t === 'all' && unreadCount > 0 && (
                            <span style={{ background: 'var(--accent-soft)', color: 'var(--text-primary)', padding: '2px 6px', borderRadius: '10px', fontSize: '0.75rem', marginLeft: '6px' }}>
                                {unreadCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Loading notifications...</p>
                </div>
            ) : filteredNotifications.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <BellOff size={48} style={{ color: 'var(--text-secondary)', marginBottom: '20px', opacity: 0.5 }} />
                    <h3>No Notifications Found</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {filter === 'all' 
                            ? "You're all caught up! No notifications at the moment."
                            : `No ${filter} notifications available right now.`}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filteredNotifications.map((notif) => (
                        <div
                            key={notif._id}
                            className="glass-card"
                            style={{
                                padding: '20px',
                                background: getBgColor(notif.type, notif.isRead),
                                border: `1px solid ${getBorderColor(notif.type, notif.isRead)}`,
                                borderLeft: notif.isRead ? `1px solid ${getBorderColor(notif.type, notif.isRead)}` : `4px solid ${notif.type === 'order' ? '#38bdf8' : notif.type === 'promo' ? '#fbbf24' : '#a855f7'}`,
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                gap: '16px',
                                alignItems: 'flex-start'
                            }}
                        >
                            <div style={{
                                padding: '10px',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '10px',
                                flexShrink: 0
                            }}>
                                {getIcon(notif.type)}
                            </div>
                            
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: notif.isRead ? 600 : 700 }}>
                                        {notif.title}
                                    </h4>
                                    {!notif.isRead && (
                                        <button
                                            onClick={() => markAsRead(notif._id)}
                                            style={{
                                                background: 'transparent',
                                                color: 'var(--text-secondary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer'
                                            }}
                                            title="Mark as read"
                                        >
                                            <Check size={16} /> Read
                                        </button>
                                    )}
                                </div>
                                <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                    {notif.message}
                                </p>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                                    {new Date(notif.createdAt).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Notifications;
