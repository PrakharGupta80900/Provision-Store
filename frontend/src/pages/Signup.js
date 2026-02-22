import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../AuthContext';
import { sendOtp, verifyOtp } from '../api';

/* ── Password rules ── */
const RULES = [
    { id: 'len', label: 'At least 8 characters', test: p => p.length >= 8 },
    { id: 'upper', label: 'At least one uppercase letter', test: p => /[A-Z]/.test(p) },
    { id: 'num', label: 'At least one number', test: p => /[0-9]/.test(p) },
    { id: 'spec', label: 'At least one special character', test: p => /[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?]/.test(p) },
];

const OTP_TIMEOUT = 10 * 60; // 10 minutes in seconds

const Signup = () => {
    const [step, setStep] = useState(1); // 1 = form, 2 = OTP
    const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [countdown, setCountdown] = useState(0); // seconds remaining
    const [passwordFocused, setPasswordFocused] = useState(false);

    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    /* ── Countdown timer ── */
    useEffect(() => {
        if (countdown <= 0) return;
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    const formatCountdown = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    /* ── Password validation ── */
    const ruleResults = RULES.map(r => ({ ...r, passed: r.test(formData.password) }));
    const passwordValid = ruleResults.every(r => r.passed);
    const passwordsMatch = formData.password === formData.confirmPassword;
    const formComplete = formData.name.trim() && formData.email.trim() && passwordValid && passwordsMatch;

    /* ── Step 1: Send OTP ── */
    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!formComplete) return;
        setOtpLoading(true);
        setError('');
        const res = await sendOtp(formData.email);
        setOtpLoading(false);
        if (res.success) {
            setStep(2);
            setCountdown(OTP_TIMEOUT);
            setSuccess('OTP sent! Check your email inbox.');
        } else {
            setError(res.msg);
        }
    };

    /* ── Resend OTP ── */
    const handleResend = async () => {
        setOtpLoading(true);
        setError('');
        setSuccess('');
        const res = await sendOtp(formData.email);
        setOtpLoading(false);
        if (res.success) {
            setCountdown(OTP_TIMEOUT);
            setSuccess('New OTP sent! Check your inbox.');
            setOtp('');
        } else {
            setError(res.msg);
        }
    };

    /* ── Step 2: Verify OTP + Register ── */
    const handleVerify = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) { setError('Please enter the 6-digit OTP'); return; }
        setLoading(true);
        setError('');
        setSuccess('');

        // Verify OTP
        const verifyRes = await verifyOtp(formData.email, otp);
        if (!verifyRes.success) {
            setLoading(false);
            setError(verifyRes.msg);
            return;
        }

        // Register
        const regRes = await register(formData.name, formData.email, formData.password);
        setLoading(false);
        if (regRes.success) {
            navigate('/shop');
        } else {
            setError(regRes.msg || 'Registration failed. Please try again.');
        }
    };

    return (
        <div className="bk-auth-page">
            <div className="bk-auth-card">
                <div className="bk-auth-header">
                    <div className="bk-auth-logo">⚡ Gupta Kirana Store</div>
                    <div className="bk-auth-tagline">Your neighbourhood provision store</div>
                </div>

                <div className="bk-auth-body">
                    <h2>{step === 1 ? 'Create account 🛒' : 'Verify your email 📧'}</h2>

                    {/* Step indicator */}
                    <div className="bk-otp-steps">
                        <div className={`bk-otp-step ${step >= 1 ? 'active' : ''}`}>
                            <span className="bk-otp-step-num">1</span>
                            <span className="bk-otp-step-label">Details</span>
                        </div>
                        <div className="bk-otp-step-line" />
                        <div className={`bk-otp-step ${step >= 2 ? 'active' : ''}`}>
                            <span className="bk-otp-step-num">2</span>
                            <span className="bk-otp-step-label">Verify OTP</span>
                        </div>
                    </div>

                    {error && <div className="bk-auth-error">⚠️ {error}</div>}
                    {success && <div className="bk-auth-success">✅ {success}</div>}

                    {/* ── STEP 1: Details form ── */}
                    {step === 1 && (
                        <form onSubmit={handleSendOtp} autoComplete="off">
                            <div className="bk-form-field">
                                <label className="bk-form-label">Full Name</label>
                                <input
                                    type="text" name="name" className="bk-form-input"
                                    placeholder="Your name" value={formData.name}
                                    onChange={handleChange} required
                                />
                            </div>

                            <div className="bk-form-field">
                                <label className="bk-form-label">Email Address</label>
                                <input
                                    type="email" name="email" className="bk-form-input"
                                    placeholder="you@example.com" value={formData.email}
                                    onChange={handleChange} required
                                />
                            </div>

                            <div className="bk-form-field">
                                <label className="bk-form-label">Password</label>
                                <input
                                    type="password" name="password" className="bk-form-input"
                                    placeholder="Create a strong password" value={formData.password}
                                    onChange={handleChange} onFocus={() => setPasswordFocused(true)}
                                    required
                                />
                                {/* Live password rules */}
                                {(passwordFocused || formData.password) && (
                                    <div className="bk-pw-rules">
                                        {ruleResults.map(r => (
                                            <div key={r.id} className={`bk-pw-rule ${r.passed ? 'pass' : 'fail'}`}>
                                                <span className="bk-pw-rule-icon">{r.passed ? '✓' : '✗'}</span>
                                                {r.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="bk-form-field">
                                <label className="bk-form-label">Confirm Password</label>
                                <input
                                    type="password" name="confirmPassword" className="bk-form-input"
                                    placeholder="Repeat your password" value={formData.confirmPassword}
                                    onChange={handleChange} required
                                />
                                {formData.confirmPassword && !passwordsMatch && (
                                    <div className="bk-pw-rule fail" style={{ marginTop: 4 }}>
                                        <span className="bk-pw-rule-icon">✗</span> Passwords do not match
                                    </div>
                                )}
                                {formData.confirmPassword && passwordsMatch && (
                                    <div className="bk-pw-rule pass" style={{ marginTop: 4 }}>
                                        <span className="bk-pw-rule-icon">✓</span> Passwords match
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="bk-auth-submit"
                                disabled={!formComplete || otpLoading}
                            >
                                {otpLoading ? 'Sending OTP...' : 'Send OTP →'}
                            </button>
                        </form>
                    )}

                    {/* ── STEP 2: OTP verification ── */}
                    {step === 2 && (
                        <form onSubmit={handleVerify}>
                            <p className="bk-otp-hint">
                                A 6-digit OTP was sent to <strong>{formData.email}</strong>
                            </p>

                            <div className="bk-form-field">
                                <label className="bk-form-label">Enter OTP</label>
                                <input
                                    type="text"
                                    className="bk-form-input bk-otp-input"
                                    placeholder="• • • • • •"
                                    value={otp}
                                    onChange={e => { setOtp(e.target.value.replace(/\D/, '').slice(0, 6)); setError(''); }}
                                    maxLength={6}
                                    inputMode="numeric"
                                    autoFocus
                                />
                            </div>

                            {/* Countdown */}
                            {countdown > 0 ? (
                                <div className="bk-otp-countdown">
                                    OTP expires in <strong>{formatCountdown(countdown)}</strong>
                                </div>
                            ) : (
                                <div className="bk-otp-countdown expired">OTP expired</div>
                            )}

                            <button
                                type="submit"
                                className="bk-auth-submit"
                                disabled={loading || otp.length !== 6 || countdown <= 0}
                            >
                                {loading ? 'Verifying...' : 'Verify & Create Account →'}
                            </button>

                            <div className="bk-otp-resend">
                                Didn't receive it?{' '}
                                <button
                                    type="button"
                                    className="bk-otp-resend-btn"
                                    onClick={handleResend}
                                    disabled={otpLoading}
                                >
                                    {otpLoading ? 'Sending...' : 'Resend OTP'}
                                </button>
                            </div>

                            <button
                                type="button"
                                className="bk-otp-back"
                                onClick={() => { setStep(1); setOtp(''); setError(''); setSuccess(''); }}
                            >
                                ← Back to edit details
                            </button>
                        </form>
                    )}
                </div>

                <div className="bk-auth-footer">
                    Already have an account?{' '}
                    <Link to="/login">Login</Link>
                </div>
            </div>
        </div>
    );
};

export default Signup;
