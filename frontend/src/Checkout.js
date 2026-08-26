import React, { useState, useEffect, useContext } from 'react';
import { useCart } from './CartContext';
import { placeOrder, fetchUserProfile, updateUserProfile, createRazorpayOrder, verifyRazorpayPayment } from './api';
import { useNavigate } from 'react-router-dom';
import AuthContext from './AuthContext';

const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const Checkout = () => {
    const { cart, total, clearCart } = useCart();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [savedAddress, setSavedAddress] = useState(null); // profile data
    const [mode, setMode] = useState('loading'); // 'loading' | 'confirm' | 'new' | 'guest' | 'bill'
    const [newAddress, setNewAddress] = useState({ name: '', email: '', address: '', phone: '' });
    const [deliverySlot, setDeliverySlot] = useState('today'); // 'within_1hr' | 'today' | 'tomorrow'
    const [paymentMethod, setPaymentMethod] = useState('razorpay'); // 'razorpay' | 'cod'
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

            if (paymentMethod === 'cod') {
                const result = await placeOrder(orderData);
                if (result && result.orderId) {
                    clearCart();
                    navigate('/shop');
                    setTimeout(() => alert(`🎉 Order placed! Order ID: ${result.orderId}. Your items are on the way.`), 100);
                } else {
                    setError('Failed to place order. Please try again. Make sure you are logged in.');
                }
                setSubmitting(false);
            } else {
                // Razorpay Flow
                const res = await loadRazorpayScript();
                if (!res) {
                    setError("Razorpay SDK failed to load. Are you online?");
                    setSubmitting(false);
                    return;
                }

                const result = await createRazorpayOrder(orderData);
                if (!result || result.error) {
                    setError(result?.error || 'Failed to create payment order. Please try again.');
                    setSubmitting(false);
                    return;
                }

                const options = {
                    key: process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_test_YourKeyIdHere",
                    amount: result.amount,
                    currency: result.currency,
                    name: "Gk provision Store",
                    description: "Grocery Order",
                    order_id: result.razorpayOrderId,
                    handler: async function (response) {
                        const verifyResult = await verifyRazorpayPayment({
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                            mongoId: result.mongoId
                        });

                        if (verifyResult && verifyResult.orderId) {
                            clearCart();
                            navigate('/shop');
                            setTimeout(() => alert(`🎉 Payment Successful! Order ID: ${verifyResult.orderId}.`), 100);
                        } else {
                            setError('Payment verification failed. Please contact support.');
                        }
                    },
                    prefill: {
                        name: confirmedAddress.customerName,
                        email: confirmedAddress.email,
                        contact: confirmedAddress.phone,
                    },
                    theme: {
                        color: "#0c831f",
                    },
                };

                const paymentObject = new window.Razorpay(options);
                paymentObject.on("payment.failed", function (response) {
                    setError("Payment Failed: " + response.error.description);
                });
                paymentObject.open();
                setSubmitting(false);
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
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
                <div className="bk-bill-shop-name">Gk provision Store</div>
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
                    <strong>Mode:</strong> {paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
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

            <div className="bk-payment-method-section" style={{ marginTop: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>💳 Payment Method</h4>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input 
                            type="radio" 
                            name="paymentMethod" 
                            value="razorpay" 
                            checked={paymentMethod === 'razorpay'} 
                            onChange={() => setPaymentMethod('razorpay')} 
                        />
                        Online Payment (UPI/Cards)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input 
                            type="radio" 
                            name="paymentMethod" 
                            value="cod" 
                            checked={paymentMethod === 'cod'} 
                            onChange={() => setPaymentMethod('cod')} 
                        />
                        Cash on Delivery
                    </label>
                </div>
            </div>

            <button
                className="bk-place-order-btn"
                style={{ marginTop: '20px' }}
                onClick={handleFinalSubmit}
                disabled={submitting}
            >
                {submitting ? '⏳ Processing...' : `Confirm & Pay · ₹${finalTotal.toFixed(0)}`}
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
