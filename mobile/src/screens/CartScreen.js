import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useCart } from '../contexts/CartContext';

const CartScreen = ({ navigation }) => {
  const { cart, addToCart, removeFromCart, total } = useCart();

  if (!cart.length) {
    return (
      <ScreenContainer>
        <View style={styles.empty}><Text style={styles.emptyText}>Cart is empty</Text></View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.wrap}>
        <FlatList
          data={cart}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text>?{item.price} x {item.quantity}</Text>
              </View>
              <View style={styles.qtyWrap}>
                <Pressable onPress={() => removeFromCart(item._id, true)} style={styles.qtyBtn}><Text>-</Text></Pressable>
                <Text>{item.quantity}</Text>
                <Pressable onPress={() => addToCart(item)} style={styles.qtyBtn}><Text>+</Text></Pressable>
              </View>
            </View>
          )}
        />
        <View style={styles.footer}>
          <Text style={styles.total}>Total: ?{total.toFixed(2)}</Text>
          <Pressable style={styles.checkoutBtn} onPress={() => navigation.navigate('Checkout')}>
            <Text style={styles.checkoutText}>Checkout</Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 12 },
  row: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 8, padding: 12, flexDirection: 'row', alignItems: 'center' },
  name: { fontWeight: '700', marginBottom: 2 },
  qtyWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { backgroundColor: '#e5e5e5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  footer: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 6 },
  total: { fontWeight: '800', fontSize: 16, marginBottom: 8 },
  checkoutBtn: { backgroundColor: '#0c831f', padding: 12, borderRadius: 8, alignItems: 'center' },
  checkoutText: { color: '#fff', fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 18, fontWeight: '700' }
});

export default CartScreen;
