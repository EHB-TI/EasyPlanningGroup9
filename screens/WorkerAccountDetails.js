import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase, ref, get, update } from "firebase/database";
import { getAuth } from "firebase/auth";

export default function AccountDetails({ navigation }) {
  const [user, setUser] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    fixedDays: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  const auth = getAuth();
  const currentUser = auth.currentUser;
  const database = getDatabase();

  useEffect(() => {
    if (currentUser) {
      const userId = currentUser.uid;
      fetchUser(userId);
    }
  }, [currentUser]);

  const fetchUser = async (userId) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUser({
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          phone: userData.phone || "Niet gespecificeerd",
          email: userData.email || "Niet gespecificeerd",
          fixedDays: userData.fixDay || "Niet gespecificeerd",
        });
      } else {
        console.log("Utilisateur introuvable dans la base de données.");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données utilisateur :", error);
    }
  };

  const handleEdit = () => {
    setIsEditing(!isEditing);
    if (isEditing && currentUser) {
      updateUser();
    }
  };

  const updateUser = async () => {
    try {
      const userId = currentUser.uid;
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, {
        phone: user.phone,
        email: user.email,
      });
      console.log("Les données utilisateur ont été mises à jour.");
    } catch (error) {
      console.error("Erreur lors de la mise à jour des données utilisateur :", error);
    }
  };

  const handleChange = (field, value) => {
    setUser({ ...user, [field]: value });
  };

  const handleNavigateBack = () => {
    navigation.navigate("WorkerHome");
  };

  const firstLetter = user.firstName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#F5F5F5" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={handleNavigateBack}>
            <Ionicons name="arrow-back" size={24} color="#2D4535" />
          </TouchableOpacity>
          <View>
            <Text style={styles.header}>Account Details</Text>
            <Text style={styles.subHeader}>Contract Type: {user.contract || "Niet gespecificeerd"}</Text>
          </View>
          <TouchableOpacity style={styles.profileIcon}>
            <Text style={styles.profileInitial}>{firstLetter}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.whitecontainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Voornaam:</Text>
            <TextInput
              style={[styles.input, isEditing && styles.disabledInput]}
              value={user.firstName}
              editable={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Achternaam:</Text>
            <TextInput
              style={[styles.input, isEditing && styles.disabledInput]}
              value={user.lastName}
              editable={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>GSM:</Text>
            <TextInput
              style={styles.input}
              value={user.phone.toString()}
              editable={isEditing}
              onChangeText={(text) => handleChange("phone", text)}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>E-mail:</Text>
            <TextInput
              style={styles.input}
              value={user.email}
              editable={isEditing}
              onChangeText={(text) => handleChange("email", text)}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Vaste Dagen:</Text>
            <TextInput
              style={[styles.input, isEditing && styles.disabledInput]}
              value={user.fixedDays}
              editable={false}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleEdit}>
            <Text style={styles.buttonText}>{isEditing ? "Accepteren" : "Wijzig gegevens"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    shadowColor: "#000",
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
  input: {
    backgroundColor: "#F6F6F6",
    borderRadius: 10,
    padding: 10,
    color: "#000",
  },
  disabledInput: {
    backgroundColor: "#E0E0E0",
    color: "#A0A0A0",
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
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  safeContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
});
