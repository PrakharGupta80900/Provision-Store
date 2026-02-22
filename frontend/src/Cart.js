import React from 'react';
import { useCart } from './CartContext';
import { Link, useNavigate } from 'react-router-dom';

const Cart = () => {
    const { cart, removeFromCart, addToCart, total } = useCart();
    const navigate = useNavigate();

    if (cart.length === 0) {
        return (
            <div className="bk-cart-page">
                <div className="bk-cart-empty">
                    <div className="bk-cart-empty-icon">🛒</div>
                    <h2>Your cart is empty!</h2>
                    <p>Add items from the store to get started</p>
                    <Link to="/shop" className="bk-shop-btn">Shop Now</Link>
                </div>
            </div>
        );
    }

    const deliveryFee = total >= 200 ? 0 : 25;
    const finalTotal = total + deliveryFee;

    return (
        <div className="bk-cart-page">
            <div className="bk-cart-layout">
                {/* Cart Items */}
                <div className="bk-cart-items">
                    <div className="bk-cart-header">
                        <h2 className="bk-cart-title">
                            🛒 My Cart
                            <span style={{ fontSize: 14, fontWeight: 500, color: '#666', marginLeft: 8 }}>
                                ({cart.reduce((a, i) => a + i.quantity, 0)} items)
                            </span>
                        </h2>
                    </div>

                    {cart.map((item) => (
                        <div key={item._id} className="bk-cart-item-row">
                            <img
                                src={item.imageUrl || `https://source.unsplash.com/random/150x150/?${encodeURIComponent(item.name.split(' ')[0])},food`}
                                alt={item.name}
                                className="bk-cart-item-img"
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/56?text=🛒'; }}
                            />
                            <div className="bk-cart-item-info">
                                <div className="bk-cart-item-name">{item.name}</div>
                                <div className="bk-cart-item-unit">
                                    {item.unitQuantity || item.unit || 'per item'}
                                </div>
                                <div style={{ marginTop: 6 }}>
                                    <div className="bk-qty-stepper" style={{ display: 'inline-flex' }}>
                                        <button
                                            className="bk-qty-btn"
                                            onClick={() => removeFromCart(item._id, true)}
                                        >
                                            −
                                        </button>
                                        <span className="bk-qty-num">{item.quantity}</span>
                                        <button
                                            className="bk-qty-btn"
                                            onClick={() => addToCart(item)}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="bk-cart-item-price">
                                ₹{(item.price * item.quantity).toFixed(0)}
                            </div>
                            <button
                                className="bk-cart-remove"
                                onClick={() => removeFromCart(item._id)}
                                title="Remove item"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>

                {/* Bill Summary */}
                <div className="bk-cart-bill">
                    <div className="bk-bill-box">
                        <div className="bk-bill-title">Bill Details</div>

                        <div className="bk-bill-row">
                            <span>Items total</span>
                            <span>₹{total.toFixed(0)}</span>
                        </div>
                        <div className="bk-bill-row">
                            <span>Delivery charge</span>
                            <span style={{ color: deliveryFee === 0 ? '#0c831f' : undefined }}>
                                {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                            </span>
                        </div>
                        {deliveryFee === 0 && (
                            <div style={{ fontSize: 11, color: '#0c831f', fontWeight: 600, marginTop: -6, marginBottom: 6 }}>
                                🎉 Free delivery on orders ₹200+
                            </div>
                        )}

                        <hr className="bk-bill-divider" />

                        <div className="bk-bill-row bk-bill-total">
                            <span>To Pay</span>
                            <span>₹{finalTotal.toFixed(0)}</span>
                        </div>

                        <Link to="/checkout" className="bk-checkout-btn">
                            Proceed to Checkout →
                        </Link>

                        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: '#999' }}>
                            <span
                                style={{ cursor: 'pointer', color: '#0c831f', fontWeight: 600 }}
                                onClick={() => navigate('/shop')}
                            >
                                ← Continue Shopping
                            </span>
                        </div>
                    </div>

                    {/* Safety card */}
                    <div style={{
                        background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12,
                        padding: 14, marginTop: 14, fontSize: 12, color: '#666'
                    }}>
                        <div style={{ fontWeight: 700, marginBottom: 6, color: '#1d1d1d' }}>
                            🛡️ Safe & Secure Checkout
                        </div>
                        <div>100% genuine products from trusted sources</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
