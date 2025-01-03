import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { ref, onValue, update } from "firebase/database";
import { realtimeDB } from "../firebaseConfig";

export default function ManageShiftRequestScreen({ route, navigation }) {
  const { selectedDate = "N/A", maxWorkers = 0 } = route.params || {};

  const [applications, setApplications] = useState([]);
  const [currentAssignedWorkers, setCurrentAssignedWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const applicationsRef = ref(realtimeDB, "applications");

    const unsubscribeApplications = onValue(
      applicationsRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        const filteredApplications = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .filter((app) => app.status === "applied");
        setApplications(filteredApplications);
        setLoading(false);
      },
      (error) => console.error("Error fetching applications:", error)
    );

    return () => {
      unsubscribeApplications();
    };
  }, []);

  const handleAssignWorker = async (application) => {
    if (currentAssignedWorkers.length >= maxWorkers) {
      Alert.alert("Limit Reached", "Maximum workers already assigned.");
      return;
    }

    const newAssignedWorkers = [...currentAssignedWorkers, application.worker_id];

    try {
      const updates = {
        [`applications/${application.id}/status`]: "approved",
      };

      await update(ref(realtimeDB), updates);

      setApplications((prev) => prev.filter((app) => app.id !== application.id));

      Alert.alert("Success", "Worker assigned successfully.");
    } catch (error) {
      console.error("Error assigning worker:", error);
      Alert.alert("Error", "Failed to assign worker.");
    }
  };

  const renderApplication = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.textContainer}>
        <Text style={styles.workerName}>{item.worker_id}</Text>
        <Text style={styles.workerStatus}>Status: {item.status}</Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAssignWorker(item)}
        >
          <Text style={styles.buttonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.declineButton}
          onPress={() =>
            Alert.alert("Action", `${item.worker_id} was declined.`)
          }
        >
          <Text style={styles.buttonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Manage Shift Requests</Text>
      <Text style={styles.subHeader}>Shift Date: {selectedDate}</Text>
      <FlatList
        data={applications}
        renderItem={renderApplication}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f4f6f9",
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 10,
  },
  subHeader: {
    fontSize: 18,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  textContainer: {
    marginBottom: 12, // Ajoute de l'espace entre le texte et les boutons
  },
  workerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#34495e",
    flexWrap: "wrap", // Gère les longues chaînes
  },
  workerStatus: {
    fontSize: 14,
    color: "#7f8c8d",
    marginTop: 4,
    flexWrap: "wrap",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between", // Boutons bien espacés horizontalement
    marginTop: 10, // Ajoute de l'espace au-dessus des boutons
  },
  acceptButton: {
    backgroundColor: "#27ae60",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1, // Les boutons occupent la même largeur
    marginRight: 5, // Ajoute un espacement entre les boutons
  },
  declineButton: {
    backgroundColor: "#e74c3c",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1, // Les boutons occupent la même largeur
    marginLeft: 5, // Ajoute un espacement entre les boutons
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  list: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#7f8c8d",
  },
});
