import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('cart');
      if (saved) setCart(JSON.parse(saved));
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    setCart((prev) => {
      const found = prev.find((i) => i._id === product._id);
      if (found) return prev.map((i) => i._id === product._id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id, decrease = false) => {
    setCart((prev) => {
      if (!decrease) return prev.filter((i) => i._id !== id);
      return prev
        .map((i) => i._id === id ? { ...i, quantity: i.quantity - 1 } : i)
        .filter((i) => i.quantity > 0);
    });
  };

  const clearCart = () => setCart([]);
  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
