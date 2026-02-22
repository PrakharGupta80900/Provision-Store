import React, { useState, useEffect, useContext } from 'react';
import { fetchMyOrders } from '../api';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../AuthContext';

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
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchMyOrders().then(data => {
            setOrders(Array.isArray(data) ? data : []);
            setLoading(false);
        });
        const interval = setInterval(() => {
            fetchMyOrders().then(data => {
                if (Array.isArray(data)) setOrders(data);
            });
        }, 15000);
        return () => clearInterval(interval);
    }, [user, navigate]);

    if (loading) return (
        <div style={{ textAlign: 'center', padding: 100, color: '#999' }}>
            <div className="bk-load-more-spinner" style={{ margin: '0 auto 16px' }}></div>
            Loading your orders...
        </div>
    );

    return (
        <div className="bk-premium-dashboard">
            <div className="bk-profile-container" style={{ maxWidth: '700px', margin: '0 auto', padding: '0 20px' }}>

                {/* Main Content */}
                <div className="bk-profile-main">
                    <div className="bk-order-history-header" style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '28px', fontWeight: 800 }}>Order History</h2>
                    </div>

                    {orders.length === 0 ? (
                        <div className="bk-profile-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
                            <h3 style={{ color: '#1d1d1d', marginBottom: 8 }}>No orders yet</h3>
                            <p style={{ color: '#888' }}>Start shopping and your orders will appear here.</p>
                            <button className="bk-save-btn" style={{ marginTop: 16 }} onClick={() => navigate('/shop')}>
                                Shop Now →
                            </button>
                        </div>
                    ) : (
                        <div className="bk-orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            {orders.map(order => {
                                const statusInfo = STATUS_MSG[order.status] || STATUS_MSG['pending'];
                                const date = new Date(order.date).toLocaleDateString('en-IN', {
                                    day: 'numeric', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                });

                                return (
                                    <div key={order._id} className="bk-order-card shadow-sm" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--white)', overflow: 'hidden' }}>
                                        {/* Header */}
                                        <div className="bk-order-card-header" style={{ padding: '16px 20px', background: '#fcfcfc' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                <div>
                                                    <span className="bk-order-id" style={{ fontWeight: 800, color: 'var(--blinkit-green)', fontSize: 13, marginRight: 12 }}>#{order.orderId || order._id.slice(-6).toUpperCase()}</span>
                                                    <span className="bk-order-date" style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}>{date}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <span className="bk-order-total" style={{ fontWeight: 800, fontSize: 16 }}>₹{order.total}</span>
                                                    {order.billHtml && (
                                                        <button
                                                            className="bk-edit-btn"
                                                            style={{ padding: '4px 12px', fontSize: 12 }}
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
                                            </div>
                                        </div>

                                        <div style={{ padding: '20px' }}>
                                            {/* Status message */}
                                            {order.status !== 'delivered' && (
                                                <div className="bk-order-status-msg" style={{
                                                    borderLeft: `4px solid ${statusInfo.color}`,
                                                    background: `${statusInfo.color}10`,
                                                    padding: '10px 16px',
                                                    borderRadius: '0 8px 8px 0',
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    color: statusInfo.color,
                                                    marginBottom: 20
                                                }}>
                                                    {statusInfo.msg}
                                                </div>
                                            )}

                                            {/* Tracker */}
                                            {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                                <div style={{ marginBottom: 20 }}>
                                                    <StatusTracker status={order.status} />
                                                </div>
                                            )}

                                            {/* Items Preview - Main Content */}
                                            <div>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Order Items</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                    {order.items?.map((item, idx) => (
                                                        <div key={idx} style={{ background: '#f8f8f8', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: '1px solid #ebebeb' }}>
                                                            {item.name} <span style={{ color: '#888', marginLeft: 4 }}>×{item.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Delivery & Address */}
                                            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                {order.deliverySlot && (
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1d' }}>
                                                        � Delivering at: <span style={{ color: 'var(--blinkit-green)', fontWeight: 800 }}>{order.deliverySlot.replace('_', ' ')}</span>
                                                    </div>
                                                )}
                                                <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                                    {order.status === 'delivered' && <span style={{ color: 'var(--blinkit-green)', fontWeight: 800, marginRight: '4px' }}>Delivered:</span>}
                                                    📍 <span style={{ lineHeight: 1.4 }}>{order.address}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyOrders;
