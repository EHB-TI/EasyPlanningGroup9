import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { collection, query, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function ManageShiftRequestScreen() {
  const [shifts, setShifts] = useState({});

  // Fetch shifts from Firestore
  useEffect(() => {
    const fetchShifts = async () => {
      const shiftsQuery = query(collection(db, 'yourshift'));
      const unsubscribe = onSnapshot(shiftsQuery, (snapshot) => {
        const groupedShifts = {};
        snapshot.forEach((doc) => {
          const shift = { id: doc.id, ...doc.data() };
          if (shift.cancelshift) { // Only show shifts where cancelshift is true
            if (!groupedShifts[shift.ContractType]) {
              groupedShifts[shift.ContractType] = [];
            }
            groupedShifts[shift.ContractType].push(shift);
          }
        });
        setShifts(groupedShifts);
      });
      return () => unsubscribe(); // Cleanup subscription
    };

    fetchShifts();
  }, []);

  // Handle Accept Shift
  const handleAccept = async (shiftId) => {
    try {
      const shiftRef = doc(db, 'yourshift', shiftId);
      await deleteDoc(shiftRef); // Delete the shift from Firestore
      Alert.alert('Success', 'Shift request accepted.');
    } catch (error) {
      Alert.alert('Error', 'Failed to accept shift request.');
    }
  };

  // Handle Decline Shift
  const handleDecline = async (shiftId) => {
    try {
      const shiftRef = doc(db, 'yourshift', shiftId);
      await updateDoc(shiftRef, { cancelshift: false }); // Update cancelshift to false
      Alert.alert('Success', 'Shift request declined.');
    } catch (error) {
      Alert.alert('Error', 'Failed to decline shift request.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Manage Shift Request</Text>
      {Object.keys(shifts).map((contractType) => (
        <View key={contractType} style={styles.section}>
          <Text style={styles.sectionTitle}>{contractType}</Text>
          {shifts[contractType].map((shift) => (
            <View key={shift.id} style={styles.shiftCard}>
              <View>
                <Text style={styles.shiftName}>Worker ID: {shift.WorkerID}</Text>
                <Text style={styles.shiftDate}>
                  {new Date(shift.date.toDate()).toLocaleDateString('nl-NL')}
                </Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAccept(shift.id)}
                >
                  <Text style={styles.actionText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={() => handleDecline(shift.id)}
                >
                  <Text style={styles.actionText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#E8F9F9',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#23C882',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 12,
  },
  shiftCard: {
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
  shiftName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  shiftDate: {
    fontSize: 14,
    color: '#777',
  },
  actions: {
    flexDirection: 'row',
  },
  acceptButton: {
    backgroundColor: '#23C882',
    padding: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  declineButton: {
    backgroundColor: '#FF6F61',
    padding: 10,
    borderRadius: 8,
  },
  actionText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
