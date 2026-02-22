import React, { createContext, useState, useContext } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState([]);

    const addToCart = (product) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item._id === product._id);
            if (existingItem) {
                return prevCart.map((item) =>
                    item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevCart, { ...product, quantity: 1 }];
        });
    };

    // decrement = true means reduce qty by 1 (remove item if qty reaches 0)
    const removeFromCart = (productId, decrement = false) => {
        setCart((prevCart) => {
            if (decrement) {
                return prevCart
                    .map((item) =>
                        item._id === productId ? { ...item, quantity: item.quantity - 1 } : item
                    )
                    .filter((item) => item.quantity > 0);
            }
            return prevCart.filter((item) => item._id !== productId);
        });
    };

    const clearCart = () => {
        setCart([]);
    };

    const syncCartWithProducts = (freshProducts) => {
        setCart((prevCart) => {
            return prevCart.map((item) => {
                const fresh = freshProducts.find((p) => p._id === item._id);
                if (fresh) {
                    // Update metadata but keep current cart quantity
                    return { ...item, price: fresh.price, stock: fresh.stock, name: fresh.name, imageUrl: fresh.imageUrl, unitQuantity: fresh.unitQuantity };
                }
                return item;
            });
        });
    };

    const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, syncCartWithProducts, total }}>
            {children}
        </CartContext.Provider>
    );
};
