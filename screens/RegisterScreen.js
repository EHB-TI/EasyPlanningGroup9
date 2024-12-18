import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert, Text, TouchableOpacity } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set, get } from 'firebase/database';
import { auth } from '../firebaseConfig'; // Firebase configuratie importeren

export default function RegisterScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {
    if (!firstName || !lastName || !phone || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }
  
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
  
    try {
      // Stap 1: Gebruiker registreren in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Stap 2: Realtime Database referentie
      const db = getDatabase();
      const usersRef = ref(db, 'users');
  
      // Stap 3: Genereer oplopende user_id
      const snapshot = await get(usersRef);
      let userId = 1; // Start bij user_id_1
      if (snapshot.exists()) {
        const users = snapshot.val();
        userId = Object.keys(users).length + 1; // Bereken volgende user_id
      }
  
      // Stap 4: Voeg de gebruiker toe aan de Realtime Database
      await set(ref(db, `users/user_id_${userId}`), {
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        role: 'worker', // Standaard waarde
        sap_number: 'SAP123456', // Standaard waarde
        status: 'pending', // Standaard waarde
      });
  
      // Bevestiging
      Alert.alert('Success', 'Account created successfully!');
      navigation.navigate('Home'); // Of je navigatie naar een andere pagina
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      <TextInput
        placeholder="First Name"
        value={firstName}
        onChangeText={setFirstName}
        style={styles.input}
      />
      <TextInput
        placeholder="Last Name"
        value={lastName}
        onChangeText={setLastName}
        style={styles.input}
      />
      <TextInput
        placeholder="Phone"
        value={phone}
        onChangeText={setPhone}
        style={styles.input}
        keyboardType="phone-pad"
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />
      <TextInput
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={styles.input}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Create</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0faff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  button: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
