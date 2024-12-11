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