import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert, Text } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export default function RegisterScreen({ navigation }) {
  // States for user inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('worker'); // Default role is 'worker'
  const [contractType, setContractType] = useState('CDD'); // Default contract type for workers

  const handleRegister = async () => {
    if (!email || !password || !firstName || !lastName) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Prepare user data for Firestore
      const userData = {
        firstName,
        lastName,
        email,
        role,
      };

      // Add contract type only for workers
      if (role === 'worker') {
        userData.contractType = contractType;
      }

      // Save user data to Firestore
      await setDoc(doc(db, 'users', user.uid), userData);

      Alert.alert('Success', 'Account created successfully!');
      navigation.navigate('Login'); // Redirect to login screen
    } catch (error) {
      Alert.alert('Registration Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput placeholder="First Name" value={firstName} onChangeText={setFirstName} style={styles.input} />
      <TextInput placeholder="Last Name" value={lastName} onChangeText={setLastName} style={styles.input} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />

      <Text style={styles.label}>Role</Text>
      <Picker selectedValue={role} onValueChange={(itemValue) => setRole(itemValue)} style={styles.picker}>
        <Picker.Item label="Worker" value="worker" />
        <Picker.Item label="Manager" value="manager" />
      </Picker>

      {role === 'worker' && (
        <>
          <Text style={styles.label}>Contract Type</Text>
          <Picker selectedValue={contractType} onValueChange={(itemValue) => setContractType(itemValue)} style={styles.picker}>
            <Picker.Item label="CDD" value="CDD" />
            <Picker.Item label="CDI" value="CDI" />
            <Picker.Item label="Student" value="Student" />
          </Picker>
        </>
      )}

      <Button title="Register" onPress={handleRegister} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  picker: {
    height: 50,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
});
