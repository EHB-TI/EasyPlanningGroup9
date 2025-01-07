import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Entypo } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';
import DateTimePicker from '@react-native-community/datetimepicker';
import { handleFileUpload } from '../scripts/updateProductivity';
import { assignUsersToShifts } from '../scripts/assignmentLogic';

export default function ManagerHome({ navigation }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [assignMessage, setAssignMessage] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [manager, setManager] = useState({ first_name: '', last_name: '' });
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const database = getDatabase();

  useEffect(() => {
    if (currentUser) {
      fetchManager(currentUser.uid);
    }
    fetchUserCounts();
  }, [currentUser]);

  const fetchManager = async (userId) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        setManager(snapshot.val());
      } else {
        console.log('Manager not found.');
      }
    } catch (error) {
      console.error('Error fetching manager data:', error);
    }
  };

  const fetchUserCounts = async () => {
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);

      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const pendingUsers = Object.values(usersData).filter(user => user.status === 'pending');
        const approvedUsers = Object.values(usersData).filter(user => user.status === 'approved');
        setPendingCount(pendingUsers.length);
        setApprovedCount(approvedUsers.length);
      } else {
        setPendingCount(0);
        setApprovedCount(0);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleAssignShifts = async () => {
    if (!selectedWeek) {
      Alert.alert('Select a Week', 'Please select a week for assigning shifts.');
      return;
    }

    setAssignMessage('Assigning workers to shifts...');
    try {
      const shiftsSnapshot = await get(ref(database, 'shifts'));
      const usersSnapshot = await get(ref(database, 'users'));
      const workersSnapshot = await get(ref(database, 'workers'));
      const applicationsSnapshot = await get(ref(database, 'applications'));

      if (
        shiftsSnapshot.exists() &&
        usersSnapshot.exists() &&
        workersSnapshot.exists() &&
        applicationsSnapshot.exists()
      ) {
        const shifts = shiftsSnapshot.val();
        const users = usersSnapshot.val();
        const workers = workersSnapshot.val();
        const applications = applicationsSnapshot.val();

        const { pendingAssignments } = await assignUsersToShifts(
          shifts,
          users,
          workers,
          applications,
          selectedWeek,
          database
        );

        setAssignMessage(
          `Successfully assigned workers to ${Object.keys(pendingAssignments).length} shifts.`
        );
      } else {
        setAssignMessage('Missing data in the database.');
      }
    } catch (error) {
      console.error('Error assigning workers to shifts:', error);
      setAssignMessage('Failed to assign workers. Check the logs for details.');
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1); // Set to Monday
      setSelectedWeek(startOfWeek);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.header}>
            Welcome, Manager <Text style={styles.managerName}>{`${manager.first_name} ${manager.last_name}`}</Text>
          </Text>
        </View>
        {/* Overview Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.cardRow}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('UserPanel', { filter: 'pending' })}
            >
              <View style={styles.cardIcon}>
                <Entypo name="users" size={32} color="#4CAF50" />
              </View>
              <Text style={styles.cardTitle}>Pending Accounts</Text>
              <Text style={styles.cardNumber}>{pendingCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('UserPanel', { filter: 'approved' })}
            >
              <View style={styles.cardIcon}>
                <Entypo name="check" size={32} color="#4CAF50" />
              </View>
              <Text style={styles.cardTitle}>Approved Accounts</Text>
              <Text style={styles.cardNumber}>{approvedCount}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardRow}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                const today = new Date();
                const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));
                const weekId = `week_${startOfWeek.toISOString().split('T')[0]}`;
                const selectedDate = startOfWeek.toISOString().split('T')[0];

                navigation.navigate('AddWorkersNeededScreen', {
                  weekId,
                  selectedDate,
                });
              }}
            >
              <View style={styles.cardIcon}>
                <Entypo name="add-user" size={32} color="#4CAF50" />
              </View>
              <Text style={styles.cardTitle}>Add Workers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('ManagerCalendar')}
            >
              <View style={styles.cardIcon}>
                <Entypo name="calendar" size={32} color="#4CAF50" />
              </View>
              <Text style={styles.cardTitle}>View Calendar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* File Upload Section */}
       

        {/* Shift Assignments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shift Assignments</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.datePickerButtonText}>
              {selectedWeek
                ? `Week Starting: ${selectedWeek.toDateString()}`
                : 'Select a Week'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
          <TouchableOpacity style={styles.assignButton} onPress={handleAssignShifts}>
            <Text style={styles.assignButtonText}>Assign Workers to Shifts</Text>
          </TouchableOpacity>
          {assignMessage ? <Text style={styles.assignMessage}>{assignMessage}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FAFB',
  },
  headerContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5FAFB',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    paddingTop: 10
  },
  managerName: {
    fontWeight: 'normal',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 8,
  },
  fileUploadButton: {
    backgroundColor: '#007BFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileUploadButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  datePickerButton: {
    backgroundColor: '#007BFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  datePickerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  assignButton: {
    backgroundColor: '#FF5722',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  assignMessage: {
    marginTop: 12,
    fontSize: 14,
    color: '#333',
  },
});
