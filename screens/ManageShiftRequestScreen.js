// screens/ManageShiftRequestScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { ref, onValue, update } from "firebase/database";
import { realtimeDB } from "../firebaseConfig";

export default function ManageShiftRequestScreen({ route, navigation }) {
  // Destructure with default values to prevent undefined errors
  const { shiftId = null, selectedDate = 'N/A', maxWorkers = 0 } = route.params || {};

  const [applications, setApplications] = useState([]);
  const [currentAssignedWorkers, setCurrentAssignedWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shiftId) {
      Alert.alert("Error", "Shift ID is missing.");
      navigation.goBack(); // Navigate back if shiftId is not provided
      return;
    }

    setLoading(true);
    const applicationsRef = ref(realtimeDB, "applications");
    const shiftsRef = ref(realtimeDB, `shifts/${shiftId}`);

    const unsubscribeApplications = onValue(applicationsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const filteredApplications = Object.keys(data)
        .map((key) => ({ id: key, ...data[key] }))
        .filter((app) => app.shift_id === shiftId && app.status === "applied");
      setApplications(filteredApplications);
    });

    const unsubscribeShifts = onValue(shiftsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setCurrentAssignedWorkers(data.assigned_workers || []);
    });

    setLoading(false);

    return () => {
      unsubscribeApplications();
      unsubscribeShifts();
    };
  }, [shiftId, navigation]);

  // Assign a worker
  const handleAssignWorker = async (application) => {
    if (currentAssignedWorkers.length >= maxWorkers) {
      Alert.alert("Limit Reached", "Maximum workers already assigned to this shift.");
      return;
    }

    const newAssignedWorkers = [...currentAssignedWorkers, application.worker_id];

    try {
      const updates = {
        [`shifts/${shiftId}/assigned_workers`]: newAssignedWorkers,
        [`applications/${application.id}/status`]: "approved",
      };

      await update(ref(realtimeDB), updates);

      setCurrentAssignedWorkers(newAssignedWorkers);
      setApplications((prev) =>
        prev.filter((app) => app.id !== application.id)
      );

      Alert.alert("Success", "Worker assigned successfully.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to assign worker.");
    }
  };

  // Remove a worker
  const handleRemoveWorker = async (workerId) => {
    const updatedAssignedWorkers = currentAssignedWorkers.filter(
      (id) => id !== workerId
    );

    try {
      const updates = {
        [`shifts/${shiftId}/assigned_workers`]: updatedAssignedWorkers,
      };

      await update(ref(realtimeDB), updates);

      setCurrentAssignedWorkers(updatedAssignedWorkers);

      Alert.alert("Success", "Worker removed successfully.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to remove worker.");
    }
  };

  const renderApplication = ({ item }) => (
    <View style={styles.workerCard}>
      <Text style={styles.workerName}>Worker: {item.worker_id}</Text>
      <Text style={styles.workerStatus}>Status: {item.status}</Text>
      <TouchableOpacity
        style={styles.assignButton}
        onPress={() => handleAssignWorker(item)}
      >
        <Text style={styles.assignButtonText}>Assign</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAssignedWorker = ({ item }) => (
    <View style={styles.workerCard}>
      <Text style={styles.workerName}>Worker: {item}</Text>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveWorker(item)}
      >
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#23C882" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Manage Shift for {selectedDate}</Text>

      <Text style={styles.subHeader}>Assigned Workers</Text>
      {currentAssignedWorkers.length > 0 ? (
        <FlatList
          data={currentAssignedWorkers}
          renderItem={renderAssignedWorker}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.workerList}
        />
      ) : (
        <Text style={styles.noDataText}>No workers assigned yet.</Text>
      )}

      <Text style={styles.subHeader}>Applications</Text>
      {applications.length > 0 ? (
        <FlatList
          data={applications}
          renderItem={renderApplication}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.workerList}
        />
      ) : (
        <Text style={styles.noDataText}>No applications available.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#F5F5F5",
    flexGrow: 1,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#23C882",
    textAlign: "center",
    marginBottom: 20,
  },
  subHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#555",
    marginTop: 20,
    marginBottom: 10,
  },
  workerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  workerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  workerStatus: {
    fontSize: 14,
    color: "#777",
  },
  assignButton: {
    backgroundColor: "#23C882",
    padding: 8,
    borderRadius: 8,
  },
  assignButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  removeButton: {
    backgroundColor: "#E74C3C",
    padding: 8,
    borderRadius: 8,
  },
  removeButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  noDataText: {
    fontSize: 16,
    color: "#777",
    textAlign: "center",
    marginVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#777",
    marginTop: 10,
  },
  workerList: {
    paddingBottom: 20,
  },
});
