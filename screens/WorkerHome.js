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
  const [shifts, setShifts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const auth = getAuth();
  const currentUser = auth.currentUser;
  const database = getDatabase();

  useEffect(() => {
    if (currentUser) {
      const userId = currentUser.uid;
      fetchUser(userId);
    }
  }, [currentUser]);

  const fetchUser = async (userId) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userData = snapshot.val();
        console.log('Fetched User Data:', userData); // Debugging log
        setUser(userData);
      } else {
        console.log('User does not exist');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };
  

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
        console.log('No shifts available');
      }
    });
  };

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
        console.log('No applications available');
      }
    });
  };

  useEffect(() => {
    fetchShifts();
    fetchApplications();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (currentUser) {
      const userId = currentUser.uid;
      fetchUser(userId);
    }
    fetchShifts();
    fetchApplications();
    setTimeout(() => setRefreshing(false), 1000);
  }, [currentUser]);

  const firstLetter = user.firstName ? user.firstName.charAt(0).toUpperCase() : '';

const handleNavigateToAccount = () => {
  navigation.navigate('WorkerAccountDetails', { user });
};


  const getNextApplicationId = () => {
    const maxId = applications.reduce((max, application) => {
      const currentId = parseInt(application.id.split('_')[2], 10);
      return currentId > max ? currentId : max;
    }, 0);
    return `application_id_${maxId + 1}`;
  };

  const handleReserveShift = (shiftId) => {
    Alert.alert(
      'Shift reserveren',
      'Weet je zeker dat je deze shift wilt reserveren?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
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

  const handleCancelPendingShift = (applicationId) => {
    Alert.alert(
      'Aanvraag annuleren',
      'Weet je zeker dat je deze aanvraag wilt annuleren?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const applicationRef = ref(database, `applications/${applicationId}`);
              await remove(applicationRef);
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

  // Count only validated shifts
  const plannedShiftsCount = applications.filter(
    (application) =>
      application.worker_id === currentUser?.uid && application.status === 'validated'
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerAligned}>
          <Text style={styles.greetingText}>Hallo {user.firstName}</Text>
          <TouchableOpacity style={styles.profileIcon} onPress={handleNavigateToAccount}>
            <Text style={styles.profileInitial}>{firstLetter}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.volgendeShiftSection}>
          <Text style={styles.volgendeShiftTitle}>Volgende shift</Text>
          {applications
            .filter(
              (application) =>
                application.worker_id === currentUser?.uid && application.status === 'validated'
            )
            .sort((a, b) => new Date(a.shift_date) - new Date(b.shift_date))[0] ? (
            <>
              <Text style={styles.volgendeShiftText}>
                {new Date(
                  applications
                    .filter(
                      (application) =>
                        application.worker_id === currentUser?.uid &&
                        application.status === 'validated'
                    )
                    .sort((a, b) => new Date(a.shift_date) - new Date(b.shift_date))[0].shift_date
                ).toLocaleDateString('nl-NL')}
              </Text>
              <Text style={styles.volgendeShiftText}>
                Start:{' '}
                {new Date(
                  applications
                    .filter(
                      (application) =>
                        application.worker_id === currentUser?.uid &&
                        application.status === 'validated'
                    )
                    .sort((a, b) => new Date(a.shift_date) - new Date(b.shift_date))[0].shift_date
                ).toLocaleTimeString('nl-NL')}
              </Text>
            </>
          ) : (
            <Text style={styles.volgendeShiftText}>Geen geplande shift</Text>
          )}
        </View>

        <View style={styles.aantalShiftsSection}>
          <Text style={styles.aantalShiftsTitle}>Aantal shifts</Text>
          <Text style={styles.aantalShiftsCount}>{plannedShiftsCount}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shifts in Afwachting</Text>
          {applications
            .filter(
              (application) =>
                application.worker_id === currentUser?.uid && application.status === 'applied'
            )
            .map((application) => (
              <View key={application.id} style={styles.pendingShift}>
                <View>
                  <Text style={styles.pendingShiftDay}>
                    {new Date(application.shift_date).toLocaleDateString('nl-NL')}
                  </Text>
                  <Text style={styles.pendingShiftTime}>
                    Start: {new Date(application.shift_date).toLocaleTimeString('nl-NL')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.cancelPendingButton}
                  onPress={() => handleCancelPendingShift(application.id)}
                >
                  <Text style={styles.cancelPendingButtonText}>Annuleren</Text>
                </TouchableOpacity>
              </View>
            ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Beschikbare Shifts</Text>
          {shifts
            .filter(
              (shift) =>
                !applications.some(
                  (application) =>
                    application.shift_id === shift.id &&
                    application.worker_id === currentUser?.uid
                ) && shift.status === 'active'
            )
            .map((shift) => (
              <View key={shift.id} style={styles.freeShift}>
                <View>
                  <Text style={styles.freeShiftDay}>
                    {new Date(shift.date).toLocaleDateString('nl-NL')}
                  </Text>
                  <Text style={styles.freeShiftTime}>
                    Start: {new Date(shift.date).toLocaleTimeString('nl-NL')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.reserveButton}
                  onPress={() => handleReserveShift(shift.id)}
                >
                  <Text style={styles.reserveButtonText}>Reserveren</Text>
                </TouchableOpacity>
              </View>
            ))}
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
  volgendeShiftSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  volgendeShiftTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  volgendeShiftText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  aantalShiftsSection: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 12,
    width: '45%',
    alignItems: 'center',
    marginBottom: 10,
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
  pendingShift: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF9C4',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
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
