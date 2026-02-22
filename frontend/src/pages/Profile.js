import React, { useState, useEffect, useContext } from 'react';
import { fetchMyOrders, fetchUserProfile, updateUserProfile } from '../api';
import AuthContext from '../AuthContext';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
    const { user } = useContext(AuthContext);
    const [orders, setOrders] = useState([]);
    const [profile, setProfile] = useState({ name: '', address: '', phone: '' });
    const [isEditing, setIsEditing] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchMyOrders().then(setOrders);
        fetchUserProfile().then(data => {
            if (data) setProfile({ name: data.name, address: data.address || '', phone: data.phone || '' });
        });
    }, [user, navigate]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        const updated = await updateUserProfile(profile);
        if (updated) {
            alert("Profile updated successfully!");
            setIsEditing(false);
        } else {
            alert("Failed to update profile.");
        }
    };

    return (
        <div className="container mt-4">
            <div className="row">
                <div className="col-md-4">
                    <div className="card">
                        <div className="card-header">User Profile</div>
                        <div className="card-body">
                            {isEditing ? (
                                <form onSubmit={handleUpdate}>
                                    <div className="mb-3">
                                        <label>Name</label>
                                        <input type="text" className="form-control" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
                                    </div>
                                    <div className="mb-3">
                                        <label>Address</label>
                                        <textarea className="form-control" value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} />
                                    </div>
                                    <div className="mb-3">
                                        <label>Phone</label>
                                        <input type="text" className="form-control" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} />
                                    </div>
                                    <button type="submit" className="btn btn-success me-2">Save</button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                                </form>
                            ) : (
                                <div>
                                    <p><strong>Name:</strong> {profile.name}</p>
                                    <p><strong>Email:</strong> {user?.email}</p>
                                    <p><strong>Address:</strong> {profile.address || 'Not set'}</p>
                                    <p><strong>Phone:</strong> {profile.phone || 'Not set'}</p>
                                    <button className="btn btn-primary" onClick={() => setIsEditing(true)}>Edit Profile</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="col-md-8">
                    <h3>Order History</h3>
                    {orders.length === 0 ? <p>No orders found.</p> : (
                        <div className="list-group">
                            {orders.map(order => (
                                <div key={order._id} className="list-group-item">
                                    <div className="d-flex w-100 justify-content-between">
                                        <h5 className="mb-1">Order #{order._id.slice(-6)}</h5>
                                        <div>
                                            <span className={`badge me-2 ${order.status === 'Completed' ? 'bg-success' : order.status === 'Cancelled' ? 'bg-danger' : 'bg-warning'}`}>
                                                {order.status || 'Pending'}
                                            </span>
                                            <small>{new Date(order.date).toLocaleDateString()}</small>
                                        </div>
                                    </div>
                                    <p className="mb-1">Total: ${order.total}</p>
                                    <small>{order.items.length} items</small>
                                    <ul>
                                        {order.items.map((item, idx) => (
                                            <li key={idx}>{item.name} x {item.quantity}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
