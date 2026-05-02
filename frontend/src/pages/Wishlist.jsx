import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ChevronLeft, Heart, ShoppingCart } from 'lucide-react';
import { formatPrice } from '../utils/currency';

const Wishlist = () => {
    const navigate = useNavigate();
    const [wishlistItems, setWishlistItems] = useState([]);
    const [removedMessage, setRemovedMessage] = useState('');
    const selectedCurrencyCode = localStorage.getItem('selectedCurrencyCode') || 'USD';

    useEffect(() => {
        // Load wishlist from localStorage
        const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        setWishlistItems(wishlist);
    }, []);

    const handleRemoveFromWishlist = (productId) => {
        const updatedWishlist = wishlistItems.filter(item => item._id !== productId);
        setWishlistItems(updatedWishlist);
        localStorage.setItem('wishlist', JSON.stringify(updatedWishlist));
        setRemovedMessage('Removed from wishlist ❌');
        setTimeout(() => setRemovedMessage(''), 2000);
    };

    const handleClearWishlist = () => {
        setWishlistItems([]);
        localStorage.setItem('wishlist', JSON.stringify([]));
        setRemovedMessage('Wishlist cleared ❌');
        setTimeout(() => setRemovedMessage(''), 2000);
    };

    const imageUrl = (imagePath) => {
        if (!imagePath) return '';
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath;
        }
        return `http://localhost:5001${imagePath}`;
    };

    return (
        <div className="container" style={{ padding: '40px 0 70px' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'transparent', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '26px', fontWeight: 600 }}>
                <ChevronLeft size={20} /> Back
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Heart size={32} fill="currentColor" style={{ color: 'var(--accent)' }} />
                    <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: 0, fontFamily: 'Sora, sans-serif' }}>My Wishlist</h1>
                </div>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {wishlistItems.length} item{wishlistItems.length !== 1 ? 's' : ''}
                </span>
            </div>

            {removedMessage && (
                <div style={{ 
                    marginBottom: '20px',
                    padding: '12px 16px', 
                    borderRadius: '8px', 
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    animation: 'fadeIn 0.3s ease-in'
                }}>
                    {removedMessage}
                </div>
            )}

            {wishlistItems.length === 0 ? (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '60px 20px',
                    borderRadius: '14px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                }}>
                    <Heart size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px', opacity: 0.5 }} />
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--text-primary)' }}>Your wishlist is empty</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Add products to your wishlist to save them for later</p>
                    <Link to="/shop" className="btn-primary" style={{ display: 'inline-block', padding: '12px 24px' }}>
                        Continue Shopping
                    </Link>
                </div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', marginBottom: '30px' }}>
                        {wishlistItems.map((item) => (
                            <div 
                                key={item._id}
                                className="glass-card"
                                style={{ 
                                    padding: '16px', 
                                    borderRadius: '14px',
                                    transition: 'all 0.3s ease',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                {/* Product Image */}
                                <Link 
                                    to={`/product/${item._id}`}
                                    style={{ textDecoration: 'none', marginBottom: '14px', overflow: 'hidden', borderRadius: '10px' }}
                                >
                                    <img 
                                        src={imageUrl(item.image)} 
                                        alt={item.name}
                                        style={{ 
                                            width: '100%', 
                                            height: '200px', 
                                            objectFit: 'cover',
                                            borderRadius: '10px',
                                            transition: 'transform 0.3s ease',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                    />
                                </Link>

                                {/* Product Info */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <Link 
                                        to={`/product/${item._id}`}
                                        style={{ textDecoration: 'none', marginBottom: '8px' }}
                                    >
                                        <h3 style={{ 
                                            fontSize: '0.95rem', 
                                            fontWeight: 700,
                                            color: 'var(--text-primary)',
                                            margin: 0,
                                            cursor: 'pointer',
                                            transition: 'color 0.3s ease'
                                        }}
                                        onMouseEnter={(e) => e.target.style.color = 'var(--accent)'}
                                        onMouseLeave={(e) => e.target.style.color = 'var(--text-primary)'}
                                        >
                                            {item.name}
                                        </h3>
                                    </Link>

                                    <p style={{ 
                                        fontSize: '0.8rem', 
                                        color: 'var(--text-secondary)',
                                        margin: '0 0 12px 0',
                                        lineHeight: '1.4',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
                                    }}>
                                        {item.description}
                                    </p>

                                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent)' }}>
                                            {formatPrice(item.price, selectedCurrencyCode)}
                                        </span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <Link 
                                        to={`/product/${item._id}`}
                                        className="btn-primary"
                                        style={{ 
                                            flex: 1, 
                                            minWidth: '120px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '10px 12px',
                                            fontSize: '0.85rem',
                                            gap: '6px',
                                            textDecoration: 'none'
                                        }}
                                    >
                                        <ShoppingCart size={16} /> Add to Cart
                                    </Link>
                                    <button 
                                        onClick={() => handleRemoveFromWishlist(item._id)}
                                        style={{ 
                                            background: 'transparent',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            padding: '10px 12px',
                                            color: 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.borderColor = '#ef4444';
                                            e.target.style.color = '#ef4444';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.borderColor = 'var(--border-color)';
                                            e.target.style.color = 'var(--text-secondary)';
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {wishlistItems.length > 0 && (
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Link to="/shop" className="btn-outline" style={{ padding: '12px 28px' }}>
                                Continue Shopping
                            </Link>
                            <button 
                                onClick={handleClearWishlist}
                                style={{ 
                                    background: 'transparent',
                                    border: '2px solid #ef4444',
                                    borderRadius: '8px',
                                    color: '#ef4444',
                                    padding: '10px 20px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'transparent';
                                }}
                            >
                                Clear Wishlist
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Wishlist;
