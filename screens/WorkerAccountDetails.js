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
  Alert, // Import Alert for user feedback
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getDatabase,
  ref,
  get,
  update,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";
import { getAuth } from "firebase/auth";

export default function AccountDetails({ navigation }) {
  const [user, setUser] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    contract: "", // From 'users' node
  });
  const [fixedDays, setFixedDays] = useState([]);
  const [contractType, setContractType] = useState(""); // From 'workers' node
  const [maxHoursWeek, setMaxHoursWeek] = useState(0); // From 'workers' node
  const [isEditing, setIsEditing] = useState(false);

  const auth = getAuth();
  const currentUser = auth.currentUser;
  const database = getDatabase();

  useEffect(() => {
    if (currentUser) {
      const userId = currentUser.uid;
      fetchUser(userId);
      fetchWorkerData(userId); // Fetch worker-related data
    }
  }, [currentUser]);

  // Helper function to capitalize the first letter
  const capitalizeFirstLetter = (string) => {
    if (!string) return "";
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  // Function to fetch user data from 'users' node
  const fetchUser = async (userId) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUser({
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          phone: userData.phone || "Niet gespecificeerd",
          email: userData.email || "Niet gespecificeerd",
          contract: userData.contract || "Niet gespecificeerd",
        });
      } else {
        console.log("Gebruiker niet gevonden in de database.");
        Alert.alert(
          "Gebruiker Niet Gevonden",
          "Er is geen gebruiker gevonden met uw accountgegevens."
        );
      }
    } catch (error) {
      console.error("Fout bij het ophalen van gebruikersgegevens:", error);
      Alert.alert(
        "Fout",
        "Er is een fout opgetreden bij het ophalen van uw gegevens."
      );
    }
  };

  // Function to fetch worker data including fixed_days, contract_type, and max_hours_week
  const fetchWorkerData = async (userId) => {
    try {
      const workersRef = ref(database, "workers");
      const workerQuery = query(workersRef, orderByChild("user_id"), equalTo(userId));
      const snapshot = await get(workerQuery);

      if (snapshot.exists()) {
        const workersData = snapshot.val();
        // Assuming user_id is unique, get the first worker
        const workerKeys = Object.keys(workersData);
        if (workerKeys.length > 0) {
          const worker = workersData[workerKeys[0]];
          const fixedDaysData = worker.fixed_days;
          const contractTypeData = worker.contract_type;
          const maxHoursWeekData = worker.max_hours_week;

          // Convert fixed_days object to an array
          const fixedDaysArray = fixedDaysData
            ? Object.values(fixedDaysData).map((day) => capitalizeFirstLetter(day))
            : [];
          setFixedDays(fixedDaysArray);

          setContractType(contractTypeData || "Niet gespecificeerd");
          setMaxHoursWeek(maxHoursWeekData || 0);
        }
      } else {
        console.log("Geen worker gevonden met deze user_id.");
        setFixedDays([]);
        setContractType("Niet gespecificeerd");
        setMaxHoursWeek(0);
      }
    } catch (error) {
      console.error("Fout bij het ophalen van worker data:", error);
      Alert.alert(
        "Fout",
        "Er is een fout opgetreden bij het ophalen van uw worker gegevens."
      );
    }
  };

  const handleEdit = () => {
    if (isEditing) {
      // If currently editing, save the changes
      updateUser();
    }
    setIsEditing(!isEditing);
  };

  const updateUser = async () => {
    try {
      const userId = currentUser.uid;
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, {
        phone: user.phone,
        email: user.email,
      });
      console.log("Gebruikersgegevens succesvol bijgewerkt.");
      Alert.alert("Succes", "Uw gegevens zijn succesvol bijgewerkt.");
    } catch (error) {
      console.error("Fout bij het bijwerken van gebruikersgegevens:", error);
      Alert.alert(
        "Fout",
        "Er is een fout opgetreden bij het bijwerken van uw gegevens."
      );
    }
  };

  const handleChange = (field, value) => {
    setUser({ ...user, [field]: value });
  };

  const handleNavigateBack = () => {
    navigation.navigate("WorkerHome");
  };

  // Handle case where first_name might be empty
  const firstLetter = user.first_name ? user.first_name.charAt(0).toUpperCase() : "";

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* HEADER */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={handleNavigateBack}>
            <Ionicons name="arrow-back" size={24} color="#2D4535" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.header}>Account Details</Text>
            <Text style={styles.subHeader}>Contract Type: {contractType}</Text>
          </View>
          <TouchableOpacity style={styles.profileIcon}>
            <Text style={styles.profileInitial}>{firstLetter}</Text>
          </TouchableOpacity>
        </View>

        {/* USER INFORMATION */}
        <View style={styles.whiteContainer}>
          {/* First Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Voornaam:</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={user.first_name}
              editable={false}
            />
          </View>

          {/* Last Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Achternaam:</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={user.last_name}
              editable={false}
            />
          </View>

          {/* Phone */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>GSM:</Text>
            <TextInput
              style={styles.input}
              value={user.phone.toString()}
              editable={isEditing}
              keyboardType="phone-pad"
              onChangeText={(text) => handleChange("phone", text)}
            />
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>E-mail:</Text>
            <TextInput
              style={styles.input}
              value={user.email}
              editable={isEditing}
              keyboardType="email-address"
              onChangeText={(text) => handleChange("email", text)}
            />
          </View>

          {/* Fixed Days */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Vaste Dagen:</Text>
            {fixedDays.length > 0 ? (
              <View style={styles.fixedDaysList}>
                {fixedDays.map((day, index) => (
                  <Text key={index} style={styles.fixedDay}>
                    {day}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.noFixedDays}>Geen vaste dagen ingesteld</Text>
            )}
          </View>

          {/* Max Hours per Week */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Max Uren per Week:</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={maxHoursWeek.toString()}
              editable={false}
            />
          </View>

          {/* Edit Button */}
          <TouchableOpacity style={styles.button} onPress={handleEdit}>
            <Text style={styles.buttonText}>
              {isEditing ? "Accepteren" : "Wijzig gegevens"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#F5F5F5",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: "center",
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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2D4535",
    justifyContent: "center",
    alignItems: "center",
  },
  profileInitial: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  whiteContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 25,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: "#555555",
  },
  input: {
    backgroundColor: "#F6F6F6",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#000000",
  },
  disabledInput: {
    backgroundColor: "#E0E0E0",
    color: "#A0A0A0",
  },
  button: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  fixedDaysList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  fixedDay: {
    backgroundColor: "#FFE0B2",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    color: "#E65100",
    fontSize: 14,
  },
  noFixedDays: {
    fontSize: 14,
    color: "#FF9800",
    fontStyle: "italic",
  },
});
