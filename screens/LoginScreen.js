import React, { useState } from 'react';
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Import pour l'icône de retour et visibilité
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setPasswordVisible] = useState(false);

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (userData.status === 'pending') {
          Alert.alert('Account Pending', 'Your account is awaiting approval from a manager.');
          navigation.navigate('PendingApproval');
        } else if (userData.role === 'manager') {
          navigation.navigate('ManagerHome');
        } else if (userData.role === 'worker') {
          navigation.navigate('WorkerHome');
        } else {
          Alert.alert('Error', 'Invalid role assigned to this account.');
        }
      } else {
        Alert.alert('Error', 'User data not found.');
      }
    } catch (error) {
      Alert.alert('Login Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.loginBox}>
        {/* Flèche de retour */}
        <TouchableOpacity
          style={styles.backArrow}
          onPress={() => navigation.navigate('Welcome')}
        >
          <Ionicons name="arrow-back" size={24} color="#4CAF50" />
        </TouchableOpacity>

        <Text style={styles.title}>Login</Text>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="E-mail"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!isPasswordVisible}
            style={styles.input}
          />
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={() => setPasswordVisible(!isPasswordVisible)}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye' : 'eye-off'}
              size={24}
              color="gray"
            />
          </TouchableOpacity>
        </View>

        {/* Login Button */}
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        {/* Forgot Password */}
        <TouchableOpacity onPress={() => Alert.alert('Forgot Password', 'Functionality not implemented')}>
          <Text style={styles.forgotPassword}>Wachtwoord vergeten?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E7F5FE', // Couleur de fond de la page
  },
  loginBox: {
    width: '90%',
    backgroundColor: '#FFFFFF', // Fond blanc pour la boîte
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  backArrow: {
    position: 'absolute',
    top: 30,
    left: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50', // Couleur verte pour le titre
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
    position: 'relative', // Pour placer l'icône dans le champ de mot de passe
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#F6F6F6',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    position: 'absolute',
    right: 15,
    top: 13,
  },
  loginButton: {
    backgroundColor: '#4CAF50', // Couleur verte pour le bouton
    width: '100%',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgotPassword: {
    color: '#000000',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
