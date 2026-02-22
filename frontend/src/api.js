import axios from 'axios';

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const uploadProductImage = async (file) => {
    try {
        const token = localStorage.getItem('token');
        const form = new FormData();
        form.append('image', file);
        const response = await axios.post(`${API_URL}/upload/product-image`, form, {
            headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' }
        });
        return response.data.imageUrl;
    } catch (error) {
        console.error("Error uploading image:", error);
        return null;
    }
};

export const fetchProducts = async () => {
    try {
        const response = await axios.get(`${API_URL}/products`);
        return response.data;
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
};

export const placeOrder = async (orderData) => {
    try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        const response = await axios.post(`${API_URL}/orders`, orderData, config);
        return response.data;
    } catch (error) {
        console.error("Error placing order:", error);
        return null;
    }
};

export const fetchOrders = async () => {
    try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        const response = await axios.get(`${API_URL}/orders`, config);
        return response.data;
    } catch (error) {
        console.error("Error fetching orders:", error);
        return [];
    }
};

export const fetchMyOrders = async () => {
    try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        const response = await axios.get(`${API_URL}/orders/myorders`, config);
        return response.data;
    } catch (error) {
        console.error("Error fetching my orders:", error);
        return [];
    }
};

export const addProduct = async (productData) => {
    try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        const response = await axios.post(`${API_URL}/products`, productData, config);
        return response.data;
    } catch (error) {
        console.error("Error adding product:", error);
        return { error: error.response?.data?.message || error.message || "Failed to add product" };
    }
};

export const updateProduct = async (id, productData) => {
    try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        const response = await axios.put(`${API_URL}/products/${id}`, productData, config);
        return response.data;
    } catch (error) {
        console.error("Error updating product:", error);
        return { error: error.response?.data?.message || error.message || "Failed to update product" };
    }
};

export const deleteProduct = async (id) => {
    try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        await axios.delete(`${API_URL}/products/${id}`, config);
        return true;
    } catch (error) {
        console.error("Error deleting product:", error);
        return false;
    }
};

export const fetchUserProfile = async () => {
    try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        const response = await axios.get(`${API_URL}/auth/profile`, config);
        return response.data;
    } catch (error) {
        console.error("Error fetching profile:", error);
        return null;
    }
};

export const updateUserProfile = async (userData) => {
    try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        const response = await axios.put(`${API_URL}/auth/profile`, userData, config);
        return response.data;
    } catch (error) {
        console.error("Error updating profile:", error);
        return null;
    }
};

export const updateOrderStatus = async (id, status) => {
    try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        const response = await axios.put(`${API_URL}/orders/${id}/status`, { status }, config);
        return response.data;
    } catch (error) {
        console.error("Error updating order status:", error);
        return { error: error.response?.data?.msg || error.message || "Failed to update status" };
    }
};

export const sendOtp = async (email) => {
    try {
        const response = await axios.post(`${API_URL}/auth/send-otp`, { email });
        return { success: true, msg: response.data.msg };
    } catch (error) {
        return { success: false, msg: error.response?.data?.msg || error.response?.data?.error || "Failed to send OTP" };
    }
};

export const verifyOtp = async (email, otp) => {
    try {
        const response = await axios.post(`${API_URL}/auth/verify-otp`, { email, otp });
        return { success: true, msg: response.data.msg };
    } catch (error) {
        return { success: false, msg: error.response?.data?.msg || "Invalid or expired OTP" };
    }
};

