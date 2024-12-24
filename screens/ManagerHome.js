import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Entypo } from '@expo/vector-icons';
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
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Welcome, Manager</Text>
        <Text style={styles.subHeader}>Your Dashboard</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Overview Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.cardRow}>
            <TouchableOpacity style={styles.card} onPress={() => handleNavigate('UserPanel')}>
              <View style={styles.cardIcon}>
                <Entypo name="users" size={32} color="#4CAF50" />
              </View>
              <Text style={styles.cardTitle}>Pending Accounts</Text>
              <Text style={styles.cardNumber}>{pendingCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.card} onPress={() => handleNavigate('ShiftRequestScreen')}>
              <View style={styles.cardIcon}>
                <Entypo name="clipboard" size={32} color="#FF6F61" />
              </View>
              <Text style={styles.cardTitle}>Shift Requests</Text>
              <Text style={styles.cardNumber}>2</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.cardRow}>
            <TouchableOpacity style={styles.actionCard} onPress={() => handleNavigate('UserPanel')}>
              <Text style={styles.actionCardText}>Validate Accounts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => handleNavigate('AdminPanel')}>
              <Text style={styles.actionCardText}>Admin Panel</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.cardRow}>
            <TouchableOpacity style={styles.actionCard} onPress={() => handleNavigate('ManageShiftRequestScreen')}>
              <Text style={styles.actionCardText}>Manage Shifts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => handleNavigate('AddWorkersNeededScreen')}>
              <Text style={styles.actionCardText}>Add Workers</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FAFB',
  },
  headerContainer: {
    padding: 30,
    backgroundColor: '#4CAF50',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subHeader: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 5,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 8,
  },
  actionCard: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
    justifyContent: 'center'
  },
  actionCardText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

});
