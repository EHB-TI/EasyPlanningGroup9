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


  // Confirmation d'annulation de shift
  const handleCancelShift = (shiftId) => {
    Alert.alert(
      'Annuler shift',
      'Ben je zeker dat je deze shift wilt annuleren?',
      [
        {
          text: 'Non',
          style: 'cancel',
        },
        {
          text: 'Oui',
          onPress: () => {
            console.log(`Shift avec l'ID ${shiftId} a été annulé.`);
            // Ajouter ici la logique pour annuler le shift (mise à jour Firebase, etc.)
          },
        },
      ],
      { cancelable: true }
    );
  };


  // Confirmation de réservation de shift
  const handleReserveShift = (shiftId) => {
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
          onPress: () => {
            console.log(`Shift met ID ${shiftId} is gereserveerd.`);
            // Ajouter ici la logique pour réserver le shift (mise à jour Firebase, etc.)
          },
        },
      ],
      { cancelable: true }
    );
  };


  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Hallo {user.firstName}</Text>
          <TouchableOpacity style={styles.profileIcon} onPress={handleNavigateToAccount}>
            <Text style={styles.profileInitial}>{firstLetter}</Text>
          </TouchableOpacity>
        </View>


        {/* Shift Counter Section */}
        <View style={styles.shiftCounter}>
          <Text style={styles.shiftCounterText}>Aantal shifts</Text>
          <Text style={styles.shiftCounterNumber}>2 shifts</Text>
        </View>


        {/* Next Shift Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Volgende shift</Text>
          <Text style={styles.cardText}>26/11/2024</Text>
          <Text style={styles.cardText}>8:30 tot 16:00</Text>
          <Text style={styles.cardText}>duur 7h30</Text>
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
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: 40, // Ajoute un espace en haut pour descendre le contenu
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20, // Décale encore plus le header vers le bas
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  shiftCounter: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  shiftCounterText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  shiftCounterNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  cardText: {
    fontSize: 14,
    color: '#555',
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
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  plannedShiftDay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  plannedShiftDate: {
    fontSize: 14,
    color: '#555',
  },
  plannedShiftTime: {
    fontSize: 14,
    color: '#555',
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
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  freeShiftDay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  freeShiftDate: {
    fontSize: 14,
    color: '#555',
  },
  freeShiftTime: {
    fontSize: 14,
    color: '#555',
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



