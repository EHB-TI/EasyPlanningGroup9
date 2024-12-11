import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from "react-native";

export default function AccountDetails() {
  const [userDetails, setUserDetails] = useState({
    firstName: "Lucas",
    lastName: "Huygen",
    phone: "+0032478965412",
    email: "naam@mail.com",
    fixedDays: "maandag, dinsdag...",
    hours: "20",
  });

  const handleEdit = () => {
    // Logic for editing details can be added here
    console.log("Edit button clicked");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Account Details</Text>
      <Text style={styles.subHeader}>Contract Type: soort type</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Voornaam:</Text>
        <TextInput
          style={styles.input}
          value={userDetails.firstName}
          editable={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Achternaam:</Text>
        <TextInput
          style={styles.input}
          value={userDetails.lastName}
          editable={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>GSM:</Text>
        <TextInput
          style={styles.input}
          value={userDetails.phone}
          editable={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>E-mail:</Text>
        <TextInput
          style={styles.input}
          value={userDetails.email}
          editable={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Vaste Dagen:</Text>
        <TextInput
          style={styles.input}
          value={userDetails.fixedDays}
          editable={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Aantal uren:</Text>
        <TextInput
          style={styles.input}
          value={userDetails.hours}
          editable={false}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleEdit}>
        <Text style={styles.buttonText}>Wijzig gegevens</Text>
      </TouchableOpacity>
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
    marginBottom: 10,
    textAlign: "center",
  },
  subHeader: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 5,
    padding: 10,
    backgroundColor: "#FFFFFF",
  },
  button: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
