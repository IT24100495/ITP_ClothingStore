import React, { useState } from 'react';
import api from '../api';

const MakeReturn = () => {
    const [orderId, setOrderId] = useState('');
    const [email, setEmail] = useState('');
    const [reason, setReason] = useState('Wrong Size');
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMessage('');

        if (!orderId.trim() || !email.trim()) {
            return;
        }

        setLoading(true);

        try {
            const payload = {
                orderId: orderId.trim(),
                email: email.trim(),
                reason,
                details: details.trim()
            };

            const { data } = await api.post('/support/returns', payload);
            const ref = data?.request?.requestId || data?.request?._id || 'Generated';
            setSuccessMessage(`Return request submitted. Reference: ${ref}`);
            setOrderId('');
            setEmail('');
            setReason('Wrong Size');
            setDetails('');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ padding: '60px 0' }}>
            <div className="glass-card" style={{ maxWidth: '760px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '2.2rem', marginBottom: '10px' }}>Make A Return</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    Submit your return request and our support team will guide you through pickup or drop-off.
                </p>

                {successMessage && (
                    <div style={{ marginBottom: '16px', borderRadius: '8px', padding: '12px', background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.4)' }}>
                        <p style={{ margin: 0, color: '#7CFFBC', fontWeight: 700 }}>{successMessage}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px' }}>
                    <input
                        type="text"
                        placeholder="Order ID"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        required
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff' }}
                    />
                    <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff' }}
                    />
                    <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff' }}
                    >
                        <option>Wrong Size</option>
                        <option>Damaged Product</option>
                        <option>Wrong Item Received</option>
                        <option>Changed Mind</option>
                    </select>
                    <textarea
                        rows={4}
                        placeholder="Additional details"
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff', resize: 'vertical' }}
                    />
                    <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '12px' }}>
                        {loading ? 'Submitting...' : 'Submit Return Request'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default MakeReturn;
