import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function WorkerMijnplanning({ navigation }) {
  const [selectedDay, setSelectedDay] = useState(3); // Example selected day

  const daysOfWeek = ["ma", "di", "wo", "do", "vr", "za", "zo"];
  const daysInMonth = [
    { day: 25, isGray: true }, { day: 26, isGray: true }, { day: 27, isGray: true },
    { day: 28, isGray: true }, { day: 29, isGray: true }, { day: 30, isGray: true },
    { day: 1 }, { day: 2 }, { day: 3, isSelected: true }, { day: 4 }, { day: 5 },
    { day: 6 }, { day: 7 }, { day: 8 }, { day: 9 }, { day: 10 }, { day: 11 },
    { day: 12 }, { day: 13 }, { day: 14 }, { day: 15 }, { day: 16 }, { day: 17 },
    { day: 18 }, { day: 19 }, { day: 20 }, { day: 21 }, { day: 22 }, { day: 23 },
    { day: 24 }, { day: 25 }, { day: 26 }, { day: 27 }, { day: 28 }, { day: 29 },
    { day: 30 }, { day: 31 }, { day: 1, isGray: true }, { day: 2, isGray: true },
    { day: 3, isGray: true }, { day: 4, isGray: true }, { day: 5, isGray: true },
  ];

  const handleDayClick = (day) => {
    setSelectedDay(day);
    console.log(`Day ${day} clicked`);
  };

    const handleCancelShift = (shiftId) => {
      Alert.alert(
        'Annuler shift',
        'Ben je zeker dat je deze shift wilt annuleren?',
        [
          {
            text: 'Non',
            style: 'cancel',
          },
          {
            text: 'Oui',
            onPress: () => {
              console.log(`Shift avec l'ID ${shiftId} a été annulé.`);
              // Ajouter ici la logique pour annuler le shift (mise à jour Firebase, etc.)
            },
          },
        ],
        { cancelable: true }
      );
    };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2D4535" />
        </TouchableOpacity>
        <Text style={styles.header}>Mijn planning</Text>
        <View style={{ width: 24 }} /> {/* Placeholder for alignment */}
      </View>

      {/* Calendar */}
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeaderContainer}>
          <Ionicons name="chevron-back" size={24} color="#2D4535" />
          <Text style={styles.calendarHeader}>December 2024</Text>
          <Ionicons name="chevron-forward" size={24} color="#2D4535" />
        </View>
        <View style={styles.daysOfWeekContainer}>
          {daysOfWeek.map((day, index) => (
            <Text key={index} style={styles.dayOfWeekText}>{day}</Text>
          ))}
        </View>
        <View style={styles.daysContainer}>
          {daysInMonth.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.day,
                item.isGray && styles.grayDay,
                item.day === selectedDay && styles.selectedDay,
              ]}
              onPress={() => handleDayClick(item.day)}
            >
              <Text
                style={[
                  styles.dayText,
                  item.isGray && styles.grayText,
                  item.day === selectedDay && styles.selectedText,
                ]}
              >
                {item.day}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>



      <View style={styles.section}>
                <Text style={styles.sectionTitle}>Geplande shifts</Text>
                <View style={styles.plannedShift}>
                  <View>
                    <Text style={styles.plannedShiftDay}>Dinsdag</Text>
                    <Text style={styles.plannedShiftDate}>26 november 2024</Text>
                    <Text style={styles.plannedShiftTime}>8:30 tot 16:00</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelShift('shiftId123')}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
      
                <View style={styles.plannedShift}>
                  <View>
                    <Text style={styles.plannedShiftDay}>Woensdag</Text>
                    <Text style={styles.plannedShiftDate}>27 november 2024</Text>
                    <Text style={styles.plannedShiftTime}>8:30 tot 16:00</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelShift('shiftId124')}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E5F3F6",
  },
  headerContainer: {
    paddingTop:50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2D4535",
  },
  calendarContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    paddingBottom:0
  },
  calendarHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2D4535",
  },
  daysOfWeekContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  dayOfWeekText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2D4535",
    flex: 1,
    textAlign: "center",
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10,
  },
  day: {
    width: "13%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 5,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2D4535",
  },
  grayDay: {
    opacity: 0.3,
  },
  grayText: {
    color: "#757575",
  },
  selectedDay: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
  },
  selectedText: {
    color: "#FFFFFF",
  },
  section: {
    marginBottom: 20,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  plannedShift: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  plannedShiftDay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  plannedShiftDate: {
    fontSize: 14,
    color: '#555',
  },
  plannedShiftTime: {
    fontSize: 14,
    color: '#555',
  },
  cancelButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});
