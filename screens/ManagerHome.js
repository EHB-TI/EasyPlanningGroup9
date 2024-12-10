import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function ManagerHome({ navigation }) {
  const handleLogout = () => {
    // Logic to log out the user
    navigation.navigate('Login'); // Redirect to Login after logout
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manager Dashboard</Text>
      <Text style={styles.text}>Welcome! Manage your workers and shifts here.</Text>

      {/* Button example to manage shifts */}
      <View style={styles.buttonContainer}>
        <Button title="Manage Shifts" onPress={() => alert('Manage shifts feature coming soon!')} />
      </View>

      {/* Button example to manage workers */}
      <View style={styles.buttonContainer}>
        <Button title="Manage Workers" onPress={() => alert('Manage workers feature coming soon!')} />
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
