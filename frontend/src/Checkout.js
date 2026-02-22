import React, { useState, useEffect, useContext } from 'react';
import { useCart } from './CartContext';
import { placeOrder, fetchUserProfile, updateUserProfile } from './api';
import { useNavigate } from 'react-router-dom';
import AuthContext from './AuthContext';

const Checkout = () => {
    const { cart, total, clearCart } = useCart();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [savedAddress, setSavedAddress] = useState(null); // profile data
    const [mode, setMode] = useState('loading'); // 'loading' | 'confirm' | 'new' | 'guest' | 'bill'
    const [newAddress, setNewAddress] = useState({ name: '', email: '', address: '', phone: '' });
    const [deliverySlot, setDeliverySlot] = useState('today'); // 'within_1hr' | 'today' | 'tomorrow'
    const [confirmedAddress, setConfirmedAddress] = useState(null);
    const [saveToProfile, setSaveToProfile] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const tax = total * 0.05;
    const baseDelivery = total >= 500 ? 0 : 15;
    const slotFee = deliverySlot === 'within_1hr' ? 20 : (deliverySlot === 'today' ? 10 : 0);
    const deliveryFee = baseDelivery + slotFee;
    const finalTotal = total + tax + deliveryFee;

    /* ── Load profile ── */
    useEffect(() => {
        if (!user) { setMode('guest'); return; }
        fetchUserProfile().then(data => {
            if (data && data.address && data.address.trim()) {
                setSavedAddress(data);
                setMode('confirm');
            } else {
                // Logged in but no address saved
                setSavedAddress(data);
                setNewAddress({
                    name: data?.name || '',
                    email: data?.email || '',
                    address: '',
                    phone: data?.phone || ''
                });
                setMode('new');
            }
        });
    }, [user]);

    const handleNewChange = (e) =>
        setNewAddress({ ...newAddress, [e.target.name]: e.target.value });

    /* ── Review bill (using saved address) ── */
    const handleReviewSaved = async (e) => {
        e.preventDefault();
        setConfirmedAddress({
            customerName: savedAddress.name,
            email: savedAddress.email,
            address: savedAddress.address,
            phone: savedAddress.phone
        });
        setMode('bill');
    };

    /* ── Review bill (using new address) ── */
    const handleReviewNew = async (e) => {
        e.preventDefault();

        // Optionally save address to profile (only if they actually place the order later, 
        // but we'll flag it here for the final step)
        setConfirmedAddress({
            customerName: newAddress.name,
            email: newAddress.email,
            address: newAddress.address,
            phone: newAddress.phone,
            shouldSave: saveToProfile && user
        });
        setMode('bill');
    };

    /* ── Final Order Placement ── */
    const handleFinalSubmit = async () => {
        setSubmitting(true);
        setError('');

        try {
            if (confirmedAddress.shouldSave) {
                await updateUserProfile({
                    name: confirmedAddress.customerName,
                    address: confirmedAddress.address,
                    phone: confirmedAddress.phone,
                });
            }

            const orderData = {
                customerName: confirmedAddress.customerName,
                email: confirmedAddress.email,
                address: confirmedAddress.address,
                phone: confirmedAddress.phone,
                items: cart,
                subtotal: total,
                tax: tax,
                deliveryCharge: deliveryFee,
                deliverySlot: deliverySlot,
                total: finalTotal,
            };
            const result = await placeOrder(orderData);
            if (result && result.orderId) {
                clearCart();
                navigate('/shop');
                setTimeout(() => alert(`🎉 Order placed! Order ID: ${result.orderId}. Your items are on the way.`), 100);
            } else {
                setError('Failed to place order. Please try again. Make sure you are logged in.');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Delivery Slot Selector ── */
    const DeliverySlotSelector = () => (
        <div className="bk-slot-selector">
            <div className="bk-addr-section-label">🕒 Choose Delivery Slot</div>
            <div className="bk-slots-grid">
                <div
                    className={`bk-slot-card ${deliverySlot === 'within_1hr' ? 'active' : ''}`}
                    onClick={() => setDeliverySlot('within_1hr')}
                >
                    <div className="bk-slot-time">⚡ Within 1 hr</div>
                    <div className="bk-slot-fee">+ ₹20 charge</div>
                </div>
                <div
                    className={`bk-slot-card ${deliverySlot === 'today' ? 'active' : ''}`}
                    onClick={() => setDeliverySlot('today')}
                >
                    <div className="bk-slot-time">📅 Today</div>
                    <div className="bk-slot-fee">+ ₹10 charge</div>
                </div>
                <div
                    className={`bk-slot-card ${deliverySlot === 'tomorrow' ? 'active' : ''}`}
                    onClick={() => setDeliverySlot('tomorrow')}
                >
                    <div className="bk-slot-time">🌅 Tomorrow</div>
                    <div className="bk-slot-fee">FREE</div>
                </div>
            </div>
            <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
                * Base delivery of ₹15 applies for orders below ₹500.
            </p>
        </div>
    );
    const OrderSummary = () => (
        <div className="bk-order-summary">
            <h4>🧾 Order Summary</h4>
            <ul className="bk-order-items-list">
                {cart.map(item => (
                    <li key={item._id}>
                        <span>{item.name} × {item.quantity}</span>
                        <span>₹{(item.price * item.quantity).toFixed(0)}</span>
                    </li>
                ))}
                <li>
                    <span>Subtotal</span>
                    <span>₹{total.toFixed(0)}</span>
                </li>
                <li>
                    <span>Service/Handling Fee</span>
                    <span>₹{tax.toFixed(0)}</span>
                </li>
                <li>
                    <span>Delivery charge</span>
                    <span style={{ color: deliveryFee === 0 ? '#0c831f' : undefined }}>
                        {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                    </span>
                </li>
            </ul>
            <div className="bk-order-total-row">
                <span>Total Amount</span>
                <span>₹{finalTotal.toFixed(0)}</span>
            </div>
        </div>
    );

    /* ── Final Bill Preview ── */
    const FinalBill = () => (
        <div className="bk-final-bill">
            <div className="bk-bill-header">
                <div className="bk-bill-shop-name">Gupta Kirana Store</div>
                <div className="bk-bill-invoice-label">FINAL BILL</div>
            </div>

            <div className="bk-bill-details-row">
                <div className="bk-bill-detail-col">
                    <strong>Billed To:</strong><br />
                    {confirmedAddress.customerName}<br />
                    {confirmedAddress.address}<br />
                    Ph: {confirmedAddress.phone}
                </div>
                <div className="bk-bill-detail-col" style={{ textAlign: 'right' }}>
                    <strong>Date:</strong><br />
                    {new Date().toLocaleDateString()}<br />
                    <strong>Mode:</strong> Pay on Delivery
                </div>
            </div>

            <table className="bk-bill-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {cart.map(item => (
                        <tr key={item._id}>
                            <td>{item.name}</td>
                            <td>{item.quantity}</td>
                            <td>₹{item.price}</td>
                            <td>₹{item.price * item.quantity}</td>
                        </tr>
                    ))}
                    <tr className="bk-bill-summary-row">
                        <td colSpan="3">Subtotal</td>
                        <td>₹{total.toFixed(0)}</td>
                    </tr>
                    <tr className="bk-bill-summary-row">
                        <td colSpan="3">Service/Handling Fee</td>
                        <td>₹{tax.toFixed(0)}</td>
                    </tr>
                    <tr className="bk-bill-summary-row">
                        <td colSpan="3">Delivery Fee ({deliverySlot.replace('_', ' ')})</td>
                        <td>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</td>
                    </tr>
                    <tr className="bk-bill-grand-total">
                        <td colSpan="3">Grand Total</td>
                        <td>₹{finalTotal.toFixed(0)}</td>
                    </tr>
                </tbody>
            </table>

            <div className="bk-bill-footer">
                Thank you for shopping with us!
            </div>

            <button
                className="bk-place-order-btn"
                onClick={handleFinalSubmit}
                disabled={submitting}
            >
                {submitting ? '⏳ Placing Order...' : `Confirm & Place Order · ₹${finalTotal.toFixed(0)}`}
            </button>

            <div className="bk-cancel-link" style={{ textAlign: 'center', marginTop: 15 }}>
                <span onClick={() => setMode(savedAddress?.address ? 'confirm' : 'new')}>← Back to Address</span>
            </div>
        </div>
    );

    if (mode === 'loading') {
        return (
            <div className="bk-checkout-page">
                <div className="bk-checkout-card">
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="bk-checkout-page">
            <div className="bk-checkout-card">
                {mode !== 'bill' && (
                    <div className="bk-checkout-card-header">
                        <span style={{ fontSize: 24 }}>📦</span>
                        <h2>Checkout</h2>
                    </div>
                )}

                <div className="bk-checkout-body">
                    {error && <div className="bk-auth-error">{error}</div>}

                    {/* ── CONFIRM saved address ── */}
                    {mode === 'confirm' && (
                        <form onSubmit={handleReviewSaved}>
                            <div className="bk-addr-section-label">📍 Delivery Address</div>

                            {/* Saved address card */}
                            <div className="bk-saved-addr-card">
                                <div className="bk-saved-addr-badge">Saved</div>
                                <div className="bk-saved-addr-name">{savedAddress.name}</div>
                                <div className="bk-saved-addr-text">{savedAddress.address}</div>
                                {savedAddress.phone && (
                                    <div className="bk-saved-addr-phone">📞 {savedAddress.phone}</div>
                                )}
                            </div>

                            <button
                                type="button"
                                className="bk-use-diff-addr-btn"
                                onClick={() => {
                                    setNewAddress({
                                        name: savedAddress.name || '',
                                        address: '',
                                        phone: savedAddress.phone || ''
                                    });
                                    setMode('new');
                                }}
                            >
                                + Use a different address
                            </button>

                            <DeliverySlotSelector />
                            <OrderSummary />

                            <button
                                type="submit"
                                className="bk-place-order-btn"
                            >
                                Review Bill & Pay
                            </button>

                            <div className="bk-cancel-link">
                                <span onClick={() => navigate('/cart')}>← Back to Cart</span>
                            </div>
                        </form>
                    )}

                    {/* ── NEW / guest address form ── */}
                    {(mode === 'new' || mode === 'guest') && (
                        <form onSubmit={handleReviewNew}>
                            <div className="bk-addr-section-label">📍 Delivery Details</div>

                            {/* Back to saved address (if one exists) */}
                            {savedAddress?.address && (
                                <button
                                    type="button"
                                    className="bk-use-diff-addr-btn"
                                    style={{ marginBottom: 12 }}
                                    onClick={() => setMode('confirm')}
                                >
                                    ← Use my saved address
                                </button>
                            )}

                            <div className="bk-form-field">
                                <label className="bk-form-label">Full Name</label>
                                <input
                                    type="text" name="name" className="bk-form-input"
                                    value={newAddress.name} onChange={handleNewChange}
                                    placeholder="Your full name" required
                                />
                            </div>

                            <div className="bk-form-field">
                                <label className="bk-form-label">Email Address</label>
                                <input
                                    type="email" name="email" className="bk-form-input"
                                    value={newAddress.email} onChange={handleNewChange}
                                    placeholder="yourname@example.com" required
                                />
                            </div>

                            <div className="bk-form-field">
                                <label className="bk-form-label">Delivery Address</label>
                                <textarea
                                    name="address" className="bk-form-input"
                                    value={newAddress.address} onChange={handleNewChange}
                                    placeholder="House no., street, area, city..."
                                    required rows={3} style={{ resize: 'vertical' }}
                                />
                            </div>

                            <div className="bk-form-field">
                                <label className="bk-form-label">Phone Number</label>
                                <input
                                    type="tel" name="phone" className="bk-form-input"
                                    value={newAddress.phone} onChange={handleNewChange}
                                    placeholder="+91 XXXXX XXXXX" required
                                />
                            </div>

                            {/* Save to profile checkbox (logged-in users only) */}
                            {user && (
                                <label className="bk-save-addr-check">
                                    <input
                                        type="checkbox"
                                        checked={saveToProfile}
                                        onChange={e => setSaveToProfile(e.target.checked)}
                                    />
                                    Save this address to my profile
                                </label>
                            )}

                            <DeliverySlotSelector />
                            <OrderSummary />

                            <button
                                type="submit"
                                className="bk-place-order-btn"
                            >
                                Review Bill & Pay
                            </button>

                            <div className="bk-cancel-link">
                                <span onClick={() => navigate('/cart')}>← Back to Cart</span>
                            </div>
                        </form>
                    )}

                    {/* ── FINAL BILL ── */}
                    {mode === 'bill' && <FinalBill />}
                </div>
            </div>
        </div>
    );
};

export default Checkout;
