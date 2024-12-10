import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PendingApprovalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>
        Your account is awaiting manager approval. Please wait until your account is activated.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    color: '#555',
  },
});
