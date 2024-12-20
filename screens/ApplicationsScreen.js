import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { ref, get, child } from "firebase/database";
import { realtimeDB } from "../firebaseConfig";

export default function ApplicationsScreen({ navigation, route }) {
  const { selectedWeek } = route.params || {}; // Use empty object as fallback

  const [applications, setApplications] = useState({});
  const [shifts, setShifts] = useState({});
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch users and applications on component mount
  useEffect(() => {
    const fetchUsersAndApplications = async () => {
      try {
        setLoading(true);

        // Fetch Users
        const usersSnapshot = await get(child(ref(realtimeDB), "users"));
        const usersData = usersSnapshot.val() || {};
        setUsers(usersData);

        // Fetch Shifts
        const shiftsSnapshot = await get(child(ref(realtimeDB), "shifts"));
        const shiftsData = shiftsSnapshot.val() || {};
        const weekShifts = Object.keys(shiftsData)
          .filter(
            (shiftId) =>
              shiftsData[shiftId].week_id === selectedWeek.week_id &&
              shiftsData[shiftId].status !== "closed"
          )
          .reduce((result, shiftId) => {
            result[shiftId] = shiftsData[shiftId];
            return result;
          }, {});

        setShifts(weekShifts);

        if (Object.keys(weekShifts).length === 0) {
          setApplications({});
          Alert.alert("Info", "No active shifts available for the selected week.");
          return;
        }

        // Fetch Applications
        const applicationsSnapshot = await get(
          child(ref(realtimeDB), "applications")
        );
        const applicationsData = applicationsSnapshot.val() || {};
        const weekApplications = Object.keys(applicationsData)
          .filter((appId) => weekShifts[applicationsData[appId].shift_id])
          .reduce((result, appId) => {
            result[appId] = applicationsData[appId];
            return result;
          }, {});

        setApplications(weekApplications);
      } catch (error) {
        Alert.alert("Error", "Failed to fetch users, shifts, or applications.");
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsersAndApplications();
  }, [selectedWeek]);

  // Organize applications by day
  const organizedApplications = () => {
    if (!selectedWeek) return {};

    const daysOfWeek = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const weekDays = {};
    daysOfWeek.forEach((day) => {
      weekDays[day] = {
        date: "",
        workers: [],
      };
    });

    // Map shifts to days of the week
    Object.keys(shifts).forEach((shiftId) => {
      const shift = shifts[shiftId];
      const dateObj = new Date(shift.date);
      const dayName = dateObj.toLocaleString("en-US", { weekday: "long" });
      const dateStr = shift.date;

      if (weekDays[dayName]) {
        weekDays[dayName].date = dateStr;
      }
    });

    // Map applications to days and workers
    Object.keys(applications).forEach((appId) => {
      const application = applications[appId];
      const shift = shifts[application.shift_id];
      if (!shift) return;

      const dateObj = new Date(shift.date);
      const dayName = dateObj.toLocaleString("en-US", { weekday: "long" });

      const workerId = application.worker_id;
      const worker = users[workerId];
      if (!worker) return;

      if (weekDays[dayName]) {
        weekDays[dayName].workers.push({
          application_id: appId,
          worker_id: workerId,
          name: `${worker.first_name} ${worker.last_name} - ${worker.contract_type}`,
        });
      }
    });

    return weekDays;
  };

  const weekApplications = organizedApplications();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#23C882" />
        <Text style={styles.loadingText}>Loading applications...</Text>
      </View>
    );
  }

  if (!selectedWeek) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Applications</Text>
        <Text style={styles.noDataText}>No week selected.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Applications</Text>

      <View style={styles.selectedWeekContainer}>
        <Text style={styles.selectedWeekText}>
          {selectedWeek.start_date} - {selectedWeek.end_date}
        </Text>
      </View>

      {Object.keys(weekApplications).map((day) => (
        <View key={day} style={styles.daySection}>
          <Text style={styles.dayHeader}>
            {day} ({weekApplications[day].date})
          </Text>
          {weekApplications[day].workers.length > 0 ? (
            weekApplications[day].workers.map((worker) => (
              <TouchableOpacity
                key={worker.application_id}
                style={styles.workerCard}
              >
                <Text style={styles.workerName}>{worker.name}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noWorkersText}>
              No applications for this day.
            </Text>
          )}
        </View>
      ))}
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
    marginBottom: 10,
  },
  selectedWeekContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  selectedWeekText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  daySection: {
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  dayHeader: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  workerCard: {
    backgroundColor: "#EFEFEF",
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  workerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  noWorkersText: {
    fontSize: 14,
    color: "#777",
    fontStyle: "italic",
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
  noDataText: {
    fontSize: 16,
    color: "#777",
    textAlign: "center",
    marginTop: 20,
  },
});
