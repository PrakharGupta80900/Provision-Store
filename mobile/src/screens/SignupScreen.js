import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../contexts/AuthContext';
import { sendOtp, verifyOtp } from '../api';

const SignupScreen = () => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const requestOtp = async () => {
    const res = await sendOtp(email);
    if (!res.success) return Alert.alert('OTP', res.msg);
    setOtpSent(true);
    Alert.alert('OTP sent', res.msg);
  };

  const onRegister = async () => {
    const verified = await verifyOtp(email, otp);
    if (!verified.success) return Alert.alert('OTP invalid', verified.msg);
    const res = await register(name, email, password);
    if (!res.success) return Alert.alert('Registration failed', res.msg);
  };

  return (
    <ScreenContainer>
      <View style={styles.wrap}>
        <Text style={styles.title}>Create Account</Text>
        <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
        {!otpSent ? (
          <Button title="Send OTP" onPress={requestOtp} />
        ) : (
          <>
            <TextInput style={styles.input} placeholder="OTP" keyboardType="number-pad" value={otp} onChangeText={setOtp} />
            <Button title="Verify & Register" onPress={onRegister} />
          </>
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, justifyContent: 'center', gap: 10 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12 }
});

export default SignupScreen;
