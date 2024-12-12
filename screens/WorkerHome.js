import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { auth, db } from '../firebaseConfig'; 
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function ManagerHome({ navigation }) {
  const [shifts, setShifts] = useState([]);
  const [nextShift, setNextShift] = useState(null);
  const [dates, setDates] = useState([]);

  // Fetch shifts from Firestore
  useEffect(() => {
    const shiftsQuery = query(collection(db, 'yourshift'), orderBy('date'));
    const unsubscribe = onSnapshot(shiftsQuery, (snapshot) => {
      const fetchedShifts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(), 
      }));
      setShifts(fetchedShifts);

      // Find the next shift
      const now = new Date();
      const upcomingShift = fetchedShifts.find((shift) => shift.date > now);
      setNextShift(upcomingShift || null);
    });

    return () => unsubscribe(); // Cleanup subscription
  }, []);

  // Generate a list of dates for the next 4 weeks, starting on next Monday, excluding Saturdays
  const generateDates = () => {
    const today = new Date();

    // Find the next Monday
    const dayOfWeek = today.getDay();
    const diffToNextMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek);
    const nextMonday = new Date(today.setDate(today.getDate() + diffToNextMonday));

    const endOfFourWeeks = new Date(nextMonday);
    endOfFourWeeks.setDate(nextMonday.getDate() + 27); // 4 weeks minus 1 day

    const tempDates = [];
    for (let d = new Date(nextMonday); d <= endOfFourWeeks; d.setDate(d.getDate() + 1)) {
      const newDate = new Date(d); // Clone the date
      if (newDate.getDay() !== 6) { // Exclude Saturdays
        tempDates.push(newDate);
      }
    }

    setDates(tempDates);
  };

  useEffect(() => {
    generateDates();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Next Shift Section */}
        <View style={styles.nextShiftCard}>
          <Text style={styles.nextShiftTitle}>Volgende shift</Text>
          {nextShift ? (
            <>
              <Text style={styles.nextShiftDate}>
                {nextShift.date.toLocaleDateString('nl-NL')}
              </Text>
              <Text style={styles.nextShiftTime}>
                {nextShift.date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} tot 16:00
              </Text>
              <Text style={styles.nextShiftDuration}>duur 7h30</Text>
            </>
          ) : (
            <Text style={styles.noShiftText}>Geen toekomstige shifts</Text>
          )}
        </View>

        {/* All Shifts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Geplande shifts</Text>
          {shifts.map((shift) => (
            <View key={shift.id} style={styles.shiftCard}>
              <View>
                <Text style={styles.shiftDay}>
                  {shift.date.toLocaleDateString('nl-NL', { weekday: 'long' })}
                </Text>
                <Text style={styles.shiftDetails}>
                  {shift.date.toLocaleDateString('nl-NL')} -{' '}
                  {shift.date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('ShiftDetailsScreen', { shiftId: shift.id })} // Pass shiftId
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Free Shifts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vrije shifts</Text>
          {dates.map((date, index) => {
            if (index % 2 === 0) {
              return (
                <View key={index} style={styles.row}>
                  <TouchableOpacity
                    style={styles.freeShift}
                    onPress={() => navigation.navigate('ShiftDetailsScreen', { date: dates[index] })}
                  >
                    <Text style={styles.freeShiftDay}>
                      {dates[index].toLocaleDateString('nl-NL', { weekday: 'long' })}
                    </Text>
                    <Text style={styles.freeShiftDetails}>
                      {dates[index].toLocaleDateString('nl-NL')}
                    </Text>
                  </TouchableOpacity>

                  {dates[index + 1] && (
                    <TouchableOpacity
                      style={styles.freeShift}
                      onPress={() =>
                        navigation.navigate('ShiftDetailsScreen', { date: dates[index + 1] })
                      }
                    >
                      <Text style={styles.freeShiftDay}>
                        {dates[index + 1].toLocaleDateString('nl-NL', { weekday: 'long' })}
                      </Text>
                      <Text style={styles.freeShiftDetails}>
                        {dates[index + 1].toLocaleDateString('nl-NL')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }
            return null;
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// Shift Details Screen
export function ShiftDetailsScreen({ route }) {
  const { date } = route.params;

  return (
    <View style={styles.detailsContainer}>
      <Text style={styles.detailsText}>Details voor shift op:</Text>
      <Text style={styles.detailsDate}>{new Date(date).toLocaleDateString()}</Text>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F9F9',
  },
  scrollContent: {
    padding: 16,
  },
  nextShiftCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  nextShiftTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  nextShiftDate: {
    fontSize: 16,
    marginBottom: 4,
  },
  nextShiftTime: {
    fontSize: 16,
    marginBottom: 4,
  },
  nextShiftDuration: {
    fontSize: 14,
    color: '#777',
  },
  noShiftText: {
    fontSize: 14,
    color: '#777',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
  shiftDay: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  shiftDetails: {
    fontSize: 14,
    color: '#555',
  },
  editButton: {
    backgroundColor: '#FF6F61',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#FFF',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12, // Space between rows
  },
  freeShift: {
    flex: 1,
    backgroundColor: '#23C882',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 6, // Space between the two columns
    justifyContent: 'center',
    alignItems: 'center',
  },
  freeShiftDay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  freeShiftDetails: {
    fontSize: 14,
    color: '#FFF',
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F9F9',
  },
  detailsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
  },
  detailsDate: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#23C882',
    marginTop: 10,
  },
});
