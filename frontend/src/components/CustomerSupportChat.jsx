import React, { useState, useRef, useEffect } from 'react';
import { Send, X, MessageCircle, Loader, HelpCircle } from 'lucide-react';

const CustomerSupportChat = ({ isOpen, onClose, userName }) => {
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: `Hi ${userName}! 👋 I'm AUREX Support Assistant. I'm here to help with orders, shipping, products, and more. How can I assist you today?`,
            sender: 'bot',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Customer Support AI Response Generator
    const generateSupportResponse = (userMessage) => {
        const message = userMessage.toLowerCase();

        const responses = {
            // Order Related
            'order status': "I can help! To check your order status, go to the Orders section on your dashboard. You can also visit our Order Tracking page for real-time updates.",
            'track order': "Visit the 'Order Tracking' page in your dashboard to get real-time updates on your shipment. You'll see tracking numbers and estimated delivery dates.",
            'where is my order': "You can track your order in the dashboard! Click on any order and you'll see shipping details, tracking number, and estimated delivery date.",
            'cancel order': "Orders can typically be cancelled within 1 hour of placement. Contact our support team or visit your Order Tracking page for cancellation options.",
            'return': "Our return policy allows returns within 30 days of delivery. Visit the dashboard and select the product you want to return for instructions.",
            'refund': "Refunds are processed within 5-7 business days after we receive and verify your return. Check your email for confirmation!",

            // Product Related
            'product info': "Browse our shop to see detailed product information, customer reviews, sizing guides, and high-quality images. Each product has complete specifications.",
            'size guide': "Use our sizing tool in each product page. You can save your size preferences in your profile for easier shopping!",
            'material': "All product materials are listed on the product detail page. Filter by material in the shop to find exactly what you're looking for.",
            'colors': "Most items come in multiple colors. Check the product page to see all available color options for any item.",

            // Shipping & Delivery
            'shipping': "We offer fast shipping! Standard delivery takes 5-7 business days. Express shipping (2-3 days) is available at checkout.",
            'delivery': "Most orders deliver within 5-7 business days from order confirmation. You'll get tracking updates via email!",
            'free shipping': "Free shipping is available on orders over LKR 2,500! Check your cart for shipping cost calculations.",
            'international': "We currently ship domestically. International shipping options are coming soon!",

            // Payment & Account
            'payment': "We accept all major credit cards, debit cards, and digital wallets. Your payment info is secure and encrypted.",
            'account': "Manage your account in the dashboard! Update your profile, saved addresses, payment methods, and preferences.",
            'password': "You can reset your password on the login page. Click 'Forgot Password' for step-by-step instructions.",
            'profile': "Visit your Dashboard to update your profile information, email, and sizing preferences.",

            // General Help
            'help': "I can assist with:\n• Order tracking & status\n• Product information\n• Shipping & delivery\n• Returns & refunds\n• Account help\n• Payment questions",
            'contact': "Need to talk to a human? Email support@aurex.com or call our hotline: 1-800-AUREX-1\nAvailable Monday-Friday 9AM-6PM EST",
            'hours': "Our customer support hours are Monday-Friday, 9AM-6PM EST. We'll respond to emails within 24 hours!",

            // Compliments
            'thanks': "You're welcome! Happy to help. Is there anything else I can do for you?",
            'thank you': "You're very welcome! Feel free to reach out anytime you need help. Enjoy your AUREX experience!",

            // Default
            default: "I'm here to help! I can assist with orders, shipping, products, returns, and account questions. What can I help you with?"
        };

        // Check for keyword matches
        for (const [keyword, response] of Object.entries(responses)) {
            if (message.includes(keyword)) {
                return response;
            }
        }

        // Check for question mark
        if (message.includes('?')) {
            return "Great question! I can help with order information, shipping details, product specifics, returns, and account management. What would you like to know about?";
        }

        return responses.default;
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        // Add user message
        const userMessage = {
            id: messages.length + 1,
            text: inputValue,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages([...messages, userMessage]);
        setInputValue('');
        setIsLoading(true);

        // Simulate support response delay
        setTimeout(() => {
            const botResponse = {
                id: messages.length + 2,
                text: generateSupportResponse(inputValue),
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botResponse]);
            setIsLoading(false);
        }, 600);
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '400px',
            height: '600px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0, 255, 136, 0.2)',
            zIndex: 9999,
            backdropFilter: 'blur(10px)'
        }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #00ff88, var(--accent))',
                padding: '15px 20px',
                borderRadius: '16px 16px 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MessageCircle size={20} color="#000" />
                    <div>
                        <p style={{ margin: 0, fontWeight: 700, color: '#000' }}>Support Chat</p>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(0,0,0,0.6)' }}>Average reply time: 1 min</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#000',
                        cursor: 'pointer',
                        padding: '5px'
                    }}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Quick Actions */}
            <div style={{
                padding: '12px 15px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                gap: '8px',
                overflowX: 'auto'
            }}>
                {[
                    { icon: '📦', label: 'Track Order', query: 'track order' },
                    { icon: '❓', label: 'FAQ', query: 'help' },
                    { icon: '📞', label: 'Contact', query: 'contact' }
                ].map((action, idx) => (
                    <button
                        key={idx}
                        onClick={() => setInputValue(action.query)}
                        style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            fontSize: '0.8rem',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.background = 'var(--accent)'}
                        onMouseOut={(e) => e.target.style.background = 'var(--bg-secondary)'}
                    >
                        {action.icon} {action.label}
                    </button>
                ))}
            </div>

            {/* Messages Container */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        style={{
                            display: 'flex',
                            justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                            animation: 'fadeIn 0.3s ease-in'
                        }}
                    >
                        <div
                            style={{
                                maxWidth: '85%',
                                background: msg.sender === 'user'
                                    ? 'var(--accent)'
                                    : 'var(--bg-secondary)',
                                color: msg.sender === 'user' ? '#000' : '#fff',
                                padding: '10px 15px',
                                borderRadius: msg.sender === 'user'
                                    ? '12px 12px 0 12px'
                                    : '12px 12px 12px 0',
                                wordWrap: 'break-word',
                                fontSize: '0.9rem',
                                lineHeight: '1.4',
                                whiteSpace: 'pre-wrap'
                            }}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-start'
                    }}>
                        <div style={{
                            background: 'var(--bg-secondary)',
                            padding: '10px 15px',
                            borderRadius: '12px 12px 12px 0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Support team is typing...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
                onSubmit={handleSendMessage}
                style={{
                    padding: '12px 15px',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    gap: '10px',
                    background: 'var(--bg-secondary)'
                }}
            >
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask us anything..."
                    style={{
                        flex: 1,
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none'
                    }}
                />
                <button
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                    style={{
                        background: inputValue.trim() ? '#00ff88' : 'var(--border-color)',
                        border: 'none',
                        color: '#000',
                        borderRadius: '8px',
                        padding: '10px 15px',
                        cursor: inputValue.trim() ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                >
                    <Send size={18} />
                </button>
            </form>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default CustomerSupportChat;
