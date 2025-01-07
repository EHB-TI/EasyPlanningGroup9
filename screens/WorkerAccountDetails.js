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
  Alert,
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
    contract: "",
  });
  const [fixDays, setFixDays] = useState([]);
  const [contractType, setContractType] = useState("");
  const [maxHoursWeek, setMaxHoursWeek] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  const auth = getAuth();
  const currentUser = auth.currentUser;
  const database = getDatabase();

  useEffect(() => {
    if (currentUser) {
      const userId = currentUser.uid;
      fetchUser(userId);
      fetchWorkerData(userId);
    }
  }, [currentUser]);

  const capitalizeFirstLetter = (string) => {
    if (!string) return "";
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const fetchUser = async (userId) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUser({
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          phone: userData.phone || "",
          email: userData.email || "",
          contract: userData.contract || "",
        });
      } else {
        Alert.alert(
          "Gebruiker Niet Gevonden",
          "Er is geen gebruiker gevonden met uw accountgegevens."
        );
      }
    } catch (error) {
      Alert.alert(
        "Fout",
        "Er is een fout opgetreden bij het ophalen van uw gegevens."
      );
    }
  };

  const fetchWorkerData = async (userId) => {
    try {
      const workersRef = ref(database, "workers");
      const workerQuery = query(workersRef, orderByChild("user_id"), equalTo(userId));
      const snapshot = await get(workerQuery);

      if (snapshot.exists()) {
        const workersData = snapshot.val();
        const workerKey = Object.keys(workersData)[0];
        const worker = workersData[workerKey];

        const fixDaysData = worker.fixed_days;
        const contractTypeData = worker.contract_type;
        const maxHoursWeekData = worker.max_hours_week;

        if (fixDaysData) {
          const fixDaysArray = Object.values(fixDaysData).map((day) =>
            capitalizeFirstLetter(day)
          );
          setFixDays(fixDaysArray);
        }

        setContractType(contractTypeData || "");
        setMaxHoursWeek(maxHoursWeekData || 0);
      } else {
        setFixDays([]);
        setContractType("");
        setMaxHoursWeek(0);
      }
    } catch (error) {
      Alert.alert(
        "Fout",
        "Er is een fout opgetreden bij het ophalen van uw worker gegevens."
      );
    }
  };

  const handleEdit = () => {
    if (isEditing) {
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
      Alert.alert("Succes", "Uw gegevens zijn succesvol bijgewerkt.");
    } catch (error) {
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
    navigation.goBack();
  };

  const firstLetter = user.first_name
    ? user.first_name.charAt(0).toUpperCase()
    : "";

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
              style={[
                styles.input,
                !isEditing && styles.editableInput,
                isEditing && styles.disabledInput,
              ]}
              value={user.first_name}
              editable={false}
            />
          </View>

          {/* Last Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Achternaam:</Text>
            <TextInput
              style={[
                styles.input,
                !isEditing && styles.editableInput,
                isEditing && styles.disabledInput,
              ]}
              value={user.last_name}
              editable={false}
            />
          </View>

          {/* Phone */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>GSM:</Text>
            <TextInput
              style={styles.input} // Always white background for GSM
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
              style={styles.input} // Always white background for Email
              value={user.email}
              editable={isEditing}
              keyboardType="email-address"
              onChangeText={(text) => handleChange("email", text)}
            />
          </View>

          {/* Fix Days */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Fix Days:</Text>
            {fixDays.length > 0 ? (
              <View style={styles.fixDaysList}>
                {fixDays.map((day, index) => (
                  <Text key={index} style={styles.fixDay}>
                    {day}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.noFixDays}>No fix days configured</Text>
            )}
          </View>

          {/* Max Hours per Week */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Max Uren per Week:</Text>
            <TextInput
              style={[
                styles.input,
                !isEditing && styles.editableInput,
                isEditing && styles.disabledInput,
              ]}
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
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#000000",
  },
  editableInput: {
    backgroundColor: "#f5f5f5",
  },
  disabledInput: {
    backgroundColor: "#ababab",
    color: "#868686",
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
  fixDaysList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  fixDay: {
    backgroundColor: "#FFE0B2",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    color: "#E65100",
    fontSize: 14,
  },
  noFixDays: {
    fontSize: 14,
    color: "#FF9800",
    fontStyle: "italic",
  },
});
