import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';

export default function WorkerHome({ navigation, route }) {
  // Simuler des données utilisateur
  const { user } = route.params || { user: { firstName: 'Student', lastName: 'Example' } };
  const firstLetter = user.firstName.charAt(0).toUpperCase(); // Récupérer la première lettre en majuscule

  // Gestion de la navigation vers la page de détails du compte
  const handleNavigateToAccount = () => {
    navigation.navigate('WorkerAccountDetails', { user });
  };


  // Cancel a shift
  const handleCancelShift = async (shiftId) => {
    Alert.alert(
      'Shift annuleren',
      'Weet je zeker dat je deze shift wilt annuleren?',
      [
        {
          text: 'Nee',
          style: 'cancel',
        },
        {
          text: 'Ja',
          onPress: async () => {
            try {
              const shiftRef = doc(db, 'shifts', shiftId);
              await updateDoc(shiftRef, { status: 'cancelled' });
              console.log(`Shift met ID ${shiftId} is geannuleerd.`);
            } catch (error) {
              console.error('Fout bij het annuleren van de shift:', error);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };


  // Reserve a shift
  const handleReserveShift = async (shiftId) => {
    Alert.alert(
      'Shift reserveren',
      'Wil je deze shift reserveren?',
      [
        {
          text: 'Nee',
          style: 'cancel',
        },
        {
          text: 'Ja',
          onPress: async () => {
            try {
              const shiftRef = doc(db, 'shifts', shiftId);
              await updateDoc(shiftRef, { status: 'reserved', reservedBy: currentUser.uid });
              console.log(`Shift met ID ${shiftId} is gereserveerd.`);
            } catch (error) {
              console.error('Fout bij het reserveren van de shift:', error);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const plannedShiftsCount = shifts.filter(
    (shift) => shift.status === 'reserved' && shift.reservedBy === currentUser?.uid
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header Section */}
        <View style={styles.headerAligned}>
          <Text style={styles.greetingText}>Hallo {user.firstName}</Text>
          <TouchableOpacity style={styles.profileIcon} onPress={handleNavigateToAccount}>
            <Text style={styles.profileInitial}>{firstLetter}</Text>
          </TouchableOpacity>
        </View>


        {/* Aantal Shifts Section */}
        <View style={styles.aantalShiftsSection}>
          <Text style={styles.aantalShiftsTitle}>Aantal shifts</Text>
          <Text style={styles.aantalShiftsCount}>{plannedShiftsCount}</Text>
        </View>


        <View style={styles.nextShiftSection}>
          <Text style={styles.nextShiftTitle}>Volgende shift</Text>
          {shifts.length > 0 && (
            <View style={styles.nextShiftBox}>
              <Text style={styles.nextShiftDetails}>Datum: {new Date(shifts[0].date.seconds * 1000).toLocaleDateString('nl-NL')}</Text>
              <Text style={styles.nextShiftDetails}>Start: {new Date(shifts[0].date.seconds * 1000).toLocaleTimeString('nl-NL')}</Text>
            </View>
          )}
        </View>


        {/* Planned Shifts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Geplande shifts</Text>
          <View style={styles.plannedShift}>
            <View>
              <Text style={styles.plannedShiftDay}>Dinsdag</Text>
              <Text style={styles.plannedShiftDate}>26 november 2024</Text>
              <Text style={styles.plannedShiftTime}>8:30 tot 16:00</Text>
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelShift('shiftId123')}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.plannedShift}>
            <View>
              <Text style={styles.plannedShiftDay}>Woensdag</Text>
              <Text style={styles.plannedShiftDate}>27 november 2024</Text>
              <Text style={styles.plannedShiftTime}>8:30 tot 16:00</Text>
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelShift('shiftId124')}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>


        {/* Free Shifts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vrije shifts</Text>
          <View style={styles.freeShift}>
            <View>
              <Text style={styles.freeShiftDay}>Donderdag</Text>
              <Text style={styles.freeShiftDate}>28 november 2024</Text>
              <Text style={styles.freeShiftTime}>8:30 tot 16:00</Text>
            </View>
            <TouchableOpacity
              style={styles.reserveButton}
              onPress={() => handleReserveShift('shiftId125')}
            >
              <Text style={styles.reserveButtonText}>Reserveren</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.freeShift}>
            <View>
              <Text style={styles.freeShiftDay}>Vrijdag</Text>
              <Text style={styles.freeShiftDate}>29 november 2024</Text>
              <Text style={styles.freeShiftTime}>8:30 tot 16:00</Text>
            </View>
            <TouchableOpacity
              style={styles.reserveButton}
              onPress={() => handleReserveShift('shiftId126')}
            >
              <Text style={styles.reserveButtonText}>Reserveren</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.freeShift}>
            <View>
              <Text style={styles.freeShiftDay}>Zaterdag</Text>
              <Text style={styles.freeShiftDate}>30 november 2024</Text>
              <Text style={styles.freeShiftTime}>8:30 tot 16:00</Text>
            </View>
            <TouchableOpacity
              style={styles.reserveButton}
              onPress={() => handleReserveShift('shiftId127')}
            >
              <Text style={styles.reserveButtonText}>Reserveren</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 16,
  },
  headerAligned: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  profileIcon: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  greetingText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  aantalShiftsSection: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  aantalShiftsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  aantalShiftsCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  nextShiftSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextShiftTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  nextShiftBox: {
    marginBottom: 8,
  },
  nextShiftDetails: {
    fontSize: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  plannedShift: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  freeShift: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F9E9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
  },
  reserveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  reserveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});
