// app/(tabs)/Medications.jsx
import { View, Text, StyleSheet } from 'react-native';
import React from 'react';

export default function Medications() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medications</Text>
      <Text style={styles.subtitle}>Your medications will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'gray',
  },
});