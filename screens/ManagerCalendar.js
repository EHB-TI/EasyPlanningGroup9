import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase, ref, onValue } from "firebase/database";

export default function ManagerCalendar({ navigation }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);
  const [shifts, setShifts] = useState({});

  const daysOfWeek = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  useEffect(() => {
    const db = getDatabase();
    const shiftsRef = ref(db, "shifts");

    onValue(shiftsRef, (snapshot) => {
      if (snapshot.exists()) {
        setShifts(snapshot.val());
      } else {
        setShifts({});
      }
    });
  }, []);

  const generateDaysInMonth = (month, year) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDayPrevMonth = new Date(year, month, 0).getDate();
    const days = [];

    for (let i = 0; i < (firstDayIndex === 0 ? 6 : firstDayIndex - 1); i++) {
      days.push({ day: lastDayPrevMonth - (firstDayIndex === 0 ? 6 : firstDayIndex - 1) + i, isGray: true });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isGray: false });
    }

    const remainingDays = 7 - (days.length % 7);
    for (let i = 1; i <= (remainingDays === 7 ? 0 : remainingDays); i++) {
      days.push({ day: i, isGray: true });
    }

    return days;
  };

  const daysInMonth = generateDaysInMonth(currentMonth, currentYear);

  const changeMonth = (direction) => {
    if (direction === "prev") {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const handleDayClick = (day) => {
    if (!day.isGray) {
      const selectedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
      const selectedShift = shifts[`shift_${selectedDate}`];
  
      if (selectedShift) {
        const weekId = selectedShift.week_id;
        navigation.navigate("AddWorkersNeededScreen", { weekId, selectedDate });
      }
    }
  };
  
  

  const getShiftStatus = (date) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
    const shift = shifts[`shift_${dateStr}`];

    if (shift) {
      return shift.assigned_workers?.length === shift.max_workers ? "full" : "notFull";
    }
    return "none";
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Manager Kalender</Text>
      </View>

      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeaderContainer}>
          <TouchableOpacity onPress={() => changeMonth("prev")}>
            <Ionicons name="chevron-back" size={24} color="#2D4535" />
          </TouchableOpacity>
          <Text style={styles.calendarHeader}>
            {new Date(currentYear, currentMonth).toLocaleDateString("nl-NL", {
              month: "long",
              year: "numeric",
            })}
          </Text>
          <TouchableOpacity onPress={() => changeMonth("next")}>
            <Ionicons name="chevron-forward" size={24} color="#2D4535" />
          </TouchableOpacity>
        </View>

        <View style={styles.daysOfWeekContainer}>
          {daysOfWeek.map((dow, i) => (
            <Text key={i} style={styles.dayOfWeekText}>
              {dow}
            </Text>
          ))}
        </View>

        <View style={styles.daysContainer}>
          {daysInMonth.map((item, i) => {
            if (item.isGray) {
              return (
                <View key={i} style={[styles.day, styles.grayDay]}>
                  <Text style={[styles.dayText, styles.grayText]}>{item.day}</Text>
                </View>
              );
            } else {
              const shiftStatus = getShiftStatus(item.day);
              let dayStyle = styles.noneDay;

              if (shiftStatus === "full") dayStyle = styles.fullShiftDay;
              if (shiftStatus === "notFull") dayStyle = styles.notFullShiftDay;

              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.day, dayStyle, item.day === selectedDay && styles.selectedDay]}
                  onPress={() => handleDayClick(item)}
                >
                  <Text style={[styles.dayText, item.day === selectedDay && styles.selectedText]}>
                    {item.day}
                  </Text>
                </TouchableOpacity>
              );
            }
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  headerContainer: {
    paddingTop: 50,
    paddingBottom: 20,
    justifyContent: "center",
    alignItems: "center",
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
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
    color: "#2D4535",
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
    borderRadius: 8,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2D4535",
  },
  grayDay: {
    backgroundColor: "#E0E0E0",
  },
  grayText: {
    color: "#757575",
  },
  noneDay: {
    backgroundColor: "#F5F5F5",
  },
  fullShiftDay: {
    backgroundColor: "#C8E6C9", // green
  },
  notFullShiftDay: {
    backgroundColor: "#FFCDD2", // red
  },
  selectedDay: {
    backgroundColor: "#4CAF50",
  },
  selectedText: {
    color: "#FFFFFF",
  },
});
