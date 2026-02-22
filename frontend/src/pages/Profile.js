import React, { useState, useEffect, useContext } from 'react';
import { fetchUserProfile, updateUserProfile } from '../api';
import AuthContext from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
    const { user, logout } = useContext(AuthContext);
    const { theme, toggleTheme } = useTheme();
    const [profile, setProfile] = useState({ name: '', address: '', phone: '', wallet: 0 });
    const [isEditing, setIsEditing] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchUserProfile().then(data => {
            if (data) setProfile({
                name: data.name,
                address: data.address || '',
                phone: data.phone || '',
                wallet: data.wallet || 0
            });
        });
    }, [user, navigate]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        const updated = await updateUserProfile(profile);
        if (updated) {
            setIsEditing(false);
            alert("Profile updated successfully! ✨");
        }
    };

    const initial = profile.name?.charAt(0) || user?.email?.charAt(0) || '?';

    return (
        <div className="bk-z-container">
            {/* --- Header --- */}
            <div className="bk-z-header">
                <button className="bk-z-back-btn" onClick={() => navigate('/shop')}>←</button>

                <div className="bk-z-profile-card">
                    <div className="bk-z-avatar">{initial}</div>
                    <div className="bk-z-user-info">
                        <h2>{profile.name || 'valued user'}</h2>
                        <div className="bk-z-edit-profile" onClick={() => setIsEditing(!isEditing)}>
                            {isEditing ? 'Cancel editing' : 'Edit profile'}
                        </div>
                    </div>
                </div>

                {!isEditing && (
                    <div className="bk-z-membership-bar">
                        <div className="bk-z-membership-content">
                            <div className="bk-z-membership-icon">👑</div>
                            Renew your Gold Membership
                        </div>
                        <span style={{ fontSize: '18px' }}>›</span>
                    </div>
                )}
            </div>

            {isEditing ? (
                /* --- Edit Form --- */
                <form onSubmit={handleUpdate} className="bk-z-edit-form">
                    <div className="bk-z-input-wrapper">
                        <label className="bk-z-label">Full Name</label>
                        <input
                            type="text"
                            className="bk-z-input"
                            value={profile.name}
                            onChange={e => setProfile({ ...profile, name: e.target.value })}
                            placeholder="Your Name"
                            required
                        />
                    </div>
                    <div className="bk-z-input-wrapper">
                        <label className="bk-z-label">Mobile Number</label>
                        <input
                            type="text"
                            className="bk-z-input"
                            value={profile.phone}
                            onChange={e => setProfile({ ...profile, phone: e.target.value })}
                            placeholder="10-digit mobile number"
                        />
                    </div>
                    <div className="bk-z-input-wrapper">
                        <label className="bk-z-label">Address</label>
                        <textarea
                            className="bk-z-input"
                            rows="3"
                            value={profile.address}
                            onChange={e => setProfile({ ...profile, address: e.target.value })}
                            placeholder="Flat No, House Name, Street"
                        />
                    </div>

                    <div className="bk-z-btn-group">
                        <button type="button" className="bk-z-btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                        <button type="submit" className="bk-z-btn-primary">Update Profile</button>
                    </div>
                </form>
            ) : (
                /* --- Profile View --- */
                <>
                    <div className="bk-z-quick-rows">
                        <div className="bk-z-stat-card">
                            <div className="bk-z-stat-icon">💰</div>
                            <div className="bk-z-stat-label">Wallet</div>
                            <div className="bk-z-stat-value">₹{profile.wallet || 0}</div>
                        </div>
                        <div className="bk-z-stat-card">
                            <div className="bk-z-stat-icon">🎟️</div>
                            <div className="bk-z-stat-label">Coupons</div>
                        </div>
                    </div>

                    <div className="bk-z-section">
                        <div className="bk-z-section-title">Your preferences</div>
                        <div className="bk-z-list">
                            <div className="bk-z-list-item">
                                <span className="bk-z-list-icon">🥦</span>
                                <span className="bk-z-list-text">Veg Mode</span>
                                <span className="bk-z-list-suffix">Off</span>
                            </div>
                            <div className="bk-z-list-item" onClick={toggleTheme}>
                                <span className="bk-z-list-icon">{theme === 'light' ? '☀️' : '🌙'}</span>
                                <span className="bk-z-list-text">Appearance</span>
                                <span className="bk-z-list-suffix" style={{ textTransform: 'capitalize' }}>{theme}</span>
                            </div>
                            <div className="bk-z-list-item">
                                <span className="bk-z-list-icon">💳</span>
                                <span className="bk-z-list-text">Payment methods</span>
                            </div>
                        </div>
                    </div>

                    <div className="bk-z-section">
                        <div className="bk-z-section-title">Account details</div>
                        <div className="bk-z-list">
                            <div className="bk-z-list-item" onClick={() => navigate('/my-orders')}>
                                <span className="bk-z-list-icon">📦</span>
                                <span className="bk-z-list-text">Your orders</span>
                            </div>
                            <div className="bk-z-list-item">
                                <span className="bk-z-list-icon">🏠</span>
                                <span className="bk-z-list-text">Address book</span>
                            </div>
                            <div className="bk-z-list-item" onClick={logout} style={{ borderBottom: 'none' }}>
                                <span className="bk-z-list-icon">🚪</span>
                                <span className="bk-z-list-text" style={{ color: 'var(--z-red)', fontWeight: 700 }}>Sign out</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Profile;
