// ShiftDetailsScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';


export default function ShiftDetailsScreen({ route, navigation }) {
  const { shiftId } = route.params;
  const [shift, setShift] = useState(null);

  useEffect(() => {
    const fetchShift = async () => {
      try {
        const docRef = doc(db, 'yourshift', shiftId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setShift({ id: docSnap.id, ...docSnap.data() });
        } else {
          Alert.alert('Error', 'Shift not found.');
          navigation.goBack();
        }
      } catch (error) {
        Alert.alert('Error', 'Unable to fetch shift details.');
        navigation.goBack();
      }
    };
    fetchShift();
  }, [shiftId, navigation]);

  if (!shift) {
    return (
      <View style={styles.detailsContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }
  const handleRequestChange = async () => {
    try {
      const docRef = doc(db, 'yourshift', shiftId);
      await updateDoc(docRef, { cancelshift: true }); // Update the cancelshift field to true
      Alert.alert('Success', 'Cancellation requested.');
    } catch (error) {
      Alert.alert('Error', 'Failed to request cancellation.');
    }
  };

  if (!shift) {
    return (
      <View style={styles.detailsContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.detailsContainer}>
      <Text style={styles.detailsText}>Shift Details</Text>
      <Text style={styles.detailsDate}>
        {new Date(shift.date.toDate()).toLocaleDateString('nl-NL')} -{' '}
        {new Date(shift.date.toDate()).toLocaleTimeString('nl-NL')}
      </Text>
      <TouchableOpacity style={styles.cancelButton} onPress={handleRequestChange}>
  <Text style={styles.cancelButtonText}>Verzoek tot wijziging</Text>
</TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
    detailsContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#E8F9F9',
    },
    detailsText: {
      fontSize: 18,
      marginBottom: 10,
      color: '#555',
    },
    detailsDate: {
      fontSize: 24,
      marginBottom: 20,
      color: '#23C882',
    },
    cancelButton: {
      backgroundColor: '#FF6F61',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      marginTop: 20,
    },
    cancelButtonText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });
