import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from './api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (token && userData) {
            setUser(JSON.parse(userData));
            axios.defaults.headers.common['x-auth-token'] = token;
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const res = await axios.post(`${API_URL}/auth/login`, { email, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setUser(res.data.user);
            axios.defaults.headers.common['x-auth-token'] = res.data.token;
            return { success: true };
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.msg || "Login failed. Server might be unreachable.";
            return { success: false, msg };
        }
    };

    const register = async (name, email, password) => {
        try {
            const res = await axios.post(`${API_URL}/auth/register`, { name, email, password });
            // Auto-login
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setUser(res.data.user);
            axios.defaults.headers.common['x-auth-token'] = res.data.token;
            return { success: true };
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.msg || err.response?.data?.error || "Registration failed. Server might be unreachable.";
            return { success: false, msg };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        delete axios.defaults.headers.common['x-auth-token'];
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
