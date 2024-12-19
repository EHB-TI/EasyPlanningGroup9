import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TextInput, Button } from 'react-native';
import { initializeShifts, fetchShifts, updateShift } from '../services/shifts';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddWorkersNeededScreen() {
  const [shifts, setShifts] = useState([]);
  const [editingShiftId, setEditingShiftId] = useState(null);
  const [newMaxWorkers, setNewMaxWorkers] = useState('');

  useEffect(() => {
    const initializeAndFetchShifts = async () => {
      try {
        await initializeShifts();
        const shiftsData = await fetchShifts();
        shiftsData.sort((a, b) => a.date.toDate() - b.date.toDate());
        setShifts(shiftsData);
      } catch (error) {
        Alert.alert('Error', 'Failed to initialize shifts.');
      }
    };

    initializeAndFetchShifts();
  }, []);

  const handleUpdateMaxWorkers = async (shiftId, maxWorkers) => {
    if (!maxWorkers || isNaN(maxWorkers) || maxWorkers <= 0) {
      Alert.alert('Error', 'Please enter a valid positive number for max workers.');
      return;
    }
    try {
      await updateShift(shiftId, { maxWorkers });
      Alert.alert('Success', 'Max workers updated successfully!');
      setShifts((prevShifts) =>
        prevShifts.map((shift) =>
          shift.id === shiftId ? { ...shift, maxWorkers } : shift
        )
      );
      setEditingShiftId(null); // Exit editing mode
      setNewMaxWorkers(''); // Reset input
    } catch (error) {
      Alert.alert('Error', 'Failed to update max workers.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Add Workers Needed</Text>
      <FlatList
        data={shifts.filter((shift) => shift.status === 'available')}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const shiftDate = item.date.toDate();
          const isEditing = editingShiftId === item.id;

          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {item.day} - {shiftDate.toLocaleDateString()} {shiftDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text>Max Workers: {item.maxWorkers}</Text>
              <Text>Current Workers: {item.workers}</Text>

              {isEditing ? (
                <View>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Max Workers"
                    value={newMaxWorkers}
                    onChangeText={setNewMaxWorkers}
                    keyboardType="number-pad"
                  />
                  <Button
                    title="Save"
                    onPress={() => handleUpdateMaxWorkers(item.id, parseInt(newMaxWorkers, 10))}
                  />
                  <Button
                    title="Cancel"
                    onPress={() => setEditingShiftId(null)}
                    color="red"
                  />
                </View>
              ) : (
                <Button
                  title="Set Max Workers"
                  onPress={() => setEditingShiftId(item.id)}
                />
              )}
            </View>
          );
        }}
        ListEmptyComponent={<Text>No shifts available.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f0faff' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  card: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 8,
    borderRadius: 5,
  },
});
