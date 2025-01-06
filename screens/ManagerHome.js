import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Entypo } from '@expo/vector-icons';
import { getDatabase, ref, get } from 'firebase/database';
import DateTimePicker from '@react-native-community/datetimepicker'; // Sélecteur de date
import { handleFileUpload } from '../scripts/updateProductivity';
import { assignUsersToShifts } from '../scripts/assignmentLogic'; // Logique d'assignation

export default function ManagerHome({ navigation }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [assignMessage, setAssignMessage] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(null); // Stocke la semaine sélectionnée
  const [showDatePicker, setShowDatePicker] = useState(false); // Contrôle l'affichage du sélecteur de date
  const database = getDatabase();

  useEffect(() => {
    const fetchPendingUsers = async () => {
      try {
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);

        if (snapshot.exists()) {
          const usersData = snapshot.val();
          const pendingUsers = Object.values(usersData).filter(user => user.status === 'pending');
          setPendingCount(pendingUsers.length);
        } else {
          setPendingCount(0);
        }
      } catch (error) {
        console.error('Error fetching pending users:', error);
      }
    };

    fetchPendingUsers();
  }, []);

  const handleNavigate = (screen) => {
    navigation.navigate(screen);
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
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1); // Définir au lundi
      setSelectedWeek(startOfWeek);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Welcome, Manager</Text>
        <Text style={styles.subHeader}>Your Dashboard</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Overview Cards */}
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
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.cardRow}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('UserPanel', { filter: 'approved' })}
            >
              <Text style={styles.actionCardText}>Approved Accounts</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={() => handleNavigate('AddWorkersNeededScreen')}>
              <Text style={styles.actionCardText}>Add Workers</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* File Upload Button */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Productivity Update</Text>
          <TouchableOpacity style={styles.fileUploadButton} onPress={handleFileUpload}>
            <Text style={styles.fileUploadButtonText}>Upload Excel File</Text>
          </TouchableOpacity>
        </View>

        {/* Assign Shifts Section */}
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
    padding: 30,
    backgroundColor: '#4CAF50',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subHeader: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 5,
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
  actionCard: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
    justifyContent: 'center',
  },
  actionCardText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  fileUploadButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
    justifyContent: 'center',
  },
  fileUploadButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  datePickerButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  datePickerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  assignButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
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
