import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function WorkerInstellingen({ navigation }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleLanguageChange = () => {
    Alert.alert(
      'Taal wijzigen',
      'Taalkeuze-functionaliteit moet worden geïmplementeerd.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacybeleid',
      'Link naar privacybeleid moet hier worden toegevoegd.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const dynamicStyles = styles(isDarkMode);

  return (
    <View style={dynamicStyles.container}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={dynamicStyles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#FFF' : '#333'} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Instellingen</Text>
        <View style={{ width: 24 }} /> {/* Placeholder for symmetry */}
      </View>

      {/* Notifications */}
      <View style={dynamicStyles.settingRow}>
        <Text style={dynamicStyles.settingText}>Notificaties</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={(value) => setNotificationsEnabled(value)}
        />
      </View>

      {/* Dark Mode */}
      <View style={dynamicStyles.settingRow}>
        <Text style={dynamicStyles.settingText}>Donkere modus</Text>
        <Switch value={isDarkMode} onValueChange={(value) => setIsDarkMode(value)} />
      </View>

      {/* Language */}
      <TouchableOpacity style={dynamicStyles.settingRow} onPress={handleLanguageChange}>
        <Text style={dynamicStyles.settingText}>Taal</Text>
        <Ionicons name="chevron-forward" size={24} color={isDarkMode ? '#4CAF50' : '#333'} />
      </TouchableOpacity>

      {/* Privacy Policy */}
      <TouchableOpacity style={dynamicStyles.settingRow} onPress={handlePrivacyPolicy}>
        <Text style={dynamicStyles.settingText}>Privacybeleid</Text>
        <Ionicons name="chevron-forward" size={24} color={isDarkMode ? '#4CAF50' : '#333'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = (isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
      paddingHorizontal: 20,
      paddingTop: 50,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 30,
    },
    backButton: {
      padding: 10,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDarkMode ? '#FFFFFF' : '#333',
      textAlign: 'center',
      flex: 1,
      marginLeft: -24, // Adjusts for the back button width
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#444' : '#E0E0E0',
    },
    settingText: {
      fontSize: 18,
      color: isDarkMode ? '#FFFFFF' : '#333333',
    },
  });
