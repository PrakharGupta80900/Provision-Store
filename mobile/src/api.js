import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = 'http://localhost:5000/api';

const authConfig = async () => {
  const token = await AsyncStorage.getItem('token');
  return { headers: { 'x-auth-token': token } };
};

export const fetchProducts = async () => {
  try {
    const response = await axios.get(`${API_URL}/products`);
    return response.data;
  } catch {
    return [];
  }
};

export const placeOrder = async (orderData) => {
  try {
    const config = await authConfig();
    const response = await axios.post(`${API_URL}/orders`, orderData, config);
    return response.data;
  } catch {
    return null;
  }
};

export const fetchOrders = async () => {
  try {
    const config = await authConfig();
    const response = await axios.get(`${API_URL}/orders`, config);
    return response.data;
  } catch {
    return [];
  }
};

export const fetchMyOrders = async () => {
  try {
    const config = await authConfig();
    const response = await axios.get(`${API_URL}/orders/myorders`, config);
    return response.data;
  } catch {
    return [];
  }
};

export const updateOrderStatus = async (id, status) => {
  try {
    const config = await authConfig();
    const response = await axios.put(`${API_URL}/orders/${id}/status`, { status }, config);
    return response.data;
  } catch (error) {
    return { error: error.response?.data?.msg || 'Failed to update status' };
  }
};

export const fetchUserProfile = async () => {
  try {
    const config = await authConfig();
    const response = await axios.get(`${API_URL}/auth/profile`, config);
    return response.data;
  } catch {
    return null;
  }
};

export const updateUserProfile = async (userData) => {
  try {
    const config = await authConfig();
    const response = await axios.put(`${API_URL}/auth/profile`, userData, config);
    return response.data;
  } catch {
    return null;
  }
};

export const loginApi = async (email, password) => {
  const response = await axios.post(`${API_URL}/auth/login`, { email, password });
  return response.data;
};

export const registerApi = async (name, email, password) => {
  const response = await axios.post(`${API_URL}/auth/register`, { name, email, password });
  return response.data;
};

export const sendOtp = async (email) => {
  try {
    const response = await axios.post(`${API_URL}/auth/send-otp`, { email });
    return { success: true, msg: response.data.msg };
  } catch (error) {
    return { success: false, msg: error.response?.data?.msg || 'Failed to send OTP' };
  }
};

export const verifyOtp = async (email, otp) => {
  try {
    const response = await axios.post(`${API_URL}/auth/verify-otp`, { email, otp });
    return { success: true, msg: response.data.msg };
  } catch (error) {
    return { success: false, msg: error.response?.data?.msg || 'Invalid OTP' };
  }
};
