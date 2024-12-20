import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { ref, onValue, update, get } from "firebase/database"; 
import { realtimeDB } from "../firebaseConfig"; // Ensure this path is correct

export default function AddWorkersNeededScreen({ navigation }) {
  const [weeks, setWeeks] = useState([]);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(null);
  const [shifts, setShifts] = useState({});
  const [loadingWeeks, setLoadingWeeks] = useState(true);
  const [loadingShifts, setLoadingShifts] = useState(true);

  // Fetch weeks and set the default week
  useEffect(() => {
    const weeksRef = ref(realtimeDB, "weeks");
    const unsubscribe = onValue(weeksRef, (snapshot) => {
      const data = snapshot.val() || {};
      // Map weeks to include week_id
      const weeksArray = Object.keys(data).map((key) => ({
        week_id: key,
        ...data[key],
      }));

      // Sort weeks by start_date ascending
      const sortedWeeks = weeksArray.sort(
        (a, b) => new Date(a.start_date) - new Date(b.start_date)
      );

      setWeeks(sortedWeeks);
      setLoadingWeeks(false);

      // Find the first week with status "open"
      const openWeekIndex = sortedWeeks.findIndex((week) => week.status === "open");
      if (openWeekIndex !== -1) {
        setCurrentWeekIndex(openWeekIndex);
      } else {
        // Optionally, handle the case where no open week exists
        setCurrentWeekIndex(null);
        Alert.alert("Info", "No open weeks available.");
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch shifts for the selected week
  useEffect(() => {
    if (currentWeekIndex === null || weeks.length === 0) return;

    const selectedWeek = weeks[currentWeekIndex];
    if (!selectedWeek) return;

    setLoadingShifts(true);

    const shiftsRef = ref(realtimeDB, "shifts");
    const unsubscribe = onValue(shiftsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const filteredShifts = Object.keys(data)
        .filter((shiftId) => data[shiftId].week_id === selectedWeek.week_id)
        .reduce((result, shiftId) => {
          result[shiftId] = data[shiftId];
          return result;
        }, {});

      setShifts(filteredShifts);
      setLoadingShifts(false);
    });

    return () => unsubscribe();
  }, [weeks, currentWeekIndex]);

  // Determine if all relevant shifts have max_workers > 0
  const canMakePlanning = Object.values(shifts)
    .filter((shift) => shift.status !== "closed") // Exclude closed shifts
    .every((shift) => shift.max_workers > 0); // Check if max_workers > 0

  // Handle "Complete" button click
  const handleComplete = async () => {
    try {
      const selectedWeek = weeks[currentWeekIndex];
      const updates = {};
      Object.keys(shifts).forEach((shiftId) => {
        if (shifts[shiftId].status !== "closed") {
          updates[`shifts/${shiftId}/max_workers`] = shifts[shiftId].max_workers;
        }
      });

      await update(ref(realtimeDB), updates);
      Alert.alert("Success", "Max workers updated for all shifts.");

      // Refresh shifts data
      const shiftsRef = ref(realtimeDB, "shifts");
      const snapshot = await get(shiftsRef);
      const data = snapshot.val() || {};
      const filteredShifts = Object.keys(data)
        .filter((shiftId) => data[shiftId].week_id === selectedWeek.week_id)
        .reduce((result, shiftId) => {
          result[shiftId] = data[shiftId];
          return result;
        }, {});

      setShifts(filteredShifts);
    } catch (error) {
      Alert.alert("Error", "Failed to update max workers.");
      console.error(error);
    }
  };

  // Handler for the dynamic button
  const handleDynamicButton = () => {
    if (currentWeekIndex === null || weeks.length === 0) {
      Alert.alert("Error", "No week selected. Cannot proceed.");
      return;
    }

    const selectedWeek = weeks[currentWeekIndex];

    if (canMakePlanning) {
      console.log("Make Planning button pressed");
      // Navigate to PlanningScreen with selectedWeek
      navigation.navigate("PlanningScreen", { selectedWeek });
    } else {
      console.log("View Applications button pressed");
      // Navigate to ApplicationsScreen with selectedWeek
      navigation.navigate("ApplicationsScreen", { selectedWeek });
    }
  };

  // Navigate between weeks
  const handleWeekNavigation = (direction) => {
    setCurrentWeekIndex((prevIndex) => {
      if (prevIndex === null) return prevIndex;
      const newIndex = prevIndex + direction;
      if (newIndex < 0 || newIndex >= weeks.length) {
        return prevIndex;
      }
      return newIndex;
    });
  };

  // Render shifts
  const renderShifts = () =>
    Object.keys(shifts).map((shiftId) => {
      const shift = shifts[shiftId];
      const shiftDate = new Date(shift.date);
      const dayName = shiftDate.toLocaleString("en-US", { weekday: "long" });

      return (
        <View key={shiftId} style={styles.shiftCard}>
          <View style={styles.shiftInfo}>
            <Text style={styles.shiftDate}>{shift.date}</Text>
            <Text style={styles.dayName}>{dayName}</Text>
            <Text style={styles.shiftStatus}>
              Status: {shift.status.charAt(0).toUpperCase() + shift.status.slice(1)}
            </Text>
          </View>
          {shift.status !== "closed" && (
            <View style={styles.maxWorkersContainer}>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="Max Workers"
                value={shift.max_workers.toString()}
                onChangeText={(text) => {
                  const value = parseInt(text, 10);
                  if (isNaN(value) || value < 0) {
                    Alert.alert("Invalid Input", "Please enter a valid number greater than or equal to 0.");
                    return;
                  }
                  setShifts((prev) => ({
                    ...prev,
                    [shiftId]: {
                      ...prev[shiftId],
                      max_workers: value,
                    },
                  }));
                }}
              />
            </View>
          )}
        </View>
      );
    });

  if (loadingWeeks) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#23C882" />
        <Text style={styles.loadingText}>Loading weeks...</Text>
      </View>
    );
  }

  if (weeks.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Add Workers Needed</Text>
        <Text style={styles.noDataText}>No weeks available.</Text>
      </View>
    );
  }

  if (currentWeekIndex === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Add Workers Needed</Text>
        <Text style={styles.noDataText}>No open weeks available.</Text>
      </View>
    );
  }

  const selectedWeek = weeks[currentWeekIndex];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Add Workers Needed</Text>

      {/* Week Navigation */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[
            styles.arrowButton,
            currentWeekIndex === 0 && styles.disabledButton,
          ]}
          onPress={() => handleWeekNavigation(-1)}
          disabled={currentWeekIndex === 0}
        >
          <Text style={styles.arrowText}>{"<"}</Text>
        </TouchableOpacity>

        <Text style={styles.weekText}>
          {selectedWeek.start_date} - {selectedWeek.end_date}
        </Text>

        <TouchableOpacity
          style={[
            styles.arrowButton,
            currentWeekIndex === weeks.length - 1 && styles.disabledButton,
          ]}
          onPress={() => handleWeekNavigation(1)}
          disabled={currentWeekIndex === weeks.length - 1}
        >
          <Text style={styles.arrowText}>{">"}</Text>
        </TouchableOpacity>
      </View>

      {/* Selected Week Information */}
      <Text style={styles.subHeader}>
        Selected Week: {selectedWeek.start_date} - {selectedWeek.end_date}
      </Text>

      {/* Shifts Section */}
      {loadingShifts ? (
        <View style={styles.loadingShiftsContainer}>
          <ActivityIndicator size="large" color="#23C882" />
          <Text style={styles.loadingText}>Loading shifts...</Text>
        </View>
      ) : Object.keys(shifts).length > 0 ? (
        <>
          {renderShifts()}
          <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
            <Text style={styles.completeButtonText}>Complete</Text>
          </TouchableOpacity>

          {/* Dynamic Button */}
          <TouchableOpacity
            style={styles.dynamicButton}
            onPress={handleDynamicButton}
          >
            <Text style={styles.dynamicButtonText}>
              {canMakePlanning ? "Make Planning" : "View Applications"}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.noDataText}>No shifts available for this week.</Text>
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
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  arrowButton: {
    backgroundColor: "#23C882",
    padding: 10,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
  },
  arrowText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  weekText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  loadingShiftsContainer: {
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
  shiftCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  shiftInfo: {
    flex: 1,
    marginRight: 10,
  },
  shiftDate: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  dayName: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },
  shiftStatus: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },
  maxWorkersContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    width: 60,
    height: 40,
    backgroundColor: "#EFEFEF",
    borderRadius: 6,
    textAlign: "center",
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#CCC",
  },
  completeButton: {
    backgroundColor: "#23C882",
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  completeButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  dynamicButton: {
    backgroundColor: "#FF9800", // Orange color for differentiation
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  dynamicButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
