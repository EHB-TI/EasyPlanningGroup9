import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { initializeSixWeeksShifts, updateWeeklyShifts, fetchWeeklyShifts, updateShift } from '../services/shifts';

export default function AddWorkersNeededScreen() {
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    const initializeShifts = async () => {
      try {
        await initializeSixWeeksShifts();
        const shiftsData = await fetchWeeklyShifts();
        shiftsData.sort((a, b) => a.date.toDate() - b.date.toDate());
        setShifts(shiftsData);

        // Planifier la mise à jour des semaines chaque dimanche soir
        const now = new Date();
        const nextSunday = new Date(now);
        nextSunday.setDate(now.getDate() + (7 - now.getDay()));
        nextSunday.setHours(23, 59, 59, 999);

        const remainingTime = nextSunday - now;
        const timer = setTimeout(async () => {
          await updateWeeklyShifts();
          const updatedShifts = await fetchWeeklyShifts();
          updatedShifts.sort((a, b) => a.date.toDate() - b.date.toDate());
          setShifts(updatedShifts);
        }, remainingTime);

        return () => clearTimeout(timer);
      } catch (error) {
        console.error('Error initializing shifts:', error);
        Alert.alert('Error', 'Failed to initialize shifts.');
      }
    };

    initializeShifts();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Add Workers Needed</Text>
      <FlatList
        data={shifts.filter((shift) => shift.status === 'available')}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.day}</Text>
            <Text>Date: {item.date.toDate().toLocaleDateString()}</Text>
            <Text>Max Workers: {item.maxWorkers}</Text>
          </View>
        )}
        ListEmptyComponent={<Text>No shifts available.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f0faff' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  card: { padding: 16, backgroundColor: '#fff', borderRadius: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
});
