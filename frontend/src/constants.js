export const CATEGORIES = [
    { label: 'All Items', emoji: '🛍️', value: '' },
    { label: 'Grains & Rice', emoji: '🌾', value: 'Grains & Rice' },
    { label: 'Pulses & Lentils', emoji: '🫘', value: 'Pulses & Lentils' },
    { label: 'Dairy', emoji: '🥛', value: 'Dairy' },
    { label: 'Snacks', emoji: '🍪', value: 'Snacks' },
    { label: 'Beverages', emoji: '☕', value: 'Beverages' },
    { label: 'Household Items', emoji: '🏠', value: 'Household Items' },
    { label: 'Personal Care', emoji: '🧴', value: 'Personal Care' },
    { label: 'Spices', emoji: '🌶️', value: 'Spices' },
    { label: 'Oils & Ghee', emoji: '🫙', value: 'Oils & Ghee' },
    { label: 'Vegetables', emoji: '🥦', value: 'Vegetables' },
    { label: 'Fruits', emoji: '🍎', value: 'Fruits' },
];

// Only the real categories (excluding "All Items") — for product forms
export const PRODUCT_CATEGORIES = CATEGORIES.filter(c => c.value !== '');
