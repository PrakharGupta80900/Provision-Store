import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

const ScreenContainer = ({ children }) => {
  return <SafeAreaView style={styles.container}>{children}</SafeAreaView>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  }
});

export default ScreenContainer;
