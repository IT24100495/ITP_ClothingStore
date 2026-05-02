import React, { useState } from 'react';
import api from '../api';

const SubmitRequest = () => {
    const [topic, setTopic] = useState('Order Help');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMessage('');

        if (!name.trim() || !email.trim() || !message.trim()) {
            return;
        }

        setLoading(true);
        try {
            const payload = {
                topic,
                name: name.trim(),
                email: email.trim(),
                message: message.trim()
            };

            const { data } = await api.post('/support/requests', payload);
            const ref = data?.request?.ticketId || data?.request?._id || 'Generated';
            setSuccessMessage(`Support request submitted. Ticket: ${ref}`);
            setTopic('Order Help');
            setName('');
            setEmail('');
            setMessage('');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ padding: '60px 0' }}>
            <div className="glass-card" style={{ maxWidth: '760px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '2.2rem', marginBottom: '10px' }}>Submit A Request</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    Need help? Send us a request and our team will get back to you.
                </p>

                {successMessage && (
                    <div style={{ marginBottom: '16px', borderRadius: '8px', padding: '12px', background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.4)' }}>
                        <p style={{ margin: 0, color: '#7CFFBC', fontWeight: 700 }}>{successMessage}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px' }}>
                    <select
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff' }}
                    >
                        <option>Order Help</option>
                        <option>Payment Issue</option>
                        <option>Shipping Delay</option>
                        <option>Account Support</option>
                        <option>Other</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff' }}
                    />
                    <input
                        type="email"
                        placeholder="Your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff' }}
                    />
                    <textarea
                        rows={5}
                        placeholder="Tell us how we can help"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff', resize: 'vertical' }}
                    />
                    <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '12px' }}>
                        {loading ? 'Submitting...' : 'Submit Request'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SubmitRequest;
