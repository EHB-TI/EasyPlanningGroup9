import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';

export default function ManagerMeer({ navigation }) {
  const [user, setUser] = useState({ first_name: '', last_name: '', email: '' });
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const database = getDatabase();

  useEffect(() => {
    if (currentUser) {
      fetchUser(currentUser.uid);
    }
  }, [currentUser]);

  const fetchUser = async (userId) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        setUser(snapshot.val());
      } else {
        console.log('User not found.');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Afmelden',
      'Weet je zeker dat je wilt afmelden?',
      [
        { text: 'Nee', style: 'cancel' },
        {
          text: 'Ja',
          onPress: () => {
            auth.signOut();
            navigation.navigate('Welcome');
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleInstellingen = () => 
    {

      navigation.navigate('WorkerInstellingen');

    };

  const getUserInitials = () => {
    const firstNameInitial = user.first_name ? user.first_name.charAt(0).toUpperCase() : '';
    const lastNameInitial = user.last_name ? user.last_name.charAt(0).toUpperCase() : '';
    return `${firstNameInitial}${lastNameInitial}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profileIcon}>
          <Text style={styles.profileInitial}>{getUserInitials()}</Text>
        </View>
        <Text style={styles.userName}>
          {user.first_name} {user.last_name}
        </Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>

      {/* Navigation options */}
      <View style={styles.options}>
        <TouchableOpacity
          style={styles.option}
          onPress={handleInstellingen}
        >
          <Ionicons name="settings-outline" size={24} color="#4CAF50" />
          <Text style={styles.optionText}>Instellingen</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF5733" />
          <Text style={[styles.optionText, { color: '#FF5733' }]}>Afmelden</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 20,
  },
  profileIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileInitial: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  options: {
    flex: 1,
    marginTop: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionText: {
    fontSize: 18,
    marginLeft: 15,
    fontWeight: '500',
    color: '#333',
  },
});
