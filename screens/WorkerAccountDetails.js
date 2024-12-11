import React from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from "react-native";

export default function AccountDetails() {
  const user = { firstName: "Lucas", lastName: "Huygen", phone: "+0032478965412", email: "naam@mail.com", fixedDays: "maandag, dinsdag...", hours: "20" };
  const firstLetter = user.firstName.charAt(0).toUpperCase(); // Récupérer la première lettre en majuscule

  const handleNavigateToAccount = () => {
    console.log("Navigating to account details");
  };

  const handleEdit = () => {
    console.log("Edit button clicked");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
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
            <Text style={styles.label}>Voornaam:</Text>
            <TextInput style={styles.input} value={user.firstName} editable={false} />
        </View>

        <View style={styles.inputContainer}>
            <Text style={styles.label}>Achternaam:</Text>
            <TextInput style={styles.input} value={user.lastName} editable={false} />
        </View>

        <View style={styles.inputContainer}>
            <Text style={styles.label}>GSM:</Text>
            <TextInput style={styles.input} value={user.phone} editable={false} />
        </View>

        <View style={styles.inputContainer}>
            <Text style={styles.label}>E-mail:</Text>
            <TextInput style={styles.input} value={user.email} editable={false} />
        </View>

        <View style={styles.inputContainer}>
            <Text style={styles.label}>Vaste Dagen:</Text>
            <TextInput style={styles.input} value={user.fixedDays} editable={false} />
        </View>

        <View style={styles.inputContainer}>
            <Text style={styles.label}>Aantal uren:</Text>
            <TextInput style={styles.input} value={user.hours} editable={false} />
        </View>
        
        <TouchableOpacity style={styles.button} onPress={handleEdit}>
            <Text style={styles.buttonText}>Wijzig gegevens</Text>
        </TouchableOpacity>
      </View>

      

      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#E5F3F6",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2D4535"
  },
  subHeader: {
    fontSize: 16,
    color: "#2D4535"
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
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    
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
    padding: 30
  }

});
