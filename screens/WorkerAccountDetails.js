import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

 
export default function AccountDetails({ navigation }) {
  const [user, setUser] = useState({
    firstName: "Lucas",
    lastName: "Huygen",
    phone: "+0032478965412",
    email: "naam@mail.com",
    fixedDays: "maandag, dinsdag...",
    hours: "20"
  });
  const [isEditing, setIsEditing] = useState(false);
 
  const firstLetter = user.firstName.charAt(0).toUpperCase(); // Récupérer la première lettre en majuscule
 
  const handleNavigateToAccount = () => {
    navigation.navigate('WorkerAccountDetails', { user });
  };

  const handleNavigateBack = () => {
    navigation.navigate('WorkerHome');
  };

  const handleEdit = () => {
    setIsEditing(!isEditing);
  };
 
  const handleChange = (field, value) => {
    setUser({ ...user, [field]: value });
  };
 
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
      <TouchableOpacity onPress={handleNavigateBack}>
        <Ionicons name="arrow-back" size={24} color="#2D4535" />
      </TouchableOpacity>
        <View>
          <Text style={styles.header}>Account Details</Text>
          <Text style={styles.subHeader}>Contract Type: soort type</Text>
        </View>
        <TouchableOpacity style={styles.profileIcon} onPress={handleNavigateToAccount}>
          <Text style={styles.profileInitial}>{firstLetter}</Text>
        </TouchableOpacity>
      </View>
 
      <View style={styles.whitecontainer}>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, isEditing && styles.editLabel]}>Voornaam:</Text>
          <TextInput
            style={styles.input}
            value={user.firstName}
            editable={isEditing}
            onChangeText={(text) => handleChange("firstName", text)}
          />
        </View>
 
        <View style={styles.inputContainer}>
          <Text style={[styles.label, isEditing && styles.editLabel]}>Achternaam:</Text>
          <TextInput
            style={styles.input}
            value={user.lastName}
            editable={isEditing}
            onChangeText={(text) => handleChange("lastName", text)}
          />
        </View>
 
        <View style={styles.inputContainer}>
          <Text style={[styles.label, isEditing && styles.editLabel]}>GSM:</Text>
          <TextInput
            style={styles.input}
            value={user.phone}
            editable={isEditing}
            onChangeText={(text) => handleChange("phone", text)}
          />
        </View>
 
        <View style={styles.inputContainer}>
          <Text style={[styles.label, isEditing && styles.editLabel]}>E-mail:</Text>
          <TextInput
            style={styles.input}
            value={user.email}
            editable={isEditing}
            onChangeText={(text) => handleChange("email", text)}
          />
        </View>
 
        <View style={styles.inputContainer}>
          <Text style={[styles.label, isEditing && styles.editLabel]}>Vaste Dagen:</Text>
          <TextInput
            style={styles.input}
            value={user.fixedDays}
            editable={isEditing}
            onChangeText={(text) => handleChange("fixedDays", text)}
          />
        </View>
 
        <View style={styles.inputContainer}>
          <Text style={[styles.label, isEditing && styles.editLabel]}>Aantal uren:</Text>
          <TextInput
            style={styles.input}
            value={user.hours}
            editable={isEditing}
            onChangeText={(text) => handleChange("hours", text)}
          />
        </View>
 
        <TouchableOpacity style={styles.button} onPress={handleEdit}>
          <Text style={styles.buttonText}>{isEditing ? "Accepteren" : "Wijzig gegevens"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    
  );
}
 
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#F5F5F5",
    
  },
  headerContainer: {
    paddingTop: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2D4535",
  },
  subHeader: {
    fontSize: 16,
    color: "#2D4535",
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2D4535",
    justifyContent: "center",
    alignItems: "center",
  },
  profileInitial: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  inputContainer: {
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: "#F6F6F6",
    padding: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
        color: "#999999",
 
  },
  editLabel: {
    color: "#505050",
  },
  input: {
    backgroundColor: "#F6F6F6",
    borderRadius: 10,
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
  whitecontainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 30,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
});