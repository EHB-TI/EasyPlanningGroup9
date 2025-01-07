// CreatePlanningScreen.js

import 'react-native-get-random-values'; // Must be first
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { ref, get, child, update } from 'firebase/database';
import { realtimeDB } from '../firebaseConfig';
import { v4 as uuidv4 } from 'uuid';
import { parseISO, isValid, startOfWeek, endOfWeek, format } from 'date-fns';
import { assignUsersToShifts } from '../scripts/assignmentLogic';

/**
 * Valideer een datumstring.
 *
 * @param {String} dateString - De datumstring om te valideren.
 * @returns {Boolean} - Waar als geldig, anders onwaar.
 */
function isValidDate(dateString) {
  const date = parseISO(dateString);
  return isValid(date);
}

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
      console.log('[CreatePlanningScreen] Fetching week data...');

      // 1) Fetch shifts
      const shiftsSnap = await get(child(ref(realtimeDB), 'shifts'));
      const shiftsVal = shiftsSnap.val() || {};
      console.log(`[CreatePlanningScreen] Fetched ${Object.keys(shiftsVal).length} shifts.`);

      const weekShifts = {};
      for (const [shiftId, shift] of Object.entries(shiftsVal)) {
        if (shift.week_id === selectedWeek.week_id && shift.status !== 'closed') {
          weekShifts[shiftId] = shift;
        }
      }
      console.log(`[CreatePlanningScreen] Found ${Object.keys(weekShifts).length} shifts for the selected week.`);

      // 2) Fetch applications
      const appsSnap = await get(child(ref(realtimeDB), 'applications'));
      const allApps = appsSnap.val() || {};
      console.log(`[CreatePlanningScreen] Fetched ${Object.keys(allApps).length} applications.`);

      const weekApps = {};
      for (const [appId, app] of Object.entries(allApps)) {
        if (weekShifts[app.shift_id]) {
          weekApps[appId] = app;
        }
      }
      console.log(`[CreatePlanningScreen] Found ${Object.keys(weekApps).length} applications for the selected shifts.`);

      // 3) Fetch users
      const usersSnap = await get(child(ref(realtimeDB), 'users'));
      const usersVal = usersSnap.val() || {};
      console.log(`[CreatePlanningScreen] Fetched ${Object.keys(usersVal).length} users.`);

      // 4) Fetch workers
      const workersSnap = await get(child(ref(realtimeDB), 'workers'));
      const workersVal = workersSnap.val() || {};
      console.log(`[CreatePlanningScreen] Fetched ${Object.keys(workersVal).length} workers.`);

      setShifts(weekShifts);
      setApplications(weekApps);
      setUsers(usersVal);
      setWorkers(workersVal);

      // Auto-assign (only sets application statuses)
      console.log('[CreatePlanningScreen] Auto-assigning statuses...');
      const assignmentResult = await assignUsersToShifts(
        weekShifts,
        usersVal,
        workersVal,
        weekApps,
        selectedWeek.start_date, // Assuming start_date is within the week
        realtimeDB
      );
      console.log('[CreatePlanningScreen] Assignment Result:', assignmentResult);

      // Build UI
      console.log('[CreatePlanningScreen] Building week data...');
      await buildWeekData(weekShifts);

      // Select first day with shifts
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const firstDayWithShift = daysOfWeek.find((day) => weekData[day]?.shiftId);
      setSelectedDay(firstDayWithShift || 'Monday');
      console.log(`[CreatePlanningScreen] Selected initial day: ${firstDayWithShift || 'Monday'}`);
    } catch (err) {
      console.error('Error fetching data:', err);
      Alert.alert('Error', 'Failed to fetch data');
    } finally {
      setLoading(false);
      console.log('[CreatePlanningScreen] Finished fetching week data.');
    }
  };

  const buildWeekData = async (weekShifts) => {
    try {
      // Re-fetch shifts to get the latest data
      const newShiftsSnap = await get(child(ref(realtimeDB), 'shifts'));
      const allShifts = newShiftsSnap.val() || {};
      console.log(`[buildWeekData] Re-fetched ${Object.keys(allShifts).length} shifts.`);

      const updatedWeekShifts = {};
      for (const [shiftId, shift] of Object.entries(allShifts)) {
        if (weekShifts[shiftId]) {
          updatedWeekShifts[shiftId] = shift;
        }
      }
      console.log(`[buildWeekData] Updated week shifts count: ${Object.keys(updatedWeekShifts).length}`);

      // Re-fetch applications to get the latest data
      const appsSnap = await get(child(ref(realtimeDB), 'applications'));
      const allApps = appsSnap.val() || {};
      console.log(`[buildWeekData] Re-fetched ${Object.keys(allApps).length} applications.`);

      // Prepare day-based structure
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
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
        if (!isValidDate(shift.date)) {
          console.error(`Invalid date format for shift ${shiftId}: ${shift.date}`);
          continue;
        }
        const dateObj = parseISO(shift.date);
        const dayName = format(dateObj, 'EEEE'); // Full day name in English

        if (!newWeekData[dayName]) {
          console.warn(`Day name "${dayName}" not recognized.`);
          continue;
        }

        newWeekData[dayName].date = shift.date;
        newWeekData[dayName].shiftId = shiftId;
        newWeekData[dayName].maxWorkers = shift.max_workers || 0;
      }
      console.log('[buildWeekData] Shift data filled in weekData.');

      // Fill applications
      for (const [appId, app] of Object.entries(allApps)) {
        if (!updatedWeekShifts[app.shift_id]) continue;
        const shift = updatedWeekShifts[app.shift_id];
        if (!isValidDate(shift.date)) {
          console.error(`Invalid date format for shift ${shift.shift_id}: ${shift.date}`);
          continue;
        }
        const dateObj = parseISO(shift.date);
        const dayName = format(dateObj, 'EEEE'); // Full day name in English
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
      console.log('[buildWeekData] Application data filled in weekData.');

      setWeekData(newWeekData);
      console.log('[buildWeekData] Week data built successfully:', newWeekData);
    } catch (error) {
      console.error('[buildWeekData] Error building week data:', error);
      throw error;
    }
  };

  function getWorkerDisplayName(userId) {
    const userObj = users[userId];
    if (!userObj) return `Unknown user ${userId}`;

    const wId = userObj.worker_id;
    const workerObj = workers[wId];
    if (!workerObj) return `${userObj.first_name} ${userObj.last_name} (no worker doc)`;

    return `${userObj.first_name} ${userObj.last_name} - ${workerObj.contract_type || 'N/A'}`;
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
        if (workerObj?.contract_type === 'Student') {
          const decHours = Math.max((workerObj.hours_assigned || 0) - 8, 0);
          updates[`workers/${wId}/hours_assigned`] = decHours;
        }
      }

      // 5) Commit all updates at once
      await update(ref(realtimeDB), updates);
      console.log(`[handleRemove] Removed user ${userId} from shift ${shiftId}. Updates:`, updates);

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

  // De complete functie met uitgebreide logging
  const handleComplete = async () => {
    try {
      console.log('[handleComplete] Starting to finalize assignments...');
      const updates = {};

      // 1) Voor elke dag, krijg de toegewezen gebruikers
      for (const dayName of Object.keys(weekData)) {
        const dayData = weekData[dayName];
        if (!dayData.shiftId) continue;

        const shiftId = dayData.shiftId;
        const assignedUserIds = dayData.assignedWorkers || [];

        // Merge met bestaande assigned_workers in DB
        const shiftObj = shifts[shiftId];
        if (!shiftObj) {
          console.warn(`[handleComplete] Shift ${shiftId} not found in shifts state.`);
          continue;
        }

        const currentAssignedWorkers = shiftObj.assigned_workers || [];
        const finalAssigned = [...new Set([...currentAssignedWorkers, ...assignedUserIds])];
        updates[`shifts/${shiftId}/assigned_workers`] = finalAssigned;
        updates[`shifts/${shiftId}/updated_at`] = new Date().toISOString();

        // 2) Maak assignment entries
        for (const userId of assignedUserIds) {
          const assignmentId = uuidv4();
          updates[`assignments/${assignmentId}`] = {
            assigned_at: new Date().toISOString(),
            shift_id: shiftId,
            user_id: userId,
          };
        }

        console.log(`[handleComplete] Shift ${shiftId} assigned to users:`, assignedUserIds);
      }

      if (Object.keys(updates).length > 0) {
        await update(ref(realtimeDB), updates);
        console.log('[handleComplete] Batch updates committed to Firebase:', updates);
      } else {
        console.log('[handleComplete] No updates to commit.');
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

    if (dayData.assignedWorkers.length >= dayData.maxWorkers && dayData.maxWorkers > 0) {
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
        if (workerObj?.contract_type === 'Student') {
          const newHours = (workerObj.hours_assigned || 0) + 8;
          if (newHours > 25) {
            Alert.alert('Limit Exceeded', 'Student has reached or exceeded 25 hours.');
            return;
          }
          updates[`workers/${wId}/hours_assigned`] = newHours;
        }
      }

      await update(ref(realtimeDB), updates);
      console.log(`[handleManualAssign] Assigned user ${userId} to shift ${shiftId}. Updates:`, updates);

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
