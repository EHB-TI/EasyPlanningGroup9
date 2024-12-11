import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
 
export default function WorkerMijnplanning() {
  const [planning, setPlanning] = useState([
    { day: "Dinsdag", date: "26 november 2024", time: "8:30 tot 16:00", hours: "7h30", editable: true },
    { day: "Woensdag", date: "27 november 2024", time: "8:30 tot 16:00", hours: "7h30", editable: true },
    { day: "Donderdag", date: "28 november 2024", time: "8:30 tot 16:00", hours: "7h30", editable: false },
    { day: "Vrijdag", date: "29 november 2024", time: "8:30 tot 16:00", hours: "7h30", editable: false },
    { day: "Zaterdag", date: "30 november 2024", time: "8:30 tot 16:00", hours: "7h30", editable: false },
  ]);
 
  const handleEdit = (day) => {
    console.log(`Edit clicked for ${day}`);
  };
 
  const handleReserve = (day) => {
    console.log(`Reserve clicked for ${day}`);
  };
 
  return (
<ScrollView contentContainerStyle={styles.container}>
<Text style={styles.header}>Mijn planning</Text>
 
      <View style={styles.calendarContainer}>
<Text style={styles.calendarHeader}>December 2024</Text>
        {/* Placeholder for calendar */}
</View>
 
      {planning.map((item, index) => (
<View key={index} style={[styles.planningItem, item.editable ? styles.editable : styles.reservable]}>
<Text style={styles.dayText}>{item.day}</Text>
<Text style={styles.dateText}>{item.date}</Text>
<Text style={styles.timeText}>{item.time}</Text>
<Text style={styles.hoursText}>{item.hours}</Text>
 
          {item.editable ? (
<TouchableOpacity style={styles.editButton} onPress={() => handleEdit(item.day)}>
<Text style={styles.buttonText}>Edit</Text>
</TouchableOpacity>
          ) : (
<TouchableOpacity style={styles.reserveButton} onPress={() => handleReserve(item.day)}>
<Text style={styles.buttonText}>Reserveren</Text>
</TouchableOpacity>
          )}
</View>
      ))}
</ScrollView>
  );
}
 
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#E8F5E9",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  calendarContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarHeader: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  planningItem: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editable: {
    backgroundColor: "#FFEBEE",
  },
  reservable: {
    backgroundColor: "#E8F5E9",
  },
  dayText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  dateText: {
    fontSize: 14,
    color: "#757575",
    marginBottom: 5,
  },
  timeText: {
    fontSize: 14,
    marginBottom: 5,
  },
  hoursText: {
    fontSize: 14,
    marginBottom: 10,
  },
  editButton: {
    backgroundColor: "#F44336",
  }

});
