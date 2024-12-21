// screens/CreatePlanningScreen.js

import 'react-native-get-random-values'; // Must be first
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { ref, get, child, update } from "firebase/database";
import { realtimeDB } from "../firebaseConfig";
import { assignUsersToShifts } from "./utils/assignmentLogic";
import { v4 as uuidv4 } from "uuid"; // Ensure to install: npm install uuid

export default function CreatePlanningScreen({ navigation, route }) {
  const { selectedWeek } = route.params || {};

  // State variables
  const [shifts, setShifts] = useState({});
  const [applications, setApplications] = useState({});
  const [users, setUsers] = useState({});
  const [workers, setWorkers] = useState({});
  const [weekData, setWeekData] = useState({});
  const [selectedDay, setSelectedDay] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedWeek) {
      Alert.alert("Error", "No week selected.");
      navigation.goBack();
      return;
    }

    const fetchWeekData = async () => {
      try {
        setLoading(true);

        // 1) Fetch all shifts for this week
        const shiftsSnapshot = await get(child(ref(realtimeDB), "shifts"));
        const shiftsVal = shiftsSnapshot.val() || {};
        console.log("Fetched Shifts:", shiftsVal);

        // Filter shifts for the selected week that are not "closed"
        const weekShifts = Object.keys(shiftsVal).reduce((result, shiftId) => {
          const shift = shiftsVal[shiftId];
          if (
            shift.week_id === selectedWeek.week_id &&
            shift.status !== "closed"
          ) {
            result[shiftId] = shift;
          }
          return result;
        }, {});

        // 2) Fetch all applications
        const appsSnapshot = await get(child(ref(realtimeDB), "applications"));
        const appsVal = appsSnapshot.val() || {};
        console.log("Fetched Applications:", appsVal);

        // Filter only those for the relevant shifts
        const weekApplications = Object.keys(appsVal).reduce((result, appId) => {
          const application = appsVal[appId];
          if (weekShifts[application.shift_id]) {
            result[appId] = application;
          }
          return result;
        }, {});

        // 3) Fetch all users
        const usersSnapshot = await get(child(ref(realtimeDB), "users"));
        const usersVal = usersSnapshot.val() || {};
        console.log("Fetched Users:", usersVal);

        // 4) Fetch all workers
        const workersSnapshot = await get(child(ref(realtimeDB), "workers"));
        const workersVal = workersSnapshot.val() || {};
        console.log("Fetched Workers:", workersVal);

        // 5) Verify Worker to User Mapping
        Object.keys(workersVal).forEach(workerId => {
          const worker = workersVal[workerId];
          const user = usersVal[worker.user_id];
          if (user) {
            console.log(`Worker ID: ${workerId}, User: ${user.first_name} ${user.last_name}, Contract: ${worker.contract_type}`);
          } else {
            console.log(`Worker ID: ${workerId} has no corresponding user.`);
          }
        });

        setShifts(weekShifts);
        setApplications(weekApplications);
        setUsers(usersVal);
        setWorkers(workersVal);

        // 6) Build a day-based data structure
        const daysOfWeek = [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Sunday",
        ];

        const newWeekData = {};
        daysOfWeek.forEach((dayName) => {
          newWeekData[dayName] = {
            date: "",
            shiftId: null,
            maxWorkers: 0,
            assignedWorkers: [],
            applicantList: [],
          };
        });

        // Map each shift to the appropriate day
        Object.keys(weekShifts).forEach((shiftId) => {
          const shift = weekShifts[shiftId];
          const dateObj = new Date(shift.date);
          const dayName = dateObj.toLocaleString("en-US", {
            weekday: "long",
          });
          if (newWeekData[dayName]) {
            newWeekData[dayName].date = shift.date;
            newWeekData[dayName].shiftId = shiftId;
            newWeekData[dayName].maxWorkers = shift.max_workers || 0;
            newWeekData[dayName].assignedWorkers = shift.assigned_workers || [];
          }
        });

        // Map applications into each day
        Object.keys(weekApplications).forEach((appId) => {
          const application = weekApplications[appId];
          const shift = weekShifts[application.shift_id];
          if (!shift) return;
          const dateObj = new Date(shift.date);
          const dayName = dateObj.toLocaleString("en-US", { weekday: "long" });

          // Extract userId from application.worker_id
          const userId = application.worker_id; // Since application.worker_id is actually user_id
          const workerName = getWorkerDisplayName(userId);
          
          const applicantObj = {
            application_id: appId,
            user_id: userId, // Renamed for clarity
            name: workerName,
            status: application.status,
          };

          // Insert into newWeekData
          if (newWeekData[dayName]) {
            newWeekData[dayName].applicantList.push(applicantObj);
          }
        });

        // 7) Set state
        setWeekData(newWeekData);
        console.log("Updated Week Data:", newWeekData);

        // By default, select Monday (if it has a shift), or the first day that has a shift.
        const firstDayWithShift = daysOfWeek.find(
          (day) => newWeekData[day].shiftId
        );
        setSelectedDay(firstDayWithShift || "Monday");
      } catch (error) {
        console.error("Error fetching planning data:", error);
        Alert.alert("Error", "Failed to fetch planning data.");
      } finally {
        setLoading(false);
      }
    };

    fetchWeekData();
  }, [selectedWeek, navigation]);

  // ----- Helper Function -----
  const getWorkerDisplayName = (userId) => {
    const user = users[userId];
    if (!user) {
      console.log(`User not found: ${userId}`);
      return `Worker: ${userId}`;
    }

    const workerId = user.worker_id;
    const worker = workers[workerId];

    if (!worker) {
      console.log(`Worker not found for user ${userId}: ${workerId}`);
      return `Worker: ${workerId}`;
    }

    const contractType = worker.contract_type || "N/A";
    return `${user.first_name} ${user.last_name} - ${contractType}`;
  };

  // ----- Event Handlers -----

  const handleAssign = async (dayName, applicant) => {
    const dayData = weekData[dayName];
    if (!dayData) return;

    // Check if we are at max capacity
    if (dayData.assignedWorkers.length >= dayData.maxWorkers) {
      Alert.alert("Full", "You have already assigned the maximum workers for this day.");
      return;
    }

    try {
      const shiftId = dayData.shiftId;
      const userId = applicant.user_id; // This is the userId
      const newAssigned = [...dayData.assignedWorkers, userId];

      // Create a new assignment
      const assignmentId = uuidv4();
      console.log("Generated Assignment ID:", assignmentId);
      const assignmentData = {
        assigned_at: new Date().toISOString(),
        shift_id: shiftId,
        user_id: userId,
      };

      // Prepare updates
      const updates = {
        [`shifts/${shiftId}/assigned_workers`]: newAssigned,
        [`applications/${applicant.application_id}/status`]: "assigned",
        [`assignments/${assignmentId}`]: assignmentData,
      };

      // Retrieve worker details via user
      const user = users[userId];
      const workerId = user.worker_id;
      const worker = workers[workerId];

      // If the worker is a student, update their hours_assigned
      if (worker?.contract_type === "student") {
        const updatedHours = (worker.hours_assigned || 0) + 8; // Assuming 8-hour shifts

        if (updatedHours > 25) {
          Alert.alert(
            "Limit Exceeded",
            "Cannot assign more hours to this student."
          );
          return;
        }

        updates[`workers/${workerId}/hours_assigned`] = updatedHours;
      }

      // Update Firebase
      await update(ref(realtimeDB), updates);

      // Update local state
      setWeekData((prev) => {
        const updatedDayData = { ...prev[dayName] };
        updatedDayData.assignedWorkers = newAssigned;
        // Remove the applicant from the list
        updatedDayData.applicantList = updatedDayData.applicantList.filter(
          (a) => a.application_id !== applicant.application_id
        );
        return {
          ...prev,
          [dayName]: updatedDayData,
        };
      });

      // Update workers state
      if (worker?.contract_type === "student") {
        setWorkers((prev) => ({
          ...prev,
          [workerId]: {
            ...prev[workerId],
            hours_assigned:
              (prev[workerId].hours_assigned || 0) + 8,
          },
        }));
      }
    } catch (error) {
      console.error("Error assigning worker:", error);
      Alert.alert("Error", "Could not assign worker.");
    }
  };

  const handleRemove = async (dayName, userId) => {
    const dayData = weekData[dayName];
    if (!dayData) return;

    try {
      const shiftId = dayData.shiftId;
      const newAssigned = dayData.assignedWorkers.filter((id) => id !== userId);

      // Find the assignment ID to remove
      const assignmentsSnapshot = await get(child(ref(realtimeDB), "assignments"));
      const assignments = assignmentsSnapshot.val() || {};
      let assignmentIdToRemove = null;

      for (const [assignmentId, assignment] of Object.entries(assignments)) {
        if (assignment.shift_id === shiftId && assignment.user_id === userId) {
          assignmentIdToRemove = assignmentId;
          break;
        }
      }

      if (assignmentIdToRemove) {
        // Find the corresponding application to reset its status
        const applicationsSnapshot = await get(child(ref(realtimeDB), "applications"));
        const applications = applicationsSnapshot.val() || {};

        let applicationIdToUpdate = null;
        for (const [appId, application] of Object.entries(applications)) {
          if (
            application.worker_id === userId &&
            application.shift_id === shiftId &&
            application.status === "assigned"
          ) {
            applicationIdToUpdate = appId;
            break;
          }
        }

        // Prepare updates
        const updates = {
          [`shifts/${shiftId}/assigned_workers`]: newAssigned,
        };

        if (applicationIdToUpdate) {
          updates[`applications/${applicationIdToUpdate}/status`] = "applied";
        }

        // Remove the assignment record
        updates[`assignments/${assignmentIdToRemove}`] = null;

        // Retrieve worker details via user
        const user = users[userId];
        const workerId = user.worker_id;
        const worker = workers[workerId];

        // If the worker is a student, decrement their hours_assigned
        if (worker?.contract_type === "student") {
          const updatedHours = (worker.hours_assigned || 0) - 8; // Assuming 8-hour shifts
          updates[`workers/${workerId}/hours_assigned`] = Math.max(
            updatedHours,
            0
          );
        }

        // Update Firebase
        await update(ref(realtimeDB), updates);

        // Update local state
        setWeekData((prev) => {
          const updatedDayData = { ...prev[dayName] };
          updatedDayData.assignedWorkers = newAssigned;
          // Re-add the worker to the applicant list
          const workerName = getWorkerDisplayName(userId);
          const readdedApplicant = {
            application_id: `app_${userId}_${shiftId}`, // Adjust based on your app ID naming
            user_id: userId,
            name: workerName,
            status: "applied",
          };
          updatedDayData.applicantList.push(readdedApplicant);
          return {
            ...prev,
            [dayName]: updatedDayData,
          };
        });

        // Update workers state
        if (worker?.contract_type === "student") {
          setWorkers((prev) => ({
            ...prev,
            [workerId]: {
              ...prev[workerId],
              hours_assigned: Math.max(
                (prev[workerId].hours_assigned || 0) - 8,
                0
              ),
            },
          }));
        }
      }
    } catch (error) {
      console.error("Error removing worker:", error);
      Alert.alert("Error", "Could not remove worker.");
    }
  };

  // ----- Complete Assignment Handler -----

  const handleComplete = async () => {
    // Check if all days are full
    const allDaysFull = Object.values(weekData).every(
      (day) => day.assignedWorkers.length >= day.maxWorkers
    );

    if (!allDaysFull) {
      Alert.alert(
        "Incomplete",
        "All days must be fully staffed before completing."
      );
      return;
    }

    try {
      setLoading(true);

      // Call the assignment logic
      const updates = await assignUsersToShifts(shifts, workers);

      Alert.alert("Success", "Users have been assigned to shifts.");

      // Refresh data
      await fetchWeekData(); // Ensure fetchWeekData is accessible here
    } catch (error) {
      console.error("Error completing assignment:", error);
      Alert.alert("Error", "An error occurred while assigning users.");
    } finally {
      setLoading(false);
    }
  };

  // ----- Rendering -----

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
        <Text style={styles.noDataText}>No week selected.</Text>
      </View>
    );
  }

  // Helper to render top bar with days
  const renderDayBar = () => {
    const dayNames = Object.keys(weekData);
    return (
      <View style={styles.dayBarContainer}>
        {dayNames.map((dayName) => {
          const dayInfo = weekData[dayName];
          const assignedCount = dayInfo.assignedWorkers.length;
          const maxWorkers = dayInfo.maxWorkers;

          // Show a check if full, else an exclamation
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
              <Text style={styles.dayBarItemSubText}>
                {assignedCount}/{maxWorkers}
              </Text>
              {isFull ? (
                <Text style={[styles.statusSymbol, { color: "green" }]}>✓</Text>
              ) : (
                <Text style={[styles.statusSymbol, { color: "red" }]}>!</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const currentDayData = weekData[selectedDay] || {
    date: "",
    shiftId: null,
    maxWorkers: 0,
    assignedWorkers: [],
    applicantList: [],
  };

  // Check if all days are full
  const allDaysFull = Object.values(weekData).every(
    (day) => day.assignedWorkers.length >= day.maxWorkers
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create Planning</Text>

      {/* Top bar with days overview */}
      {renderDayBar()}

      {/* Main area: details for the selectedDay */}
      <ScrollView style={styles.dayDetailsContainer}>
        <Text style={styles.dayDetailsHeader}>
          {selectedDay} ({currentDayData.date})
        </Text>
        <Text style={styles.dayDetailsSubheader}>
          Assigned: {currentDayData.assignedWorkers.length} /{" "}
          {currentDayData.maxWorkers}
        </Text>

        {/* Assigned Workers */}
        <Text style={styles.sectionTitle}>Currently Assigned</Text>
        {currentDayData.assignedWorkers.length > 0 ? (
          currentDayData.assignedWorkers.map((userId) => (
            <View key={userId} style={styles.workerCard}>
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

        {/* Applicants (not yet assigned) */}
        <Text style={styles.sectionTitle}>Applicants</Text>
        {currentDayData.applicantList.length > 0 ? (
          currentDayData.applicantList
            .filter((app) => app.status === "applied")
            .map((applicant) => {
              const workerName = getWorkerDisplayName(applicant.user_id);
              console.log(`Rendering Applicant: ${workerName}`);
              return (
                <View key={applicant.application_id} style={styles.workerCard}>
                  <Text style={styles.workerName}>{workerName}</Text>
                  <TouchableOpacity
                    style={styles.assignButton}
                    onPress={() => handleAssign(selectedDay, applicant)}
                  >
                    <Text style={styles.assignButtonText}>Assign</Text>
                  </TouchableOpacity>
                </View>
              );
            })
        ) : (
          <Text style={styles.noWorkersText}>No applicants for this day.</Text>
        )}
      </ScrollView>

      {/* Complete Button */}
      <TouchableOpacity
        style={[
          styles.completeButton,
          { backgroundColor: allDaysFull ? "#23C882" : "#ccc" },
        ]}
        onPress={handleComplete}
        disabled={!allDaysFull || loading}
      >
        <Text style={styles.completeButtonText}>Complete</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingTop: 24,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#23C882",
    textAlign: "center",
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#777",
    marginTop: 10,
  },
  noDataText: {
    fontSize: 16,
    color: "#777",
    marginTop: 20,
    textAlign: "center",
  },

  // Day Bar
  dayBarContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
  },
  dayBarItem: {
    alignItems: "center",
    padding: 8,
    width: 50,
    borderRadius: 4,
  },
  dayBarItemSelected: {
    backgroundColor: "#23C88233",
  },
  dayBarItemText: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  dayBarItemSubText: {
    fontSize: 12,
    color: "#333",
  },
  statusSymbol: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "bold",
  },

  // Day Details
  dayDetailsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  dayDetailsHeader: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginVertical: 8,
  },
  dayDetailsSubheader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#777",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#555",
    marginTop: 12,
    marginBottom: 6,
  },
  workerCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  workerName: {
    fontSize: 16,
    color: "#333",
    flex: 1, // so text doesn't overflow
    marginRight: 8,
  },
  assignButton: {
    backgroundColor: "#23C882",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  assignButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  removeButton: {
    backgroundColor: "#E74C3C",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  removeButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  noWorkersText: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#777",
    marginBottom: 6,
  },

  // Complete Button
  completeButton: {
    backgroundColor: "#23C882",
    padding: 16,
    borderRadius: 8,
    margin: 16,
    alignItems: "center",
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
