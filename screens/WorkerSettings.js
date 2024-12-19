import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function WorkerSettings({navigation}) {

  const handleNavigateToWelcomeScreen = () => {
    navigation.navigate('Welcome');
  };
  
  return (
    <View style={styles.container}>
      {/* En-tête avec image et infos utilisateur */}
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://via.placeholder.com/100' }} // Image de profil fictive
          style={styles.profileImage}
        />
        <Text style={styles.userName}>John Doe</Text>
        <Text style={styles.userEmail}>johndoe@gmail.com</Text>
      </View>

      {/* Options de navigation */}
      <View style={styles.options}>
        <TouchableOpacity style={styles.option} onPress={() => alert('Ouvrir les paramètres')}>
          <Ionicons name="settings-outline" size={24} color="#4CAF50" />
          <Text style={styles.optionText}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option} onPress={handleNavigateToWelcomeScreen}>
          <Ionicons name="log-out-outline" size={24} color="#FF5733" />
          <Text style={[styles.optionText, { color: '#FF5733' }]}>Uitloggen</Text>
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
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
  },
  options: {
    flex: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionText: {
    fontSize: 18,
    marginLeft: 10,
    fontWeight: '500',
    color: '#333',
  },
});
