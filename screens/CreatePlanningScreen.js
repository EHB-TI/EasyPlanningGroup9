import 'react-native-get-random-values'; // Must be first
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ref, get, child, update, remove } from 'firebase/database';
import { realtimeDB } from '../firebaseConfig';
import { v4 as uuidv4 } from 'uuid';

import { assignUsersToShifts } from '../scripts/assignmentLogic';

export default function CreatePlanningScreen({ navigation, route }) {
  const { selectedWeek } = route.params || {};

  const [shifts, setShifts] = useState({});
  const [applications, setApplications] = useState({});
  const [users, setUsers] = useState({});
  const [workers, setWorkers] = useState({});
  const [weekData, setWeekData] = useState({});
  const [selectedDay, setSelectedDay] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedWeek) {
      Alert.alert('Error', 'No week selected.');
      navigation.goBack();
      return;
    }
    fetchWeekData();
  }, [selectedWeek, navigation]);

  const fetchWeekData = async () => {
    try {
      setLoading(true);

      // 1) Fetch shifts
      const shiftsSnap = await get(child(ref(realtimeDB), 'shifts'));
      const shiftsVal = shiftsSnap.val() || {};

      const weekShifts = {};
      for (const [shiftId, shift] of Object.entries(shiftsVal)) {
        if (shift.week_id === selectedWeek.week_id && shift.status !== 'closed') {
          weekShifts[shiftId] = shift;
        }
      }

      // 2) Fetch applications
      const appsSnap = await get(child(ref(realtimeDB), 'applications'));
      const allApps = appsSnap.val() || {};
      const weekApps = {};
      for (const [appId, app] of Object.entries(allApps)) {
        if (weekShifts[app.shift_id]) {
          weekApps[appId] = app;
        }
      }

      // 3) Fetch users
      const usersSnap = await get(child(ref(realtimeDB), 'users'));
      const usersVal = usersSnap.val() || {};

      // 4) Fetch workers
      const workersSnap = await get(child(ref(realtimeDB), 'workers'));
      const workersVal = workersSnap.val() || {};

      setShifts(weekShifts);
      setApplications(weekApps);
      setUsers(usersVal);
      setWorkers(workersVal);

      // Auto-assign (only sets application statuses)
      console.log('[CreatePlanningScreen] Auto-assigning statuses...');
      await assignUsersToShifts(weekShifts, usersVal, workersVal);

      // Build UI
      await buildWeekData(weekShifts);

      // Select first day
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Sunday'];
      const firstDayWithShift = daysOfWeek.find((day) => weekData[day]?.shiftId);
      setSelectedDay(firstDayWithShift || 'Monday');
    } catch (err) {
      console.error('Error fetching data:', err);
      Alert.alert('Error', 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const buildWeekData = async (weekShifts) => {
    // Re-fetch shifts
    const newShiftsSnap = await get(child(ref(realtimeDB), 'shifts'));
    const allShifts = newShiftsSnap.val() || {};

    const updatedWeekShifts = {};
    for (const [shiftId, shift] of Object.entries(allShifts)) {
      if (weekShifts[shiftId]) {
        updatedWeekShifts[shiftId] = shift;
      }
    }

    // Re-fetch applications
    const appsSnap = await get(child(ref(realtimeDB), 'applications'));
    const allApps = appsSnap.val() || {};

    // Prepare day-based structure
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Sunday'];
    const newWeekData = {};
    daysOfWeek.forEach((d) => {
      newWeekData[d] = {
        date: '',
        shiftId: null,
        maxWorkers: 0,
        assignedWorkers: [],
        applicantList: [],
      };
    });

    // Fill shift data
    for (const [shiftId, shift] of Object.entries(updatedWeekShifts)) {
      const dateObj = new Date(shift.date);
      const dayName = dateObj.toLocaleString('en-US', { weekday: 'long' });
      if (!newWeekData[dayName]) continue;

      newWeekData[dayName].date = shift.date;
      newWeekData[dayName].shiftId = shiftId;
      newWeekData[dayName].maxWorkers = shift.max_workers || 0;
    }

    // Fill apps
    for (const [appId, app] of Object.entries(allApps)) {
      if (!updatedWeekShifts[app.shift_id]) continue;
      const shift = updatedWeekShifts[app.shift_id];
      const dateObj = new Date(shift.date);
      const dayName = dateObj.toLocaleString('en-US', { weekday: 'long' });
      if (!newWeekData[dayName]) continue;

      const userId = app.worker_id;
      newWeekData[dayName].applicantList.push({
        application_id: appId,
        user_id: userId,
        name: getWorkerDisplayName(userId),
        status: app.status,
      });

      // If status=assigned => show in "Currently Assigned"
      if (app.status === 'assigned') {
        newWeekData[dayName].assignedWorkers.push(userId);
      }
    }

    setWeekData(newWeekData);
  };

  function getWorkerDisplayName(userId) {
    const userObj = users[userId];
    if (!userObj) return `Unknown user ${userId}`;

    const wId = userObj.worker_id;
    const wObj = workers[wId];
    if (!wObj) return `${userObj.first_name} ${userObj.last_name} (no worker doc)`;

    return `${userObj.first_name} ${userObj.last_name} - ${wObj.contract_type || 'N/A'}`;
  }

  const handleRemove = async (dayName, userId) => {
    const dayData = weekData[dayName];
    if (!dayData) return;
  
    try {
      const shiftId = dayData.shiftId;
      const newAssigned = dayData.assignedWorkers.filter((id) => id !== userId);
  
      // 1) Find the relevant application to revert
      let appIdToUpdate = null;
      for (const applicant of dayData.applicantList) {
        if (applicant.user_id === userId && applicant.status === 'assigned') {
          appIdToUpdate = applicant.application_id;
          break;
        }
      }
  
      // 2) Find the assignment record in /assignments for (shiftId, userId)
      const assignmentsSnap = await get(child(ref(realtimeDB), 'assignments'));
      const allAssignments = assignmentsSnap.val() || {};
  
      let assignmentIdToDelete = null;
      for (const [asId, asObj] of Object.entries(allAssignments)) {
        if (asObj.shift_id === shiftId && asObj.user_id === userId) {
          assignmentIdToDelete = asId; 
          break;
        }
      }
  
      // 3) Build updates
      const updates = {};
  
      // Remove user from shift.assigned_workers
      updates[`shifts/${shiftId}/assigned_workers`] = newAssigned;
  
      // Revert application status if found
      if (appIdToUpdate) {
        updates[`applications/${appIdToUpdate}/status`] = 'applied';
      }
  
      // Delete the assignment record if found
      if (assignmentIdToDelete) {
        updates[`assignments/${assignmentIdToDelete}`] = null;
      }
  
      // 4) If the user is a student, decrement hours
      const userObj = users[userId];
      if (userObj) {
        const wId = userObj.worker_id;
        const workerObj = workers[wId];
        if (workerObj?.contract_type === 'student') {
          const decHours = Math.max((workerObj.hours_assigned || 0) - 8, 0);
          updates[`workers/${wId}/hours_assigned`] = decHours;
        }
      }
  
      // 5) Commit all updates at once
      await update(ref(realtimeDB), updates);
  
      // 6) Update local state
      setWeekData((prev) => {
        const updatedDay = { ...prev[dayName] };
        updatedDay.assignedWorkers = newAssigned;
  
        // Mark the applicant as 'applied' again if found
        updatedDay.applicantList = updatedDay.applicantList.map((app) => {
          if (app.application_id === appIdToUpdate) {
            return { ...app, status: 'applied' };
          }
          return app;
        });
  
        return { ...prev, [dayName]: updatedDay };
      });
  
      Alert.alert('Removed', 'User has been removed from the shift and assignments.');
    } catch (err) {
      console.error('Error removing user:', err);
      Alert.alert('Error', 'Could not remove user.');
    }
  };
  


  // The manager finalizes => push each assigned user into shifts/{shiftId}/assigned_workers
  // AND create an entry in assignments/.
  const handleComplete = async () => {
    try {
      // We'll build a big "updates" object to do everything in one go
      const updates = {};

      // 1) For each day, get the assigned users
      for (const dayName of Object.keys(weekData)) {
        const dayData = weekData[dayName];
        if (!dayData.shiftId) continue;

        const shiftId = dayData.shiftId;
        const assignedUserIds = dayData.assignedWorkers || [];

        // Merge them with existing assigned_workers in DB
        const shiftObj = shifts[shiftId];
        if (!shiftObj) continue;

        const current = shiftObj.assigned_workers || [];
        const finalAssigned = [...new Set([...current, ...assignedUserIds])];
        updates[`shifts/${shiftId}/assigned_workers`] = finalAssigned;

        // 2) Create assignment entries
        // For each user in finalAssigned, we create a row in assignments
        // if it doesn't already exist.
        // We can do an extra check by reading the assignments node
        // But for simplicity, just create a new ID for each.
        // (If you want uniqueness, you'd need a check.)

        for (const userId of assignedUserIds) {
          const assignmentId = uuidv4();
          updates[`assignments/${assignmentId}`] = {
            assigned_at: new Date().toISOString(),
            shift_id: shiftId,
            user_id: userId,
          };
        }
      }

      if (Object.keys(updates).length) {
        await update(ref(realtimeDB), updates);
      }

      Alert.alert('Done', 'All assigned users have been added to shifts, and assignment records created!');
    } catch (err) {
      console.error('Error finalizing assignment:', err);
      Alert.alert('Error', 'Could not finalize assignment.');
    }
  };

  const handleManualAssign = async (dayName, applicant) => {
    const dayData = weekData[dayName];
    if (!dayData) return;
  
    if (dayData.assignedWorkers.length >= dayData.maxWorkers) {
      Alert.alert('Full', 'Max workers assigned for this day.');
      return;
    }
  
    try {
      const shiftId = dayData.shiftId;
      const userId = applicant.user_id;
      const appId = applicant.application_id; // The ID of the application
  
      const updates = {
        [`applications/${appId}/status`]: 'assigned',
      };
  
      // If user is student, increment hours
      const userObj = users[userId];
      if (userObj) {
        const wId = userObj.worker_id;
        const workerObj = workers[wId];
        if (workerObj?.contract_type === 'student') {
          const newHours = (workerObj.hours_assigned || 0) + 8;
          if (newHours > 25) {
            Alert.alert('Limit Exceeded', 'Student has reached or exceeded 25 hours.');
            return;
          }
          updates[`workers/${wId}/hours_assigned`] = newHours;
        }
      }
  
      await update(ref(realtimeDB), updates);
  
      // Locally mark status='assigned' but keep it in applicantList
      setWeekData((prev) => {
        const updatedDay = { ...prev[dayName] };
  
        updatedDay.assignedWorkers = [...updatedDay.assignedWorkers, userId];
  
        updatedDay.applicantList = updatedDay.applicantList.map((a) => {
          if (a.application_id === appId) {
            return {
              ...a,
              status: 'assigned',
            };
          }
          return a;
        });
  
        return { ...prev, [dayName]: updatedDay };
      });
    } catch (err) {
      console.error('Error in manual assign:', err);
      Alert.alert('Error', 'Could not manually assign this user.');
    }
  };
  


  // RENDER
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#23C882" />
        <Text style={styles.loadingText}>Loading planning data...</Text>
      </View>
    );
  }

  if (!selectedWeek) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Create Planning</Text>
        <Text>No week selected.</Text>
      </View>
    );
  }

  const dayNames = Object.keys(weekData);
  const currentDayData = weekData[selectedDay] || {
    date: '',
    shiftId: null,
    maxWorkers: 0,
    assignedWorkers: [],
    applicantList: [],
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create Planning</Text>

      {/* Day Bar */}
      <View style={styles.dayBarContainer}>
        {dayNames.map((dayName) => {
          const info = weekData[dayName];
          const assignedCount = info.assignedWorkers.length;
          const maxWorkers = info.maxWorkers;
          const isFull = assignedCount >= maxWorkers && maxWorkers > 0;

          return (
            <TouchableOpacity
              key={dayName}
              style={[
                styles.dayBarItem,
                selectedDay === dayName && styles.dayBarItemSelected,
              ]}
              onPress={() => setSelectedDay(dayName)}
            >
              <Text style={styles.dayBarItemText}>{dayName.slice(0, 3)}</Text>
              <Text>
                {assignedCount}/{maxWorkers}
              </Text>
              {isFull ? (
                <Text style={{ color: 'green' }}>✓</Text>
              ) : (
                <Text style={{ color: 'red' }}>!</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Day Details */}
      <ScrollView style={styles.dayDetailsContainer}>
        <Text style={styles.dayDetailsHeader}>
          {selectedDay} ({currentDayData.date})
        </Text>
        <Text>
          Assigned: {currentDayData.assignedWorkers.length} / {currentDayData.maxWorkers}
        </Text>

        {/* Assigned Workers */}
        <Text style={styles.sectionTitle}>Currently Assigned</Text>
        {currentDayData.assignedWorkers.length ? (
          currentDayData.assignedWorkers.map((userId) => (
            <View style={styles.workerCard} key={userId}>
              <Text style={styles.workerName}>{getWorkerDisplayName(userId)}</Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemove(selectedDay, userId)}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.noWorkersText}>No one assigned yet.</Text>
        )}

        {/* Applicants */}
        <Text style={styles.sectionTitle}>Applicants</Text>
        {currentDayData.applicantList.filter((a) => a.status === 'applied').length ? (
          currentDayData.applicantList
            .filter((a) => a.status === 'applied')
            .map((applicant) => (
              <View style={styles.workerCard} key={applicant.application_id}>
                <Text style={styles.workerName}>{applicant.name}</Text>
                <TouchableOpacity
                  style={styles.assignButton}
                  onPress={() => handleManualAssign(selectedDay, applicant)}

                >
                  <Text style={styles.assignButtonText}>Assign</Text>
                </TouchableOpacity>
              </View>
            ))
        ) : (
          <Text style={styles.noWorkersText}>No applicants for this day.</Text>
        )}
      </ScrollView>

      {/* Complete Button */}
      <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
        <Text style={styles.completeButtonText}>Complete</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------- Styles ----------
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: 24,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#23C882',
    textAlign: 'center',
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#777',
    marginTop: 10,
  },
  dayBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  dayBarItem: {
    alignItems: 'center',
    padding: 8,
    width: 50,
  },
  dayBarItemSelected: {
    backgroundColor: '#23C88233',
    borderRadius: 4,
  },
  dayBarItemText: {
    fontWeight: 'bold',
  },
  dayDetailsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  dayDetailsHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
  },
  workerCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 10,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workerName: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  noWorkersText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#777',
    marginBottom: 6,
  },
  assignButton: {
    backgroundColor: '#23C882',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  assignButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: '#23C882',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
