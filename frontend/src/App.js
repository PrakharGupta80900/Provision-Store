import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { fetchProducts } from './api';
import './App.css';
import { CATEGORIES } from './constants';
import { CartProvider, useCart } from './CartContext';
import Cart from './Cart';
import Checkout from './Checkout';
import Admin from './Admin';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import MyOrders from './pages/MyOrders';
import AuthContext, { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import homeImg from './home.jpg';

/* ================================================================
   CONSTANTS
================================================================ */
// CATEGORIES is imported from ./constants

const SORT_OPTIONS = [
  { label: 'Relevance', value: 'default' },
  { label: 'Price: Low → High', value: 'price_asc' },
  { label: 'Price: High → Low', value: 'price_desc' },
  { label: 'Name: A → Z', value: 'name_asc' },
  { label: 'Name: Z → A', value: 'name_desc' },
];

const PAGE_SIZE = 12;

/* ================================================================
   HELPERS
================================================================ */
const applySort = (items, sort) => {
  const arr = [...items];
  switch (sort) {
    case 'price_asc': return arr.sort((a, b) => a.price - b.price);
    case 'price_desc': return arr.sort((a, b) => b.price - a.price);
    case 'name_asc': return arr.sort((a, b) => a.name.localeCompare(b.name));
    case 'name_desc': return arr.sort((a, b) => b.name.localeCompare(a.name));
    default: return arr;
  }
};

/* ================================================================
   TOAST
================================================================ */
const Toast = ({ message }) => <div className="bk-toast">{message}</div>;

/* ================================================================
   PRODUCT CARD — matches list.jpeg exactly
================================================================ */
const ProductCard = ({ product, onAdd, onIncrement, onDecrement, qtyInCart }) => {
  const isOutOfStock = product.stock === 0;

  // Derive a simulated MRP (if no mrp field, show 20% higher than price as "original")
  const mrp = product.mrp || Math.round(product.price * 1.25);
  const discount = mrp > product.price
    ? Math.round(((mrp - product.price) / mrp) * 100)
    : 0;

  const unitLabel = product.unitQuantity || (product.unit ? `${product.unit}` : 'piece');

  return (
    <div className="bk-card">
      {/* ── Image Box ── */}
      <div className="bk-card-img-box">
        {/* Bookmark icon top-left */}
        <button className="bk-card-bookmark" aria-label="Save">
          <svg width="14" height="17" viewBox="0 0 14 17" fill="none">
            <path d="M1 1h12v14.5l-6-3.5-6 3.5V1z" stroke="#bbb" strokeWidth="1.5" fill="none" />
          </svg>
        </button>

        {/* + / stepper button top-right */}
        {!isOutOfStock && (
          qtyInCart > 0 ? (
            <div className="bk-card-stepper">
              <button onClick={() => onDecrement(product)}>−</button>
              <span>{qtyInCart}</span>
              <button onClick={() => onIncrement(product)}>+</button>
            </div>
          ) : (
            <button className="bk-card-add-btn" onClick={() => onAdd(product)}>+</button>
          )
        )}

        {isOutOfStock && <span className="bk-oos-badge">Out of Stock</span>}

        {/* Product image */}
        <img
          src={product.imageUrl || `https://source.unsplash.com/random/300x300/?${encodeURIComponent(product.name.split(' ')[0])},grocery,food`}
          alt={product.name}
          className="bk-card-img"
          onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&background=f0f0f0&color=666&size=200&bold=true`; }}
        />

        {/* Unit pill at bottom of image */}
        <div className="bk-card-unit-pill">{unitLabel}</div>
      </div>

      {/* ── Info below image ── */}
      <div className="bk-card-info">
        {/* Rating row — simulated since we don't have ratings */}
        <div className="bk-card-rating">
          <span className="bk-card-star">★</span>
          <span className="bk-card-rating-val">4.3</span>
          <span className="bk-card-rating-count">(2.1k)</span>
        </div>

        {/* Name */}
        <div className="bk-card-name">{product.name}</div>

        {/* Discount */}
        {discount > 0 && (
          <div className="bk-card-discount">{discount}% OFF</div>
        )}

        {/* Price row: sale + MRP */}
        <div className="bk-card-price-row">
          <span className="bk-card-price">₹{product.price}</span>
          {discount > 0 && (
            <span className="bk-card-mrp">₹{mrp}</span>
          )}
        </div>
      </div>
    </div>
  );
};


/* ================================================================
   FILTER PANEL (price range + active filter chips)
================================================================ */
const FilterPanel = ({ minPrice, maxPrice, priceRange, onPriceChange, sort, onSortChange, onReset, activeCount }) => {
  return (
    <div className="bk-filter-panel">
      <div className="bk-filter-header">
        <span className="bk-filter-title">Filters</span>
        {activeCount > 0 && (
          <button className="bk-filter-reset" onClick={onReset}>Clear all</button>
        )}
      </div>

      {/* Sort */}
      <div className="bk-filter-section">
        <div className="bk-filter-label">Sort By</div>
        <div className="bk-sort-list">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`bk-sort-option ${sort === opt.value ? 'active' : ''}`}
              onClick={() => onSortChange(opt.value)}
            >
              {sort === opt.value && <span className="bk-sort-dot" />}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="bk-filter-section">
        <div className="bk-filter-label">Price Range</div>
        <div className="bk-price-range-display">
          ₹{priceRange[0]} – ₹{priceRange[1]}
        </div>
        <div className="bk-price-inputs">
          <div className="bk-price-input-wrap">
            <span>Min</span>
            <input
              type="number"
              min={0}
              max={priceRange[1]}
              value={priceRange[0]}
              onChange={e => onPriceChange([Number(e.target.value), priceRange[1]])}
              className="bk-price-input"
            />
          </div>
          <div className="bk-price-input-sep">–</div>
          <div className="bk-price-input-wrap">
            <span>Max</span>
            <input
              type="number"
              min={priceRange[0]}
              max={maxPrice}
              value={priceRange[1]}
              onChange={e => onPriceChange([priceRange[0], Number(e.target.value)])}
              className="bk-price-input"
            />
          </div>
        </div>
        {/* Slider */}
        <input
          type="range"
          min={minPrice}
          max={maxPrice}
          value={priceRange[1]}
          onChange={e => onPriceChange([priceRange[0], Number(e.target.value)])}
          className="bk-price-slider"
        />
      </div>
    </div>
  );
};

/* ================================================================
   PRODUCT LIST / SHOP PAGE
================================================================ */
const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, removeFromCart, cart, syncCartWithProducts } = useCart();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Filters & UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('default');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Infinite scroll sentinel
  const sentinelRef = useRef(null);

  useEffect(() => {
    const loadProducts = async () => {
      const data = await fetchProducts();
      setProducts(data);
      syncCartWithProducts(data); // KEEP CART IN SYNC WITH ADMIN CHANGES
      if (data.length > 0) {
        setPriceRange(prev => {
          const max = Math.max(...data.map(p => p.price));
          if (prev[1] === 10000) return [0, max];
          return prev;
        });
      }
      setLoading(false);
    };

    loadProducts();
    const interval = setInterval(loadProducts, 10000); // 10s POLLING FOR REAL-TIME REFRESH
    return () => clearInterval(interval);
  }, [syncCartWithProducts]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [searchTerm, category, sort, priceRange]);

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setPage(p => p + 1); },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loading]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const handleAdd = (product) => {
    if (!user) { navigate('/login'); return; }
    addToCart(product);
    showToast(`${product.name} added to cart`);
  };

  const getQtyInCart = (id) => {
    const item = cart.find(i => i._id === id);
    return item ? item.quantity : 0;
  };

  const maxPrice = products.length > 0 ? Math.max(...products.map(p => p.price)) : 10000;

  // --- Filter pipeline ---
  const filtered = applySort(
    products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = category ? p.category === category : true;
      const matchPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
      return matchSearch && matchCat && matchPrice;
    }),
    sort
  );

  // Pagination (show page * PAGE_SIZE items for infinite scroll feel)
  const visibleProducts = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visibleProducts.length < filtered.length;

  const activeFilterCount = (sort !== 'default' ? 1 : 0) + (priceRange[0] > 0 || priceRange[1] < maxPrice ? 1 : 0);

  const handleReset = () => {
    setSort('default');
    setPriceRange([0, maxPrice]);
    setCategory('');
    setSearchTerm('');
  };

  // Category banner info
  const activeCat = CATEGORIES.find(c => c.value === category) || CATEGORIES[0];

  return (
    <>
      {toast && <Toast message={toast} />}

      {/* Mobile search + filter toggle */}
      <div className="bk-mobile-toolbar">
        <div className="bk-search-bar bk-mobile-search">
          <span className="bk-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          className="bk-filter-toggle-btn"
          onClick={() => setShowFilters(v => !v)}
        >
          ⚙️ Filters {activeFilterCount > 0 && <span className="bk-filter-badge">{activeFilterCount}</span>}
        </button>
      </div>

      <div className="bk-layout">
        {/* ── Sidebar ── */}
        <aside className="bk-sidebar">
          <div className="bk-sidebar-title">Categories</div>
          <ul className="bk-category-list">
            {CATEGORIES.map(c => (
              <li key={c.value}>
                <button
                  className={`bk-category-item ${category === c.value ? 'active' : ''}`}
                  onClick={() => setCategory(c.value)}
                >
                  <span className="bk-category-emoji">{c.emoji}</span>
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* ── Main ── */}
        <main className="bk-main">
          {/* Banner */}
          <div className="bk-banner">
            <div className="bk-banner-text">
              <h2>{activeCat.emoji} {activeCat.label === 'All Items' ? 'Groceries & Essentials' : activeCat.label}</h2>
              <p>Fresh products delivered to your doorstep</p>
            </div>
            <div className="bk-banner-badge">⚡ Fast Delivery</div>
          </div>

          {/* Toolbar: sort + filter panel */}
          <div className="bk-toolbar">
            <div className="bk-toolbar-left">
              <div className="bk-section-title">
                {activeCat.label === 'All Items' ? 'All Products' : activeCat.label}
              </div>
              <span className="bk-product-count">{filtered.length} items</span>
            </div>
            <div className="bk-toolbar-right">
              {/* Desktop sort */}
              <select
                className="bk-sort-select"
                value={sort}
                onChange={e => setSort(e.target.value)}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {/* Desktop filter toggle */}
              <button
                className={`bk-filter-chip ${showFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(v => !v)}
              >
                🔧 Filters {activeFilterCount > 0 && <span className="bk-filter-badge">{activeFilterCount}</span>}
              </button>
            </div>
          </div>

          {/* Active filter chips */}
          {(category || sort !== 'default' || priceRange[0] > 0 || priceRange[1] < maxPrice) && (
            <div className="bk-active-chips">
              {category && (
                <span className="bk-chip">
                  {activeCat.emoji} {activeCat.label}
                  <button onClick={() => setCategory('')}>✕</button>
                </span>
              )}
              {sort !== 'default' && (
                <span className="bk-chip">
                  {SORT_OPTIONS.find(o => o.value === sort)?.label}
                  <button onClick={() => setSort('default')}>✕</button>
                </span>
              )}
              {(priceRange[0] > 0 || priceRange[1] < maxPrice) && (
                <span className="bk-chip">
                  ₹{priceRange[0]}–₹{priceRange[1]}
                  <button onClick={() => setPriceRange([0, maxPrice])}>✕</button>
                </span>
              )}
              <button className="bk-chip bk-chip-clear" onClick={handleReset}>Clear all</button>
            </div>
          )}

          {/* Collapsible filter panel */}
          {showFilters && (
            <FilterPanel
              minPrice={0}
              maxPrice={maxPrice}
              priceRange={priceRange}
              onPriceChange={setPriceRange}
              sort={sort}
              onSortChange={setSort}
              onReset={handleReset}
              activeCount={activeFilterCount}
            />
          )}

          {/* Desktop search bar (inside main for non-header use) */}
          <div className="bk-desktop-search">
            <div className="bk-search-bar">
              <span className="bk-search-icon">🔍</span>
              <input
                type="text"
                placeholder={`Search in ${activeCat.label}...`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Product grid */}
          {loading ? (
            <div className="bk-product-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bk-product-card">
                  <div className="loading-skeleton" style={{ width: '100%', aspectRatio: '1', borderRadius: 8 }} />
                  <div className="loading-skeleton" style={{ height: 14, marginTop: 8, borderRadius: 4, width: '80%' }} />
                  <div className="loading-skeleton" style={{ height: 12, borderRadius: 4, width: '50%' }} />
                </div>
              ))}
            </div>
          ) : visibleProducts.length > 0 ? (
            <>
              <div className="bk-product-grid">
                {visibleProducts.map(product => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onAdd={handleAdd}
                    onIncrement={p => addToCart(p)}
                    onDecrement={p => removeFromCart(p._id, true)}
                    qtyInCart={(!user || !user.isAdmin) ? getQtyInCart(product._id) : 0}
                  />
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              {hasMore && (
                <div ref={sentinelRef} className="bk-load-more-sentinel">
                  <div className="bk-load-more-spinner" />
                  <span>Loading more...</span>
                </div>
              )}

              {!hasMore && filtered.length > PAGE_SIZE && (
                <div className="bk-all-loaded">
                  ✅ All {filtered.length} products shown
                </div>
              )}
            </>
          ) : (
            <div className="bk-empty">
              <div className="bk-empty-icon">🔍</div>
              <div className="bk-empty-title">No products found</div>
              <div className="bk-empty-sub">Try a different search or filter</div>
              <button className="bk-shop-btn" onClick={handleReset} style={{ marginTop: 12 }}>
                Reset Filters
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

/* ================================================================
   NAVIGATION
================================================================ */
const Navigation = () => {
  const { user, logout } = useContext(AuthContext);
  const { cart } = useCart();
  const navigate = useNavigate();
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  if (user && user.isAdmin) {
    return (
      <nav className="bk-admin-navbar">
        <span className="bk-admin-brand">⚡ Admin Panel</span>
        <Link to="/admin">Dashboard</Link>
        <button onClick={() => { logout(); navigate('/login'); }}>Logout ({user.name})</button>
      </nav>
    );
  }

  return (
    <header className="bk-header">
      <div className="bk-header-inner">
        <Link to="/shop" className="bk-logo" style={{ textDecoration: 'none' }}>
          <div>
            <div className="bk-logo-text">⚡ Gk provision Store</div>
            <div className="bk-logo-sub">Provision Store</div>
          </div>
        </Link>

        <div className="bk-delivery-tag">
          <span>Delivery in</span>
          <span>10 minutes</span>
        </div>

        <div className="bk-header-actions">
          {user ? (
            <>
              <Link to="/profile" className="bk-btn-icon">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {user.name.split(' ')[0]}
              </Link>
              {!user.isAdmin && (
                <Link to="/my-orders" className="bk-btn-icon">
                  📋 My Orders
                </Link>
              )}
              <button className="bk-btn-icon" onClick={() => { logout(); navigate('/login'); }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="bk-btn-icon">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Login
            </Link>
          )}

          <Link to="/cart" className="bk-btn-icon bk-cart-btn">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            My Cart
            {totalItems > 0 && <span className="bk-cart-count">{totalItems}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
};

/* ================================================================
   ROUTE GUARDS
================================================================ */
const NonAdminRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (user && user.isAdmin) return <Navigate to="/admin" />;
  return children;
};

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !user.isAdmin) return <Navigate to="/shop" />;
  return children;
};

/* ================================================================
   APP ROOT
================================================================ */

/* ================================================================
   SPLASH SCREEN
   ================================================================ */
const SplashScreen = ({ show }) => {
  const [active, setActive] = useState(false);
  useEffect(() => {
    // Small delay to trigger the scale-in transition
    const t = setTimeout(() => setActive(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`bk-splash-container ${show ? '' : 'fade-out'} ${active ? 'active' : ''}`}>
      <img src={homeImg} alt="Splash" className="bk-splash-image" />
      <div className="bk-splash-logo-overlay">
        <div className="bk-splash-logo-text">Gk provision Store</div>
        <p style={{ margin: 0, opacity: 0.9, fontWeight: 600 }}>Freshness delivered instantly</p>
      </div>
    </div>
  );
};

/* ================================================================
   APP ROOT
   ================================================================ */
const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [renderMain, setRenderMain] = useState(false);

  useEffect(() => {
    // Phase 1: Show splash for 2s
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
      // Phase 2: Start rendering main content so it can fade in while splash fades out
      setRenderMain(true);
    }, 2500);

    return () => clearTimeout(splashTimer);
  }, []);

  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <div className="App">
              {showSplash && <SplashScreen show={showSplash} />}

              <div className={renderMain ? "bk-main-content-fade" : "hidden-content"} style={{ opacity: renderMain ? 1 : 0 }}>
                <Navigation />
                <Routes>
                  <Route path="/" element={<Navigate to="/shop" />} />
                  <Route path="/shop" element={<ProductList />} />
                  <Route path="/cart" element={<NonAdminRoute><Cart /></NonAdminRoute>} />
                  <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                  <Route path="/my-orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute adminOnly={true}><Admin /></ProtectedRoute>} />
                </Routes>
              </div>
            </div>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
