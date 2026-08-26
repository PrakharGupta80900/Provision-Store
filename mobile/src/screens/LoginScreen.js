import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async () => {
    const res = await login(email, password);
    if (!res.success) {
      Alert.alert('Login failed', res.msg);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.wrap}>
        <Text style={styles.title}>Provision Store Login</Text>
        <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <Button title="Login" onPress={onSubmit} />
        <View style={styles.spacer} />
        <Button title="Create account" onPress={() => navigation.navigate('Signup')} />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, justifyContent: 'center', gap: 10 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12 },
  spacer: { height: 10 }
});

export default LoginScreen;
