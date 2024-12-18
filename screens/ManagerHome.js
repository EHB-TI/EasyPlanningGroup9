import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Entypo } from '@expo/vector-icons';
import { getDatabase, ref, get, child } from 'firebase/database'; // Import Firebase Realtime Database
import { db } from '../firebaseConfig'; // Firebase configuratie

export default function ManagerHome({ navigation }) {
  const [pendingCount, setPendingCount] = useState(0); // Pending gebruikersaantal
  const [approvedCount, setApprovedCount] = useState(0); // Approved gebruikersaantal

  const handleNavigate = (screen) => {
    navigation.navigate(screen);
  };

  useEffect(() => {
    // Functie om pending users uit de Realtime Database op te halen
    const fetchPendingUsers = async () => {
      try {
        const dbRef = ref(getDatabase()); // Realtime Database referentie
        const snapshot = await get(child(dbRef, 'users')); // Haal de 'users' node op
  
        if (snapshot.exists()) {
          const usersData = snapshot.val();
          // Filter gebruikers met status 'pending'
          const pendingUsers = Object.values(usersData).filter(user => user.status === 'pending');
          setPendingCount(pendingUsers.length); // Aantal pending users bijwerken
        } else {
          console.log('No pending users found.');
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
      <Text style={styles.header}>Manager Dashboard</Text>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Overview Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleNavigate('UserPanel')}
          >
            <Text style={styles.cardText}>Pending account validation</Text>
            {/* hier wordt pending users getoond */}
            <Text style={styles.cardNumber}>{pendingCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleNavigate('ShiftRequestScreen')}
          >
            <Text style={styles.cardText}>Pending shift request</Text>
            <Text style={styles.cardNumber}>2</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleNavigate('ProductivityScreen')}
          >
            <Text style={styles.cardText}>Update productivity</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Action Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick action</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleNavigate('UserPanel')}
          >
            <Text style={styles.cardText}>Validate account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleNavigate('UserPanel')}
          >
            <Text style={styles.cardText}>Admin panel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => handleNavigate('ManageShiftRequestScreen')}>
            <Text style={styles.cardText}>Manage shift request</Text>
          </TouchableOpacity>
          <TouchableOpacity
             style={styles.card}
             onPress={() => navigation.navigate('AddWorkersNeededScreen')}
           >
            <Text style={styles.cardText}>Add workers needed</Text>
          </TouchableOpacity>
        </View>

        {/* Notification Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification</Text>
          <TouchableOpacity
            style={styles.notification}
            onPress={() => handleNavigate('ShiftRequestDetailsScreen')}
          >
            <Text style={styles.cardText}>New Shift request</Text>
            <Text style={styles.cardDetail}>Yassine</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.notification}
            onPress={() => handleNavigate('ShiftCancelationDetailsScreen')}
          >
            <Text style={styles.cardText}>Shift cancelation</Text>
            <Text style={styles.cardDetail}>Patrick</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => handleNavigate('HomeScreen')}
        >
          <Entypo name="home" size={24} color="black" />
          <Text style={styles.navItemText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => handleNavigate('CalendarScreen')}
        >
          <Entypo name="calendar" size={24} color="black" />
          <Text style={styles.navItemText}>Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => handleNavigate('MoreScreen')}
        >
          <Entypo name="dots-three-horizontal" size={24} color="black" />
          <Text style={styles.navItemText}>More</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F9F9',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#23C882',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardText: {
    fontSize: 16,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  notification: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardDetail: {
    color: '#555',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#DDD',
    backgroundColor: '#FFFFFF',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemText: {
    fontSize: 16,
    color: '#23C882',
    marginTop: 4,
  },
});
