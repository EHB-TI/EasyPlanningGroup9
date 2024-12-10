import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function WorkerHome({ navigation }) {
  const handleLogout = () => {
    // Logic to log out the user
    navigation.navigate('Login'); // Redirect to Login after logout
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Worker Dashboard</Text>
      <Text style={styles.text}>Welcome! Here are your shifts and tasks.</Text>

      {/* Button example to view available shifts */}
      <View style={styles.buttonContainer}>
        <Button title="View Shifts" onPress={() => alert('Shifts feature coming soon!')} />
      </View>

      {/* Button to log out */}
      <View style={styles.buttonContainer}>
        <Button title="Logout" onPress={handleLogout} />
      </View>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 10,
    width: '80%',
  },
});
