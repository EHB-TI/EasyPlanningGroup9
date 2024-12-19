import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, SafeAreaView } from 'react-native';
import { getDatabase, ref, get, child } from 'firebase/database';

export default function ManagerHome({ navigation }) {
  const [pendingCount, setPendingCount] = useState(0);

  const handleNavigate = (screen) => {
    navigation.navigate(screen);
  };

  useEffect(() => {
    const fetchPendingUsers = async () => {
      try {
        const dbRef = ref(getDatabase());
        const snapshot = await get(child(dbRef, 'users'));

        if (snapshot.exists()) {
          const usersData = snapshot.val();
          const pendingUsers = Object.values(usersData).filter(user => user.status === 'pending');
          setPendingCount(pendingUsers.length);
        } else {
          setPendingCount(0);
        }
      } catch (error) {
        console.error('Error fetching pending users:', error);
      }
    };

    fetchPendingUsers();
  }, []);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#F5F5F5" />
      <Text style={styles.header}>Manager Dashboard</Text>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Overview Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <TouchableOpacity style={styles.card} onPress={() => handleNavigate('UserPanel')}>
            <Text style={styles.cardText}>Pending Account Validation</Text>
            <Text style={styles.cardNumber}>{pendingCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => handleNavigate('ShiftRequestScreen')}>
            <Text style={styles.cardText}>Pending Shift Requests</Text>
            <Text style={styles.cardNumber}>2</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => handleNavigate('ProductivityScreen')}>
            <Text style={styles.cardText}>Update Productivity</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.card} onPress={() => handleNavigate('UserPanel')}>
            <Text style={styles.cardText}>Validate Accounts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => handleNavigate('AdminPanel')}>
            <Text style={styles.cardText}>Admin Panel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => handleNavigate('ManageShiftRequestScreen')}>
            <Text style={styles.cardText}>Manage Shift Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => handleNavigate('AddWorkersNeededScreen')}>
            <Text style={styles.cardText}>Add Workers Needed</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <TouchableOpacity style={styles.notification} onPress={() => handleNavigate('ShiftRequestDetailsScreen')}>
            <Text style={styles.cardText}>New Shift Request</Text>
            <Text style={styles.cardDetail}>Yassine</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.notification} onPress={() => handleNavigate('ShiftCancelationDetailsScreen')}>
            <Text style={styles.cardText}>Shift Cancelation</Text>
            <Text style={styles.cardDetail}>Patrick</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#23C882',
    marginBottom: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#444',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  cardText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#23C882',
  },
  notification: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  cardDetail: {
    fontSize: 14,
    color: '#666',
  },
});
