import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { placeOrder } from '../api';
import { useCart } from '../contexts/CartContext';

const CheckoutScreen = ({ navigation }) => {
  const { cart, total, clearCart } = useCart();
  const [customerName, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [slot, setSlot] = useState('today');

  const submit = async () => {
    const result = await placeOrder({
      customerName,
      email,
      address,
      phone,
      deliverySlot: slot,
      items: cart
    });

    if (!result?.orderId) {
      Alert.alert('Order failed', 'Please try again.');
      return;
    }

    clearCart();
    Alert.alert('Success', `Order placed: ${result.orderId}`);
    navigation.navigate('Shop');
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.title}>Checkout</Text>
        <TextInput style={styles.input} placeholder="Full name" value={customerName} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Address" value={address} onChangeText={setAddress} multiline />
        <TextInput style={styles.input} placeholder="Phone" value={phone} onChangeText={setPhone} />

        <View style={styles.slotRow}>
          {['within_1hr', 'today', 'tomorrow'].map((s) => (
            <Pressable key={s} onPress={() => setSlot(s)} style={[styles.slot, slot === s && styles.slotActive]}>
              <Text style={slot === s ? styles.slotActiveText : styles.slotText}>{s.replace('_', ' ')}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.total}>Items total: ?{total.toFixed(2)}</Text>
        <Pressable style={styles.placeBtn} onPress={submit}>
          <Text style={styles.placeText}>Place Order</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 10 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12 },
  slotRow: { flexDirection: 'row', gap: 8 },
  slot: { backgroundColor: '#fff', borderRadius: 8, padding: 10 },
  slotActive: { backgroundColor: '#0c831f' },
  slotText: { color: '#333' },
  slotActiveText: { color: '#fff', fontWeight: '700' },
  total: { marginTop: 6, fontWeight: '700' },
  placeBtn: { marginTop: 10, backgroundColor: '#0c831f', borderRadius: 10, padding: 12, alignItems: 'center' },
  placeText: { color: '#fff', fontWeight: '800' }
});

export default CheckoutScreen;
