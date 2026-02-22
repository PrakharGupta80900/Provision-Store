import React, { useState, useEffect } from 'react';
import { fetchMyOrders } from '../api';
import { useNavigate } from 'react-router-dom';

const STEPS = [
    { key: 'pending', icon: '🕐', label: 'Order Placed' },
    { key: 'accepted', icon: '✅', label: 'Accepted' },
    { key: 'dispatched', icon: '🚚', label: 'On the Way' },
    { key: 'delivered', icon: '📦', label: 'Delivered' },
];

const STATUS_IDX = {
    pending: 0, accepted: 1, dispatched: 2, delivered: 3, cancelled: -1
};

const STATUS_MSG = {
    pending: { color: '#f59e0b', msg: '⏳ Waiting for admin to accept your order...' },
    accepted: { color: '#3b82f6', msg: '👨‍🍳 Your order is being prepared!' },
    dispatched: { color: '#8b5cf6', msg: '🚚 Your order is on the way!' },
    delivered: { color: '#22c55e', msg: '🎉 Order delivered! Enjoy your groceries.' },
    cancelled: { color: '#ef4444', msg: '❌ This order was cancelled.' },
};

const StatusTracker = ({ status }) => {
    const idx = STATUS_IDX[status] ?? 0;
    const isCancelled = status === 'cancelled';
    return (
        <div className="bk-status-tracker">
            {STEPS.map((step, i) => (
                <React.Fragment key={step.key}>
                    <div className={`bk-status-step ${isCancelled ? 'cancelled' : i <= idx ? 'done' : 'upcoming'}`}>
                        <div className="bk-status-icon">{isCancelled && i === 0 ? '✕' : step.icon}</div>
                        <div className="bk-status-label">{step.label}</div>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div className={`bk-status-line ${!isCancelled && i < idx ? 'done' : ''}`} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

const MyOrders = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyOrders().then(data => {
            setOrders(Array.isArray(data) ? data : []);
            setLoading(false);
        });
        // Poll every 30s for status updates
        const interval = setInterval(() => {
            fetchMyOrders().then(data => {
                if (Array.isArray(data)) setOrders(data);
            });
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            Loading your orders...
        </div>
    );

    if (orders.length === 0) return (
        <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
            <h3 style={{ color: '#1d1d1d', marginBottom: 8 }}>No orders yet</h3>
            <p style={{ color: '#888' }}>Start shopping and your orders will appear here.</p>
            <button className="bk-auth-submit" style={{ marginTop: 16, maxWidth: 200 }} onClick={() => navigate('/shop')}>
                Shop Now →
            </button>
        </div>
    );

    return (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
            <h2 style={{ fontWeight: 800, color: '#1d1d1d', marginBottom: 24 }}>📋 My Orders</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {orders.map(order => {
                    const statusInfo = STATUS_MSG[order.status] || STATUS_MSG['pending'];
                    const date = new Date(order.date).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    });

                    return (
                        <div key={order._id} className="bk-order-card">
                            {/* Header */}
                            <div className="bk-order-card-header">
                                <div>
                                    <span className="bk-order-id">#{order.orderId || order._id.slice(-6).toUpperCase()}</span>
                                    <span className="bk-order-date">{date}</span>
                                </div>
                                <span className="bk-order-total">₹{order.total}</span>
                                {order.billHtml && (
                                    <button
                                        style={{ marginLeft: 10, fontSize: '12px', border: '1px solid #0c831f', background: 'none', color: '#0c831f', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}
                                        onClick={() => {
                                            const win = window.open("", "_blank");
                                            win.document.write(order.billHtml);
                                            win.document.title = `Bill - ${order.orderId}`;
                                            win.document.close();
                                        }}
                                    >
                                        View Bill
                                    </button>
                                )}
                            </div>

                            {/* Status message */}
                            <div className="bk-order-status-msg" style={{ borderLeftColor: statusInfo.color }}>
                                {statusInfo.msg}
                            </div>

                            {/* Tracker */}
                            {order.status !== 'cancelled' && (
                                <StatusTracker status={order.status} />
                            )}

                            {/* Items */}
                            <div className="bk-order-items">
                                {order.items?.map((item, idx) => (
                                    <div key={idx} className="bk-order-item-row">
                                        <span>{item.name} × {item.quantity}</span>
                                        <span>₹{item.price * item.quantity}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Address */}
                            {order.address && (
                                <div className="bk-order-addr">
                                    📍 {order.address}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MyOrders;
