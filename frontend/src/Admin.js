import React, { useState, useEffect } from 'react';
import { fetchProducts, addProduct, updateProduct, deleteProduct, fetchOrders, updateOrderStatus, uploadProductImage } from './api';
import { PRODUCT_CATEGORIES } from './constants';

const Admin = () => {
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [view, setView] = useState('dashboard'); // 'dashboard', 'products', 'orders'
    const [editingProduct, setEditingProduct] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        mrp: '',
        unit: '',
        category: '',
        stock: '',
        unitQuantity: '',
        imageUrl: ''
    });
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
        // Auto-refresh ONLY orders every 15s — preserves all other UI state
        const interval = setInterval(async () => {
            const o = await fetchOrders();
            setOrders(o);
        }, 15000);
        return () => clearInterval(interval);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const loadData = async () => {
        const p = await fetchProducts();
        const o = await fetchOrders();
        setProducts(p);
        setOrders(o);
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let finalData = { ...formData };

        // If admin picked a file, upload it first
        if (imageFile) {
            const uploadedUrl = await uploadProductImage(imageFile);
            if (uploadedUrl) finalData.imageUrl = uploadedUrl;
            else return alert('Image upload failed. Please try again.');
        }

        let result;
        if (editingProduct) {
            result = await updateProduct(editingProduct._id, finalData);
        } else {
            result = await addProduct(finalData);
        }

        if (result && !result.error) {
            setFormData({ name: '', price: '', mrp: '', unit: '', unitQuantity: '', category: '', stock: '', imageUrl: '' });
            setEditingProduct(null);
            setImageFile(null);
            setImagePreview('');
            loadData();
        } else {
            alert(`Failed: ${result?.error || "Unknown error"}`);
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setImageFile(null);
        setImagePreview(product.imageUrl || '');
        setFormData({
            name: product.name,
            price: product.price,
            mrp: product.mrp || '',
            unit: product.unit || '',
            category: product.category || '',
            stock: product.stock || '',
            unitQuantity: product.unitQuantity || '',
            imageUrl: product.imageUrl || ''
        });
        setView('products');
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            await deleteProduct(id);
            loadData();
        }
    };

    const handleStatusUpdate = async (id, status) => {
        console.log("Updating status for Order ID:", id, "to", status);
        const result = await updateOrderStatus(id, status);
        if (result && !result.error) {
            loadData();
        } else {
            alert(`Failed: ${result?.error || "Unknown error"}. Refreshing data...`);
            loadData(); // Sync with server in case of stale data
        }
    };

    // Dashboard Stats
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((acc, o) => o.status === 'delivered' ? acc + o.total : acc, 0);
    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => p.stock < 10);

    /* ── Order pipeline helpers ── */
    const STATUS_META = {
        pending: { label: 'Pending', badge: 'border border-dark text-dark', next: 'accepted', nextLabel: 'Accept' },
        accepted: { label: 'Accepted', badge: 'border border-dark text-dark', next: 'dispatched', nextLabel: 'Dispatch' },
        dispatched: { label: 'Dispatched', badge: 'border border-dark text-dark', next: 'delivered', nextLabel: 'Deliver' },
        delivered: { label: 'Delivered', badge: 'text-dark', next: null, nextLabel: null },
        cancelled: { label: 'Cancelled', badge: 'text-muted', next: null, nextLabel: null },
    };
    const [orderFilter, setOrderFilter] = useState('all');

    // Helper: which orders belong to each tab (admin never sees cancelled)
    const filterOrders = (orders, f) => {
        const actionable = orders.filter(o => o.status !== 'cancelled' && o.status !== 'delivered');
        if (f === 'all') return actionable;
        if (f === 'active') return actionable.filter(o => o.status === 'pending' || o.status === 'accepted');
        if (f === 'dispatched') return actionable.filter(o => o.status === 'dispatched');
        if (f === 'delivered') return orders.filter(o => o.status === 'delivered');
        return orders.filter(o => o.status === f);
    };

    return (
        <div className="admin-panel mt-4 container">
            <div className="admin-header d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-black">Admin Dashboard</h2>
                <div className="btn-group">
                    <button onClick={() => setView('dashboard')} className={`btn ${view === 'dashboard' ? 'btn-primary' : 'btn-outline-primary'}`}>Dashboard</button>
                    <button onClick={() => setView('products')} className={`btn ${view === 'products' ? 'btn-primary' : 'btn-outline-primary'}`}>Products</button>
                    <button onClick={() => setView('orders')} className={`btn ${view === 'orders' ? 'btn-primary' : 'btn-outline-primary'}`}>Orders</button>
                </div>
            </div>

            {view === 'dashboard' && (
                <div className="admin-dashboard">
                    <div className="row mb-4">
                        <div className="col-md-3">
                            <div className="card text-white bg-success mb-3 h-100 shadow">
                                <div className="card-header">Total Revenue</div>
                                <div className="card-body">
                                    <h3 className="card-title">₹{totalRevenue.toFixed(2)}</h3>
                                    <p className="card-text">From completed orders</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card text-white bg-info mb-3 h-100 shadow">
                                <div className="card-header">Total Orders</div>
                                <div className="card-body">
                                    <h3 className="card-title">{totalOrders}</h3>
                                    <p className="card-text">All time orders</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card text-white bg-warning mb-3 h-100 shadow">
                                <div className="card-header">Products</div>
                                <div className="card-body">
                                    <h3 className="card-title">{totalProducts}</h3>
                                    <p className="card-text">Active items listed</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card text-white bg-danger mb-3 h-100 shadow">
                                <div className="card-header">Low Stock</div>
                                <div className="card-body">
                                    <h3 className="card-title">{lowStockProducts.length}</h3>
                                    <p className="card-text">Items under 10 units</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {lowStockProducts.length > 0 && (
                        <div className="card bg-dark text-white border-secondary mb-4">
                            <div className="card-header border-bottom border-secondary">
                                <h5 className="mb-0 text-danger">Low Stock Alerts</h5>
                            </div>
                            <div className="card-body p-0">
                                <table className="table table-dark table-hover mb-0 bg-transparent">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Current Stock</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lowStockProducts.map(p => (
                                            <tr key={p._id}>
                                                <td>{p.name}</td>
                                                <td className="text-danger fw-bold">{p.stock}</td>
                                                <td>
                                                    <button className="btn btn-sm btn-outline-light" onClick={() => handleEdit(p)}>Restock</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {view === 'products' ? (
                <div className="admin-products">
                    <div className="card mb-4 shadow-lg border-0" style={{ background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(10px)' }}>
                        <div className="card-header bg-transparent border-bottom border-secondary text-white fw-bold">
                            {editingProduct ? 'Edit Product' : 'Add New Product'}
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleSubmit} className="row g-3">

                                {/* Row 1: Name (full width) */}
                                <div className="col-12">
                                    <label className="form-label text-white-50 small mb-1">Product Name</label>
                                    <input type="text" className="form-control bg-dark text-white border-secondary" name="name" placeholder="e.g. Basmati Rice" value={formData.name} onChange={handleInputChange} required />
                                </div>

                                {/* Row 2: Sale Price | MRP */}
                                <div className="col-md-6">
                                    <label className="form-label text-white-50 small mb-1">Sale Price (₹)</label>
                                    <input type="number" className="form-control bg-dark text-white border-secondary" name="price" placeholder="e.g. 120" value={formData.price} onChange={handleInputChange} required />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-white-50 small mb-1">MRP (₹) <span className="text-white-50">– shown as strikethrough</span></label>
                                    <input type="number" className="form-control bg-dark text-white border-secondary" name="mrp" placeholder="e.g. 150" value={formData.mrp} onChange={handleInputChange} />
                                </div>

                                {/* Row 3: Unit Quantity | Stock */}
                                <div className="col-md-6">
                                    <label className="form-label text-white-50 small mb-1">Pack Size <span className="text-white-50">– shown on card e.g. 500g, 1kg, 6 pcs</span></label>
                                    <input type="text" className="form-control bg-dark text-white border-secondary" name="unitQuantity" placeholder="e.g. 500g" value={formData.unitQuantity || ''} onChange={handleInputChange} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-white-50 small mb-1">Stock (units)</label>
                                    <input type="number" className="form-control bg-dark text-white border-secondary" name="stock" placeholder="e.g. 100" value={formData.stock} onChange={handleInputChange} />
                                </div>

                                {/* Row 4: Category | Image URL */}
                                <div className="col-md-6">
                                    <label className="form-label text-white-50 small mb-1">Category</label>
                                    <select className="form-select bg-dark text-white border-secondary" name="category" value={formData.category} onChange={handleInputChange}>
                                        <option value="">Select Category</option>
                                        {PRODUCT_CATEGORIES.map(c => (
                                            <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-white-50 small mb-1">Product Image (Device/Camera)</label>
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="image-upload-wrapper" style={{ flex: 1 }}>
                                            <input
                                                type="file"
                                                className="form-control bg-dark text-white border-secondary"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                        </div>
                                        {imagePreview && (
                                            <div className="image-preview-container" style={{ width: '50px', height: '50px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #444' }}>
                                                <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        )}
                                    </div>
                                    <small className="text-white-50 mt-2 d-block" style={{ fontSize: '11px', fontWeight: '500' }}>
                                        Or enter manual URL:
                                        <input
                                            type="text"
                                            className="form-control form-control-sm bg-dark text-white border-secondary mt-1"
                                            name="imageUrl"
                                            placeholder="https://..."
                                            value={formData.imageUrl}
                                            onChange={(e) => {
                                                handleInputChange(e);
                                                setImagePreview(e.target.value);
                                                setImageFile(null);
                                            }}
                                        />
                                    </small>
                                </div>

                                {/* Submit */}
                                <div className="col-12">
                                    <button type="submit" className="btn btn-primary me-2">{editingProduct ? 'Update Product' : 'Add Product'}</button>
                                    {editingProduct && <button type="button" className="btn btn-outline-light" onClick={() => { setEditingProduct(null); setFormData({ name: '', price: '', mrp: '', unit: '', unitQuantity: '', category: '', stock: '', imageUrl: '' }); }}>Cancel</button>}
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mb-4 mt-5">
                        <h3 className="text-black mb-0">Product List</h3>
                        <div className="search-wrapper" style={{ maxWidth: '300px', width: '100%' }}>
                            <div className="input-group">
                                <span className="input-group-text bg-dark border-secondary text-white-50">🔍</span>
                                <input
                                    type="text"
                                    className="form-control bg-dark text-white border-secondary"
                                    placeholder="Search products..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover table-dark bg-transparent">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Sale Price</th>
                                    <th>MRP</th>
                                    <th>Stock</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products
                                    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map(p => (
                                        <tr key={p._id}>
                                            <td>{p.name}</td>
                                            <td>₹{p.price} {p.unitQuantity ? `(${p.unitQuantity})` : (p.unit ? `/${p.unit}` : '')}</td>
                                            <td>{p.mrp ? <span>₹{p.mrp} <span style={{ fontSize: '11px', color: '#4caf50' }}>({Math.round(((p.mrp - p.price) / p.mrp) * 100)}% off)</span></span> : <span style={{ color: '#888' }}>—</span>}</td>
                                            <td>{p.stock}</td>
                                            <td>
                                                <button className="btn btn-sm btn-outline-info me-2" onClick={() => handleEdit(p)}>Edit</button>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p._id)}>Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                    <tr><td colSpan="5" className="text-center py-5 text-white-50">No products found matching "{searchTerm}"</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : view === 'orders' ? (
                <div className="admin-orders">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h3 className="text-dark mb-0">Orders</h3>
                        <button className="btn btn-sm btn-outline-dark" onClick={loadData}>↻ Refresh</button>
                    </div>

                    {/* Pipeline tabs */}
                    <div className="btn-group mb-3 flex-wrap">
                        {[
                            { key: 'all', label: 'All' },
                            { key: 'active', label: 'Active' },
                            { key: 'dispatched', label: 'Dispatched' },
                            { key: 'delivered', label: 'Delivered' },
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                className={`btn btn-sm ${orderFilter === key ? 'btn-primary' : 'btn-outline-secondary'}`}
                                onClick={() => setOrderFilter(key)}
                            >
                                {label}
                                {' '}
                                <span className="badge bg-secondary ms-1">
                                    {filterOrders(orders, key).length}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="table-responsive">
                        <table className="table table-bordered table-hover bg-white text-dark">
                            <thead className="table-light">
                                <tr>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Phone</th>
                                    <th>Slot</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filterOrders(orders, orderFilter)
                                    .map(o => {
                                        const meta = STATUS_META[o.status] || STATUS_META['pending'];
                                        return (
                                            <tr key={o._id}>
                                                <td><strong className="text-dark">{o.orderId || o._id.slice(-6)}</strong></td>
                                                <td>
                                                    <strong>{o.customerName || o.name || '—'}</strong><br />
                                                    <small className="text-muted" style={{ opacity: 0.85 }}>{o.address}</small>
                                                </td>
                                                <td>{o.phone || '—'}</td>
                                                <td>
                                                    <span className="badge border border-dark text-dark">
                                                        {o.deliverySlot ? o.deliverySlot.replace('_', ' ') : 'today'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <ul className="list-unstyled mb-0">
                                                        {o.items?.map((i, idx) => (
                                                            <li key={idx}><small>{i.name} × {i.quantity}</small></li>
                                                        ))}
                                                    </ul>
                                                </td>
                                                <td><strong>₹{o.total}</strong></td>
                                                <td>
                                                    <span className={`badge ${meta.badge}`}>{meta.label}</span>
                                                </td>
                                                <td>
                                                    <div className="d-flex gap-1 flex-wrap">
                                                        {meta.next && (
                                                            <button
                                                                className="btn btn-sm btn-dark"
                                                                onClick={() => handleStatusUpdate(o._id, meta.next)}
                                                            >
                                                                {meta.nextLabel}
                                                            </button>
                                                        )}
                                                        {o.status === 'pending' && (
                                                            <button
                                                                className="btn btn-sm btn-outline-dark"
                                                                onClick={() => handleStatusUpdate(o._id, 'cancelled')}
                                                            >
                                                                Reject
                                                            </button>
                                                        )}
                                                        {o.status === 'delivered' && (
                                                            <span className="text-dark small">Delivered</span>
                                                        )}
                                                        {o.billHtml && (
                                                            <button
                                                                className="btn btn-sm btn-outline-dark"
                                                                onClick={() => {
                                                                    const win = window.open("", "_blank");
                                                                    win.document.write(o.billHtml);
                                                                    win.document.title = `Bill - ${o.orderId}`;
                                                                    win.document.close();
                                                                }}
                                                            >
                                                                View Bill
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                {orders.filter(o => orderFilter === 'all' ? true : o.status === orderFilter).length === 0 && (
                                    <tr><td colSpan="8" className="text-center text-muted py-5">No {orderFilter} orders.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default Admin;

