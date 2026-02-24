import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../AuthContext';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const { login } = useContext(AuthContext);
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

    return (
        <div className="bk-auth-page">
            <div className="bk-auth-card">
                <div className="bk-auth-header">
                    <div className="bk-auth-logo">⚡ Gk provision Store</div>
                    <div className="bk-auth-tagline">Your neighbourhood provision store</div>
                </div>

                <div className="bk-auth-body">
                    <h2>Welcome back 👋</h2>

                    {error && <div className="bk-auth-error">{error}</div>}

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
                        className="bk-auth-submit"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Login →'}
                    </button>
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
