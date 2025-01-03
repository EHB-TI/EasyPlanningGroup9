import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase, ref, onValue } from "firebase/database";

export default function WorkerMijnplanning({ navigation }) {
  const today = new Date(); // Date actuelle
  const [selectedDay, setSelectedDay] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [acceptedShifts, setAcceptedShifts] = useState([]);

  const database = getDatabase();
  const userId = "currentUserId"; // Remplace par l'ID utilisateur actuel

  const daysOfWeek = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  // Générer les jours du mois
  const generateDaysInMonth = (month, year) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDayPrevMonth = new Date(year, month, 0).getDate();

    const days = [];
    for (let i = 0; i < (firstDayIndex === 0 ? 6 : firstDayIndex - 1); i++) {
      days.push({
        day: lastDayPrevMonth - (firstDayIndex === 0 ? 6 : firstDayIndex - 1) + i,
        isGray: true,
      });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isToday:
          i === today.getDate() &&
          month === today.getMonth() &&
          year === today.getFullYear(),
      });
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

  // Récupérer les shifts acceptés
  const fetchAcceptedShifts = () => {
    const shiftsRef = ref(database, "shifts");
    onValue(shiftsRef, (snapshot) => {
      if (snapshot.exists()) {
        const allShifts = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...data,
        }));
        // Filtrer uniquement les shifts assignés à l'utilisateur actuel
        const assignedShifts = allShifts.filter(
          (shift) =>
            shift.assigned_workers &&
            Array.isArray(shift.assigned_workers) &&
            shift.assigned_workers.includes(userId)
        );
        setAcceptedShifts(assignedShifts);
      }
    });
  };

  useEffect(() => {
    fetchAcceptedShifts();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Mijn Planning</Text>
      </View>

      {/* Calendar */}
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
                item.isToday && styles.today,
                item.day === selectedDay && !item.isGray && styles.selectedDay,
              ]}
              onPress={() => handleDayClick(item)}
            >
              <Text
                style={[
                  styles.dayText,
                  item.isGray && styles.grayText,
                  item.isToday && styles.todayText,
                  item.day === selectedDay && !item.isGray && styles.selectedText,
                ]}
              >
                {item.day || ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Accepted Shifts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Geaccepteerde Shifts</Text>
        {acceptedShifts.length === 0 ? (
          <Text style={styles.noAccepted}>Geen geaccepteerde shifts</Text>
        ) : (
          acceptedShifts.map((shift) => (
            <View key={shift.id} style={styles.acceptedShift}>
              <View>
                <Text style={styles.acceptedShiftDay}>
                  {new Date(shift.date).toLocaleDateString("nl-NL", {
                    weekday: "long",
                  })}
                  , {new Date(shift.date).toLocaleDateString("nl-NL")}
                </Text>
                {shift.fixed_day && (
                  <Text style={styles.fixedDayLabel}>Vaste Dag</Text>
                )}
              </View>
              <Text style={styles.acceptedShiftStatus}>
                {shift.status === "active" ? "Actief" : "Geaccepteerd"}
              </Text>
            </View>
          ))
        )}
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
    shadowColor: "#000",
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
    textAlign: "center",
    flex: 1,
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
  today: {
    borderWidth: 2,
    borderColor: "#4CAF50",
    backgroundColor: "#E8F5E9",
  },
  todayText: {
    color: "#4CAF50",
  },
  selectedDay: {
    backgroundColor: "#4CAF50",
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
  noAccepted: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    marginBottom: 10,
  },
  acceptedShift: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E0F7FA",
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
  },
  acceptedShiftDay: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  fixedDayLabel: {
    fontSize: 12,
    color: "#FF9800",
    marginTop: 4,
    fontStyle: "italic",
  },
  acceptedShiftStatus: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00796B",
  },
});
