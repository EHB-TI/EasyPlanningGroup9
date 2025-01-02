import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  SafeAreaView,
} from 'react-native';
import { getDatabase, ref, get, set, remove, onValue } from 'firebase/database';
import { getAuth } from 'firebase/auth';

export default function WorkerHome({ navigation }) {
  const [user, setUser] = useState({ first_name: '', last_name: '' });
  const [weeks, setWeeks] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const auth = getAuth();
  const currentUser = auth.currentUser;
  const database = getDatabase();

  // -------------
  // FETCH METHODS
  // -------------

  // 1) Fetch user
  const fetchUser = async (userId) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        setUser(snapshot.val());
      } else {
        console.log('User does not exist');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // 2) Fetch weeks (if you still need them)
  const fetchWeeks = () => {
    const weeksRef = ref(database, 'weeks');
    onValue(weeksRef, (snapshot) => {
      if (snapshot.exists()) {
        const weeksArray = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...data,
        }));
        setWeeks(weeksArray);
      } else {
        setWeeks([]);
      }
    });
  };

  // 3) Fetch shifts
  const fetchShifts = () => {
    const shiftsRef = ref(database, 'shifts');
    onValue(shiftsRef, (snapshot) => {
      if (snapshot.exists()) {
        const shiftsArray = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...data,
        }));
        setShifts(shiftsArray);
      } else {
        setShifts([]);
      }
    });
  };

  // 4) Fetch applications
  const fetchApplications = () => {
    const applicationsRef = ref(database, 'applications');
    onValue(applicationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const applicationsArray = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...data,
        }));
        setApplications(applicationsArray);
      } else {
        setApplications([]);
      }
    });
  };

  // On mount
  useEffect(() => {
    if (currentUser) {
      fetchUser(currentUser.uid);
    }
    fetchWeeks();
    fetchShifts();
    fetchApplications();
  }, [currentUser]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (currentUser) {
      fetchUser(currentUser.uid);
    }
    fetchWeeks();
    fetchShifts();
    fetchApplications();
    setTimeout(() => setRefreshing(false), 1000);
  }, [currentUser]);

  // -------------
  // HELPER LOGIC
  // -------------

  // Display user's initial
  const firstLetter = user.first_name ? user.first_name.charAt(0).toUpperCase() : '';

  // Navigate to account details
  const handleNavigateToAccount = () => {
    navigation.navigate('WorkerAccountDetails', { user });
  };

  // Next Application ID
  const getNextApplicationId = () => {
    const maxId = applications.reduce((max, application) => {
      const currentId = parseInt(application.id.split('_')[2], 10);
      return currentId > max ? currentId : max;
    }, 0);
    return `application_id_${maxId + 1}`;
  };

  // Reserve (apply for) a shift
  const handleReserveShift = (shiftId) => {
    Alert.alert(
      'Shift reserveren',
      'Weet je zeker dat je deze shift wilt reserveren?',
      [
        {
          text: 'Nee',
          style: 'cancel',
        },
        {
          text: 'Ja',
          onPress: async () => {
            try {
              const applicationId = getNextApplicationId();
              const selectedShift = shifts.find((shift) => shift.id === shiftId);

              const applicationData = {
                application_date: new Date().toISOString(),
                shift_id: shiftId,
                status: 'applied',
                worker_id: currentUser.uid,
                shift_date: selectedShift.date,
              };

              await set(ref(database, `applications/${applicationId}`), applicationData);
              Alert.alert('Success', 'Shift is nu in afwachting van goedkeuring.');
            } catch (error) {
              console.error('Error reserving shift:', error);
              Alert.alert('Error', 'Er ging iets mis bij het reserveren van de shift.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Cancel a pending application
  const handleCancelPendingShift = (applicationId) => {
    Alert.alert(
      'Aanvraag annuleren',
      'Weet je zeker dat je deze aanvraag wilt annuleren?',
      [
        {
          text: 'Nee',
          style: 'cancel',
        },
        {
          text: 'Ja',
          onPress: async () => {
            try {
              await remove(ref(database, `applications/${applicationId}`));
              Alert.alert('Success', 'De aanvraag is geannuleerd.');
            } catch (error) {
              console.error('Error cancelling application:', error);
              Alert.alert('Error', 'Er ging iets mis bij het annuleren van de aanvraag.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // -------------
  // FILTERED DATA
  // -------------

  // A. isUserAssigned => check if user UID is in shift.assigned_workers
  const isUserAssignedToShift = (shift) => {
    if (!shift.assigned_workers) return false;
    return shift.assigned_workers.includes(currentUser?.uid);
  };

  // B. getUserApplicationForShift => see if user has an application
  const getUserApplicationForShift = (shiftId) => {
    return applications.find(
      (app) => app.shift_id === shiftId && app.worker_id === currentUser?.uid
    );
  };

  // 1) Accepted Shifts => user is assigned, regardless of shift status
  //    (We then sort them by date ascending so the user sees them in chronological order)
  const acceptedShifts = shifts
    .filter((shift) => isUserAssignedToShift(shift))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // The count of all accepted shifts (active or closed)
  const acceptedShiftsCount = acceptedShifts.length;

  // 2) My pending “applied” apps for active shifts
  const myPendingApps = applications.filter((app) => {
    if (app.worker_id !== currentUser?.uid) return false;
    if (app.status !== 'applied') return false;
    const shiftForApp = shifts.find((s) => s.id === app.shift_id);
    if (!shiftForApp) return false;
    return shiftForApp.status === 'active';
  });

  // 3) Canceled Shifts => shift.status === "closed", user had an application, not assigned
  const canceledShifts = shifts
    .filter((shift) => shift.status === 'closed')
    .filter((shift) => {
      // user had an application
      const userApp = getUserApplicationForShift(shift.id);
      if (!userApp) return false;
      // but is not assigned
      return !isUserAssignedToShift(shift);
    });

  // 4) Available Shifts => shift is active, user not assigned, no pending or validated application
  const availableShifts = shifts
    .filter((shift) => shift.status === 'active')
    .filter((shift) => !isUserAssignedToShift(shift))
    .filter(
      (shift) =>
        !applications.some(
          (app) => app.shift_id === shift.id && app.worker_id === currentUser?.uid
        )
    )
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // -------------
  // RENDER
  // -------------

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* HEADER */}
        <View style={styles.headerAligned}>
          <Text style={styles.greetingText}>Hallo {user.first_name}</Text>
          <TouchableOpacity style={styles.profileIcon} onPress={handleNavigateToAccount}>
            <Text style={styles.profileInitial}>{firstLetter}</Text>
          </TouchableOpacity>
        </View>

        {/* AANTAL SHIFTS => total accepted shifts (active or closed) */}
        <View style={styles.aantalShiftsSection}>
          <Text style={styles.aantalShiftsTitle}>Aantal shifts</Text>
          <Text style={styles.aantalShiftsCount}>{acceptedShiftsCount}</Text>
        </View>

        {/* GEACCEPTEERDE SHIFTS => all assigned shifts, sorted by date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Geaccepteerde Shifts</Text>
          {acceptedShifts.length === 0 ? (
            <Text style={styles.noAccepted}>Geen geaccepteerde shifts</Text>
          ) : (
            acceptedShifts.map((shift) => (
              <View key={shift.id} style={styles.acceptedShift}>
                <View>
                  {/* Display the day of the week and the date */}
                  <Text style={styles.acceptedShiftDay}>
                    {new Date(shift.date).toLocaleDateString('nl-NL', { weekday: 'long' })}, {new Date(shift.date).toLocaleDateString('nl-NL')}
                  </Text>
                </View>
                {/* Optionally show shift.status if you want the user to see “active” or “closed” */}
                <Text style={styles.acceptedShiftStatus}>
                  {shift.status === 'active' ? 'Actief' : 'Geaccepteerd'}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* SHIFTS IN AFWACHTING (MY PENDING “applied”) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shifts in Afwachting</Text>
          {myPendingApps.length === 0 ? (
            <Text style={styles.noPending}>Geen aanvragen in afwachting</Text>
          ) : (
            myPendingApps.map((application) => (
              <View key={application.id} style={styles.pendingShift}>
                <View>
                  {/* Display the day of the week and the date */}
                  <Text style={styles.pendingShiftDay}>
                    {new Date(application.shift_date).toLocaleDateString('nl-NL', { weekday: 'long' })}, {new Date(application.shift_date).toLocaleDateString('nl-NL')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.cancelPendingButton}
                  onPress={() => handleCancelPendingShift(application.id)}
                >
                  <Text style={styles.cancelPendingButtonText}>Annuleren</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* BESCHIKBARE SHIFTS => user not assigned, no application, shift is active */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Beschikbare Shifts</Text>
          {availableShifts.length === 0 ? (
            <Text style={styles.noAvailable}>Geen beschikbare shifts</Text>
          ) : (
            availableShifts.map((shift) => (
              <View key={shift.id} style={styles.freeShift}>
                <View>
                  {/* Display the day of the week and the date */}
                  <Text style={styles.freeShiftDay}>
                    {new Date(shift.date).toLocaleDateString('nl-NL', { weekday: 'long' })}, {new Date(shift.date).toLocaleDateString('nl-NL')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.reserveButton}
                  onPress={() => handleReserveShift(shift.id)}
                >
                  <Text style={styles.reserveButtonText}>Reserveren</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* GEANNULEERDE SHIFTS => closed + user applied + not assigned */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Geannuleerde Shifts</Text>
          {canceledShifts.length === 0 ? (
            <Text style={styles.noCanceled}>Geen geannuleerde shifts</Text>
          ) : (
            canceledShifts.map((shift) => (
              <View key={shift.id} style={styles.canceledShift}>
                <View>
                  {/* Display the day of the week and the date */}
                  <Text style={styles.canceledShiftDay}>
                    {new Date(shift.date).toLocaleDateString('nl-NL', { weekday: 'long' })}, {new Date(shift.date).toLocaleDateString('nl-NL')}
                  </Text>
                </View>
                <Text style={styles.canceledShiftStatus}>Niet geaccepteerd</Text>
              </View>
            ))
          )}
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
    padding: 12,
    borderRadius: 12,
    width: '45%',
    alignItems: 'center',
    marginBottom: 15,
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  noAccepted: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  acceptedShift: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E0F7FA',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
  },
  acceptedShiftDay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  acceptedShiftStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00796B', // Teal
  },
  pendingShift: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF9C4',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
  },
  pendingShiftDay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  pendingShiftTime: {
    fontSize: 14,
    color: '#555',
  },
  cancelPendingButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  cancelPendingButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  noPending: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 10,
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
  freeShiftDay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
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
  noAvailable: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  canceledShift: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
  },
  canceledShiftDay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  canceledShiftTime: {
    fontSize: 14,
    color: '#555',
  },
  canceledShiftStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336', // red
  },
  noCanceled: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});
