import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function WorkerMijnplanning({ navigation }) {
  const [selectedDay, setSelectedDay] = useState(null); // Jour sélectionné
  const [currentMonth, setCurrentMonth] = useState(11); // Novembre (index 0 = Janvier)
  const [currentYear, setCurrentYear] = useState(2024);

  const daysOfWeek = ["ma", "di", "wo", "do", "vr", "za", "zo"];

  const generateDaysInMonth = (month, year) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDayPrevMonth = new Date(year, month, 0).getDate();

    const days = [];
    for (let i = 0; i < (firstDayIndex === 0 ? 6 : firstDayIndex - 1); i++) {
      days.push({ day: lastDayPrevMonth - (firstDayIndex === 0 ? 6 : firstDayIndex - 1) + i, isGray: true });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i });
    }
    const remainingDays = 7 - (days.length % 7);
    for (let i = 1; i <= (remainingDays === 7 ? 0 : remainingDays); i++) {
      days.push({ day: i, isGray: true });
    }
    return days;
  };

  const daysInMonth = generateDaysInMonth(currentMonth, currentYear);

  const handleDayClick = (day) => {
    if (!day.isGray) {
      setSelectedDay(day.day);
      console.log(`Day ${day.day} clicked`);
    }
  };

  const changeMonth = (direction) => {
    if (direction === "prev") {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else if (direction === "next") {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const handleCancelShift = (shiftId) => {
    Alert.alert(
      "Annuler shift",
      "Ben je zeker dat je deze shift wilt annuleren?",
      [
        { text: "Non", style: "cancel" },
        { text: "Oui", onPress: () => console.log(`Shift avec l'ID ${shiftId} a été annulé.`) },
      ],
      { cancelable: true }
    );
  };

  const monthNames = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];

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
          <TouchableOpacity onPress={() => changeMonth("prev")}>
            <Ionicons name="chevron-back" size={24} color="#2D4535" />
          </TouchableOpacity>
          <Text style={styles.calendarHeader}>
            {monthNames[currentMonth]} {currentYear}
          </Text>
          <TouchableOpacity onPress={() => changeMonth("next")}>
            <Ionicons name="chevron-forward" size={24} color="#2D4535" />
          </TouchableOpacity>
        </View>
        <View style={styles.daysOfWeekContainer}>
          {daysOfWeek.map((day, index) => (
            <Text key={index} style={styles.dayOfWeekText}>
              {day}
            </Text>
          ))}
        </View>
        <View style={styles.daysContainer}>
          {daysInMonth.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.day,
                item.isGray && styles.grayDay,
                item.day === selectedDay && !item.isGray && styles.selectedDay,
              ]}
              onPress={() => handleDayClick(item)}
            >
              <Text
                style={[
                  styles.dayText,
                  item.isGray && styles.grayText,
                  item.day === selectedDay && !item.isGray && styles.selectedText,
                ]}
              >
                {item.day}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Planned Shifts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Geplande shifts</Text>
        <View style={styles.plannedShift}>
          <View>
            <Text style={styles.plannedShiftDay}>Dinsdag</Text>
            <Text style={styles.plannedShiftDate}>26 novembre 2024</Text>
            <Text style={styles.plannedShiftTime}>8:30 tot 16:00</Text>
          </View>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelShift("shiftId123")}
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
    backgroundColor: "#F5F5F5",
  },
  headerContainer: {
    paddingTop: 50,
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
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  plannedShift: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  plannedShiftDay: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  plannedShiftDate: {
    fontSize: 14,
    color: "#555",
  },
  plannedShiftTime: {
    fontSize: 14,
    color: "#555",
  },
  cancelButton: {
    backgroundColor: "#FF5722",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
});
