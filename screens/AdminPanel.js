import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AdminPanel = ({ navigation }) => {
  // Exemple de données
  const data = [
    {
      title: 'Fixed term',
      date: 'December 7, 2024',
      users: [
        {
          id: 1,
          name: 'Cedric Dupont',
          gender: 'Male',
          address: '123 Street, City',
          phone: 'xxxxxxxxxx',
          contract: 'Fixed term',
          fixDay: 'Friday',
        },
        {
          id: 2,
          name: 'Patrick John',
          gender: 'Male',
          address: '456 Avenue, City',
          phone: 'xxxxxxxxxx',
          contract: 'Fixed term',
          fixDay: 'Monday',
        },
      ],
    },
    {
      title: 'Permanent - term',
      date: 'December 15, 2024',
      users: [
        {
          id: 3,
          name: 'Abdel Grolet',
          gender: 'Male',
          address: '789 Boulevard, City',
          phone: 'xxxxxxxxxx',
          contract: 'Permanent',
          fixDay: 'Friday',
        },
      ],
    },
    {
      title: 'Student',
      date: null,
      users: [
        {
          id: 4,
          name: 'Yassine Lakdimi',
          gender: 'Male',
          address: '101 Road, City',
          phone: 'xxxxxxxxxx',
          contract: 'Student',
          fixDay: 'Friday',
        },
      ],
    },
  ];

  const handleModify = (user) => {
    Alert.alert('Modify User', `You are editing ${user.name}`);
  };

  const handleDelete = (user) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* StatusBar */}
      <StatusBar barStyle="dark-content" backgroundColor="#EAF6F6" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {data.map((section, index) => (
          <View key={index} style={styles.section}>
            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.date && <Text style={styles.sectionDate}>{section.date}</Text>}
            </View>
            {section.users.map((user) => (
              <View key={user.id} style={styles.card}>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{user.name}</Text>
                  <Text style={styles.cardDetails}>Gender: {user.gender}</Text>
                  <Text style={styles.cardDetails}>Address: {user.address}</Text>
                  <Text style={styles.cardDetails}>Phone: {user.phone}</Text>
                  <Text style={styles.cardDetails}>Contract: {user.contract}</Text>
                  <Text style={styles.cardDetails}>Fix Day: {user.fixDay}</Text>
                </View>
                {/* Action Buttons */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.modifyButton}
                    onPress={() => handleModify(user)}
                  >
                    <Text style={styles.buttonText}>Modify</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(user)}
                  >
                    <Text style={styles.buttonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF6F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 15,
    backgroundColor: '#EAF6F6',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27AE60',
    marginLeft: 10,
  },
  content: {
    paddingHorizontal: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionDate: {
    fontSize: 14,
    color: '#555',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cardDetails: {
    fontSize: 14,
    color: '#555',
    marginVertical: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modifyButton: {
    backgroundColor: '#27AE60',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    flex: 1,
    marginRight: 5,
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    flex: 1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default AdminPanel;
