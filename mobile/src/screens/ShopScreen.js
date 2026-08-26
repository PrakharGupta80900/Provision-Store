import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { fetchProducts } from '../api';
import { CATEGORIES } from '../constants';
import { useCart } from '../contexts/CartContext';

const ShopScreen = ({ navigation }) => {
  const { addToCart, cart } = useCart();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    fetchProducts().then(setProducts);
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category ? p.category === category : true;
      return matchSearch && matchCategory;
    });
  }, [products, search, category]);

  const itemsInCart = cart.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Provision Store</Text>
        <Pressable onPress={() => navigation.navigate('Cart')} style={styles.cartBtn}>
          <Text style={styles.cartText}>Cart ({itemsInCart})</Text>
        </Pressable>
      </View>
      <View style={styles.wrap}>
        <TextInput style={styles.input} placeholder="Search products" value={search} onChangeText={setSearch} />
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item.label}
          style={styles.catList}
          renderItem={({ item }) => (
            <Pressable style={[styles.catChip, category === item.value && styles.catChipActive]} onPress={() => setCategory(item.value)}>
              <Text style={styles.catText}>{item.emoji} {item.label}</Text>
            </Pressable>
          )}
        />
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.unitQuantity || item.unit || 'unit'}</Text>
                <Text style={styles.price}>?{item.price}</Text>
              </View>
              <Pressable style={styles.addBtn} onPress={() => addToCart(item)}>
                <Text style={styles.addText}>Add</Text>
              </Pressable>
            </View>
          )}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', color: '#0c831f' },
  cartBtn: { backgroundColor: '#0c831f', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  cartText: { color: '#fff', fontWeight: '700' },
  wrap: { flex: 1, padding: 12, gap: 10 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12 },
  catList: { maxHeight: 50 },
  catChip: { backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  catChipActive: { backgroundColor: '#d8f5de' },
  catText: { fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { color: '#666', marginTop: 2 },
  price: { marginTop: 4, fontWeight: '800' },
  addBtn: { backgroundColor: '#0c831f', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addText: { color: '#fff', fontWeight: '700' }
});

export default ShopScreen;
