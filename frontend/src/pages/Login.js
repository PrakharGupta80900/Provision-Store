import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../AuthContext';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const { login, loginWithGoogle } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const res = await login(formData.email, formData.password);
        setLoading(false);
        if (res.success) {
            if (res.isAdmin) {
                navigate('/admin');
            } else {
                navigate('/shop');
            }
        } else {
            setError(res.msg || 'Login failed. Please check your credentials.');
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        const res = await loginWithGoogle();
        setLoading(false);
        if (res.success) {
            if (res.isAdmin) {
                navigate('/admin');
            } else {
                navigate('/shop');
            }
        } else {
            setError(res.msg || 'Google Login failed.');
        }
    };

    return (
        <div className="bk-auth-page">
            <div className="bk-auth-card">
                <div className="bk-auth-header">
                    <div className="bk-auth-logo">Gk provision Store</div>
                    <div className="bk-auth-tagline">Your neighbourhood provision store</div>
                </div>

                <div className="bk-auth-body">
                    <h2>Welcome back</h2>

                    {error && <div className="bk-auth-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="bk-form-field">
                            <label className="bk-form-label">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                className="bk-form-input"
                                placeholder="you@example.com"
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="bk-form-field">
                            <label className="bk-form-label">Password</label>
                            <input
                                type="password"
                                name="password"
                                className="bk-form-input"
                                placeholder="Enter your password"
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="bk-auth-submit"
                            disabled={loading}
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
                            <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
                            <span style={{ padding: '0 10px', color: '#64748b', fontSize: '14px', fontWeight: 500 }}>OR</span>
                            <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#1e293b',
                                fontSize: '16px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                transition: 'background-color 0.2s',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                        >
                            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                                <path fill="none" d="M0 0h48v48H0z"/>
                            </svg>
                            Continue with Google
                        </button>
                    </form>
                </div>

                <div className="bk-auth-footer">
                    Don't have an account?{' '}
                    <Link to="/signup">Create account</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
