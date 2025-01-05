import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase, ref, onValue } from "firebase/database";
import { getAuth } from "firebase/auth";
export default function WorkerMijnplanning({ navigation }) {
  // Huidige datum
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // Data van Firebase
  const [shifts, setShifts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // Gebruikers-ID (vervang met echte ID, bijvoorbeeld auth.currentUser.uid)
  const auth = getAuth();
const userId = auth.currentUser ? auth.currentUser.uid : null;

  // Dagen van de week in het Nederlands
  const daysOfWeek = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  // ------------------ DATA OPHALEN ------------------
  useEffect(() => {
    if (!userId) {
      Alert.alert("Error", "No user is logged in. Please log in to view your planning.");
      navigation.navigate("Login"); // Redirect to the login screen
      return;
    }
  
    const db = getDatabase();
  
    // Shifts ophalen
    const shiftsRef = ref(db, "shifts");
    onValue(shiftsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const shiftsArray = Object.entries(data).map(([id, obj]) => ({
          id,
          ...obj,
        }));
        setShifts(shiftsArray);
      } else {
        setShifts([]);
      }
    });

    const appsRef = ref(db, "applications");
  onValue(appsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const appsArray = Object.entries(data).map(([id, obj]) => ({
        id,
        ...obj,
      }));
      setApplications(appsArray);
    } else {
      setApplications([]);
    }
  });


    // Assignments ophalen
    const assignRef = ref(db, "assignments");
    onValue(assignRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const assignArray = Object.entries(data).map(([id, obj]) => ({
          id,
          ...obj,
        }));
        setAssignments(assignArray);
      } else {
        setAssignments([]);
      }
    });
  }, [userId]);

  // ------------------ CALENDAR LOGICA ------------------
  const generateDaysInMonth = (month, year) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDayPrevMonth = new Date(year, month, 0).getDate();

    const days = [];
    // Grijze dagen van vorige maand
    for (let i = 0; i < (firstDayIndex === 0 ? 6 : firstDayIndex - 1); i++) {
      days.push({
        day: lastDayPrevMonth - (firstDayIndex === 0 ? 6 : firstDayIndex - 1) + i,
        isGray: true,
        dateObj: null,
      });
    }
    // Dagen van huidige maand
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isGray: false,
        dateObj: new Date(year, month, i),
      });
    }
    // Grijze dagen van volgende maand
    const remainingDays = 7 - (days.length % 7);
    for (let i = 1; i <= (remainingDays === 7 ? 0 : remainingDays); i++) {
      days.push({
        day: i,
        isGray: true,
        dateObj: null,
      });
    }
    return days;
  };

  const daysInMonth = generateDaysInMonth(currentMonth, currentYear);

  // Maand veranderen
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

  // Dag aanklikken
  const handleDayClick = (dayItem) => {
    if (!dayItem.isGray) {
      setSelectedDay(dayItem.day);
    }
  };

  // ------------------ STATUS SETTEN ------------------
  const userAcceptedDates = new Set();
  const userPendingDates = new Set();
  const userPastAcceptedDates = new Set();

  // Huidige tijd zonder uren
  const nowMidnight = new Date();
  nowMidnight.setHours(0, 0, 0, 0);

  // Hulp functie: Datum naar string
  const toDateString = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // 1) Shifts => gebruiker toegewezen => geaccepteerd
  shifts.forEach((shift) => {
    // Zorg dat assigned_workers een array is
    const assignedWorkers = Array.isArray(shift.assigned_workers)
      ? shift.assigned_workers
      : [];
    if (assignedWorkers.includes(userId) && shift.date) {
      const dateObj = new Date(shift.date);
      if (dateObj < nowMidnight) {
        userPastAcceptedDates.add(shift.date);
      } else {
        userAcceptedDates.add(shift.date);
      }
    }
  });

  // 2) Applications => status="applied" => in afwachting
  applications.forEach((app) => {
    if (app.worker_id === userId && app.status === "applied") {
      userPendingDates.add(app.shift_date);
    }
  });

  // 3) Assignments => ook controleren of gebruiker is toegewezen
  assignments.forEach((a) => {
    if (a.user_id === userId && a.shift_id) {
      // Zoek de shift datum
      const foundShift = shifts.find((s) => s.id === a.shift_id);
      if (foundShift && foundShift.date) {
        const dateObj = new Date(foundShift.date);
        if (dateObj < nowMidnight) {
          userPastAcceptedDates.add(foundShift.date);
        } else {
          userAcceptedDates.add(foundShift.date);
        }
      }
    }
  });

  // Bepaal de status van een datum
  const getDateStatus = (dateObj) => {
    if (!dateObj) return null;
    const dateStr = toDateString(dateObj);

    if (userPastAcceptedDates.has(dateStr)) return "pastAccepted";
    if (userAcceptedDates.has(dateStr)) return "accepted";
    if (userPendingDates.has(dateStr)) return "pending";
    return "none";
  };

  // -------------- Lijst van Toekomstige Geaccepteerde Shifts --------------
  const futureAcceptedShifts = shifts.filter((shift) => {
    if (!shift.date) return false;
    // Controleer of gebruiker is toegewezen
    const assignedWorkers = Array.isArray(shift.assigned_workers)
      ? shift.assigned_workers
      : [];
    const isAssigned = assignedWorkers.includes(userId);

    // Controleer ook assignments
    const hasAssignment = assignments.some(
      (a) => a.user_id === userId && a.shift_id === shift.id
    );

    if (isAssigned || hasAssignment) {
      const shiftDateObj = new Date(shift.date);
      return shiftDateObj >= nowMidnight; // toekomst of vandaag
    }
    return false;
  });

  // -------------- RENDEREN --------------
  return (
    // Scrollbaar container
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Mijn Planning</Text>
      </View>

      {/* CALENDAR */}
      <View style={styles.calendarContainer}>
        {/* Maand Header */}
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

        {/* Dagen van de Week */}
        <View style={styles.daysOfWeekContainer}>
          {daysOfWeek.map((dow, i) => (
            <Text key={i} style={styles.dayOfWeekText}>
              {dow}
            </Text>
          ))}
        </View>

        {/* Dagen in de Maand */}
        <View style={styles.daysContainer}>
          {daysInMonth.map((item, i) => {
            if (item.isGray) {
              // Grijze dagen van vorige/volgende maand
              return (
                <View key={i} style={[styles.day, styles.grayDay]}>
                  <Text style={[styles.dayText, styles.grayText]}>
                    {item.day}
                  </Text>
                </View>
              );
            } else {
              // Huidige maand dagen
              const dateStatus = getDateStatus(item.dateObj);
              let dayStyle = null;
              switch (dateStatus) {
                case "pastAccepted":
                  dayStyle = styles.pastAcceptedDay; // bijvoorbeeld paars
                  break;
                case "accepted":
                  dayStyle = styles.acceptedDay; // groen
                  break;
                case "pending":
                  dayStyle = styles.pendingDay; // oranje
                  break;
                default:
                  dayStyle = styles.noneDay; // standaard
                  break;
              }
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.day,
                    dayStyle,
                    item.day === selectedDay && styles.selectedDay,
                  ]}
                  onPress={() => handleDayClick(item)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      item.day === selectedDay && styles.selectedText,
                    ]}
                  >
                    {item.day}
                  </Text>
                </TouchableOpacity>
              );
            }
          })}
        </View>
      </View>

      {/* TOEKOMSTIGE GEACCEPTEERDE SHIFTS */}
      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>
          Geaccepteerde Shifts (Toekomst)
        </Text>
        {futureAcceptedShifts.length === 0 ? (
          <Text style={styles.noAccepted}>Geen geaccepteerde shifts</Text>
        ) : (
          futureAcceptedShifts.map((shift) => (
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
              <Text style={styles.acceptedShiftStatus}>Geaccepteerd</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ------------------ STYLES ------------------
const styles = StyleSheet.create({
  // Hoofd container
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  // Header
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
  // Kalender container
  calendarContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  // Maand header container
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
  // Dagen van de week
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
  // Dagen container
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10,
  },
  // Individuele dag
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
  // Grijze dagen (vorige/volgende maand)
  grayDay: {
    backgroundColor: "#E0E0E0",
  },
  grayText: {
    color: "#757575",
  },
  // Standaard dag zonder status
  noneDay: {
    backgroundColor: "#F5F5F5",
  },
  // Past accepted days
  pastAcceptedDay: {
    backgroundColor: "#B39DDB", // paars
  },
  // Geaccepteerde dagen
  acceptedDay: {
    backgroundColor: "#C8E6C9", // licht groen
  },
  // Pending dagen
  pendingDay: {
    backgroundColor: "#FFE0B2", // licht oranje
  },
  // Geselecteerde dag
  selectedDay: {
    backgroundColor: "#4CAF50",
  },
  selectedText: {
    color: "#FFFFFF",
  },

  // Lijst sectie
  listSection: {
    marginHorizontal: 20,
    marginBottom: 20,
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
  },
  // Individuele geaccepteerde shift
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
