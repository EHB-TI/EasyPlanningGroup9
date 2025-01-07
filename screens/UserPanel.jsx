import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  getDatabase,
  ref,
  get,
  child,
  update,
  set,
} from "firebase/database";

const AdminPanelScreen = ({ route, navigation }) => {
  

  // ----------------------------------------------------------------
  // STATE
  // ----------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  
  const [expandedSections, setExpandedSections] = useState({
    "Pending Users": true,  // Auto-expand Pending Users

    
  });
  const [refreshing, setRefreshing] = useState(false);

  // State for inputs
  const [userInputs, setUserInputs] = useState({});

  // State for editing
  const [editingUserId, setEditingUserId] = useState(null);
  const [editFields, setEditFields] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    role: "",
    sap_number: "",
    contract_type: "",
    fixed_days: "",
    max_hours_week: "",
  });

  // ----------------------------------------------------------------
  // CONSTANTS / OPTIONS
  // ----------------------------------------------------------------
  const roleOptions = ["manager", "worker"];
  const contractOptions = ["CDI", "CDD", "Student"];
  const validDays = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  // Used for sorting approved users by contract_type
  const contractOrder = {
    CDI: 1,
    CDD: 2,
    Student: 3,
  };
  const filter = route.params?.filter || "all";
  // ----------------------------------------------------------------
  // LIFECYCLE: FETCH USERS ONCE COMPONENT MOUNTS
  // ----------------------------------------------------------------
  useEffect(() => {
    fetchUsers(filter);
  }, [filter]);
  

  // ----------------------------------------------------------------
  // FETCH USERS
  // ----------------------------------------------------------------
  const fetchUsers = async (filter) => {
    try {
      setLoading(true);
  
      const db = getDatabase();
      const dbRef = ref(db);
  
      // Fetch users
      const usersSnapshot = await get(child(dbRef, "users"));
      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();
  
        // Fetch workers
        const workersSnapshot = await get(child(dbRef, "workers"));
        const workersData = workersSnapshot.exists() ? workersSnapshot.val() : {};
  
        let filteredUsers = [];
  
        // Filter users and attach worker details if applicable
        Object.entries(usersData).forEach(([id, user]) => {
          if (filter === "pending" && user.status === "pending") {
            filteredUsers.push({ id, ...user });
          } else if (filter === "approved" && user.status === "approved") {
            // Attach worker details if the user is a worker
            const workerDetails = Object.values(workersData).find(
              (worker) => worker.user_id === id
            );
  
            // Convert fixed_days to array if it's an object
            if (workerDetails && typeof workerDetails.fixed_days === "object") {
              workerDetails.fixed_days = Object.values(workerDetails.fixed_days);
            }
  
            filteredUsers.push({ id, ...user, ...workerDetails });
          }
        });
  
        setUsers(filteredUsers);
      } else {
        setUsers([]); // Handle case where no users are found
      }
  
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      setLoading(false);
    }
  };
  
  
  
  
  

  // ----------------------------------------------------------------
  // APPROVE USER
  // ----------------------------------------------------------------
  const handleApproveUser = async (user) => {
    const userInput = userInputs[user.id] || {};
  
    if (!userInput.sapNumber) {
      Alert.alert("Error", "Please provide an SAP number.");
      return;
    }
  
    if (userInput.role === "worker") {
      if (!userInput.fixDay || !userInput.contractType || !userInput.maxHoursWeek) {
        Alert.alert("Error", "Please fill in all fields for the worker before approving.");
        return;
      }
  
      const enteredDays = userInput.fixDay
        .toLowerCase()
        .split(",")
        .map((day) => day.trim());
      const invalidDays = enteredDays.filter((day) => !validDays.includes(day));
  
      if (invalidDays.length > 0) {
        Alert.alert(
          "Invalid Fixed Days",
          `The following days are invalid: ${invalidDays.join(", ")}. Please use lowercase day names like "monday".`
        );
        return;
      }
  
      try {
        const workerId = `worker_${Math.random().toString(36).substr(2, 9)}`;
  
        const workersRef = ref(getDatabase(), `workers/${workerId}`);
        await set(workersRef, {
          user_id: user.id,
          contract_type: userInput.contractType,
          fixed_days: enteredDays,
          max_hours_week: parseInt(userInput.maxHoursWeek, 10),
        });
  
        const userRef = ref(getDatabase(), `users/${user.id}`);
        await update(userRef, {
          status: "approved",
          role: userInput.role,
          sap_number: userInput.sapNumber,
          worker_id: workerId,
        });
  
        Alert.alert("Success", `${user.first_name} has been approved and added as a worker.`);
        fetchUsers(filter);
        resetFields(user.id);
      } catch (error) {
        console.error("Error approving worker:", error);
        Alert.alert("Error", "Failed to approve the worker.");
      }
    } else if (userInput.role === "manager") {
      try {
        const userRef = ref(getDatabase(), `users/${user.id}`);
        await update(userRef, {
          status: "approved",
          role: userInput.role,
          sap_number: userInput.sapNumber,
        });
  
        Alert.alert("Success", `${user.first_name} has been approved as a manager.`);
        fetchUsers(filter);
        resetFields(user.id);
      } catch (error) {
        console.error("Error approving manager:", error);
        Alert.alert("Error", "Failed to approve the manager.");
      }
    }
  };
  

  // ----------------------------------------------------------------
  // RESET FIELDS AFTER APPROVAL
  // ----------------------------------------------------------------
  const resetFields = (userId) => {
    setUserInputs((prev) => ({
      ...prev,
      [userId]: {
        role: "",
        contractType: "",
        fixDay: "",
        maxHoursWeek: "",
        sapNumber: "",
      },
    }));
  };

  // ----------------------------------------------------------------
  // SEARCH USERS
  // ----------------------------------------------------------------
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query) {
      fetchUsers(filter);
      return;
    }

    const lowerCaseQuery = query.toLowerCase();
    const filteredUsers = users.filter((user) =>
      Object.values(user).some((val) =>
        String(val).toLowerCase().includes(lowerCaseQuery)
      )
    );
    setUsers(filteredUsers);
  };

  

  // ----------------------------------------------------------------
  // TOGGLE SECTION EXPANSION
  // ----------------------------------------------------------------
  const toggleSection = (title) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // ----------------------------------------------------------------
  // EDIT (SETUP)
  // ----------------------------------------------------------------
  const handleEdit = (user) => {
    setEditingUserId(user.id);
    setEditFields({
      contract_type: user.contract_type || "",
      fixed_days: Array.isArray(user.fixed_days) ? user.fixed_days.join(", ") : "",
      max_hours_week: user.max_hours_week ? user.max_hours_week.toString() : "",
    });
  };
  
  // ----------------------------------------------------------------
  // delete user 
  // ----------------------------------------------------------------
  const handleDeleteUser = async (user) => {
    try {
      const db = getDatabase();
  
      // Delete user from 'users' node
      const userRef = ref(db, `users/${user.id}`);
      await set(userRef, null); // Use set(null) to delete a node
  
      // If the user is a worker, delete their data from 'workers' node
      if (user.worker_id) {
        const workerRef = ref(db, `workers/${user.worker_id}`);
        await set(workerRef, null); // Use set(null) to delete a node
      }
  
      Alert.alert("Success", `${user.first_name} ${user.last_name} has been deleted.`);
      fetchUsers(filter); // Refresh the list
    } catch (error) {
      console.error("Error deleting user:", error);
      Alert.alert("Error", "Failed to delete the user.");
    }
  };
  
  
  // ----------------------------------------------------------------
  // SAVE EDIT
  // ----------------------------------------------------------------
  const handleSaveEdit = async (user) => {
    try {
      const db = getDatabase();
  
      // Update worker fields in the 'workers' node
      if (user.worker_id) {
        const workersRef = ref(db, `workers/${user.worker_id}`);
        const workerUpdates = {
          contract_type: editFields.contract_type || user.contract_type,
          fixed_days: editFields.fixed_days
            ?.toLowerCase()
            .split(",")
            .map((day) => day.trim()) || user.fixed_days,
          max_hours_week: parseInt(editFields.max_hours_week, 10) || user.max_hours_week,
        };
  
        await update(workersRef, workerUpdates);
      }
  
      Alert.alert("Success", "Worker information has been updated.");
      setEditingUserId(null);
      fetchUsers(filter); // Refresh the users list after saving
    } catch (error) {
      console.error("Error updating worker:", error);
      Alert.alert("Error", "Failed to update worker information.");
    }
  };
  
  

  // ----------------------------------------------------------------
  // CANCEL EDIT
  // ----------------------------------------------------------------
  const handleCancelEdit = () => {
    setEditingUserId(null);
  };

  // ----------------------------------------------------------------
  // RENDER HELPER: USER DETAIL
  // ----------------------------------------------------------------
  const renderUserDetail = (label, value) => {
    if (value !== undefined && value !== null && value !== "" && value !== "N/A") {
      // Convert arrays to a comma-separated string
      const displayValue = Array.isArray(value) ? value.join(", ") : value;
  
      return (
        <Text style={styles.userDetail}>
          {label}: {displayValue}
        </Text>
      );
    }
    return null;
  };
  
  

  // ----------------------------------------------------------------
  // RENDER ITEM
  // ----------------------------------------------------------------
  const renderItem = ({ item }) => {
    const userInput = userInputs[item.id] || {};
  
    return (
      <View style={styles.userCard}>
        <Text style={styles.userName}>
          {item.first_name} {item.last_name}
        </Text>
  
        {renderUserDetail("Email", item.email)}
        
  
        {/* Show worker details */}
        {item.role === "worker" && (
          <>
            {renderUserDetail("Contract Type", item.contract_type)}
            {renderUserDetail("Fixed Days", item.fixed_days)}
            {renderUserDetail("Max Hours/Week", item.max_hours_week)}
          </>
        )}
  
        {/* Input fields for pending users */}
        {filter === "pending" ? (
          <>
            <Picker
              selectedValue={userInput.role || ""}
              style={styles.picker}
              onValueChange={(value) =>
                setUserInputs((prev) => ({
                  ...prev,
                  [item.id]: {
                    ...prev[item.id],
                    role: value,
                  },
                }))
              }
            >
              <Picker.Item label="Select Role" value="" />
              {roleOptions.map((r) => (
                <Picker.Item key={r} label={r} value={r} />
              ))}
            </Picker>
  
            {userInput.role === "worker" && (
              <>
                <Picker
                  selectedValue={userInput.contractType || ""}
                  style={styles.picker}
                  onValueChange={(value) =>
                    setUserInputs((prev) => ({
                      ...prev,
                      [item.id]: {
                        ...prev[item.id],
                        contractType: value,
                      },
                    }))
                  }
                >
                  <Picker.Item label="Select Contract Type" value="" />
                  {contractOptions.map((ct) => (
                    <Picker.Item key={ct} label={ct} value={ct} />
                  ))}
                </Picker>
  
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter Fixed Days (e.g., monday,tuesday)"
                  value={userInput.fixDay || ""}
                  onChangeText={(text) =>
                    setUserInputs((prev) => ({
                      ...prev,
                      [item.id]: {
                        ...prev[item.id],
                        fixDay: text,
                      },
                    }))
                  }
                />
  
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter Max Hours per Week"
                  keyboardType="numeric"
                  value={userInput.maxHoursWeek || ""}
                  onChangeText={(text) =>
                    setUserInputs((prev) => ({
                      ...prev,
                      [item.id]: {
                        ...prev[item.id],
                        maxHoursWeek: text,
                      },
                    }))
                  }
                />
              </>
            )}
  
            <TextInput
              style={styles.textInput}
              placeholder="Enter SAP Number"
              value={userInput.sapNumber || ""}
              onChangeText={(text) =>
                setUserInputs((prev) => ({
                  ...prev,
                  [item.id]: {
                    ...prev[item.id],
                    sapNumber: text,
                  },
                }))
              }
            />
  
            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => handleApproveUser(item)}
            >
              <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>
          </>
        ) : filter === "approved" ? (
          <>
            {editingUserId === item.id ? (
              <>
                {/* Editable fields for approved users */}
                <Picker
                  selectedValue={editFields.contract_type || item.contract_type || ""}
                  style={styles.picker}
                  onValueChange={(value) =>
                    setEditFields((prev) => ({
                      ...prev,
                      contract_type: value,
                    }))
                  }
                >
                  <Picker.Item label="Select Contract Type" value="" />
                  {contractOptions.map((ct) => (
                    <Picker.Item key={ct} label={ct} value={ct} />
                  ))}
                </Picker>
  
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter Fixed Days (e.g., monday,tuesday)"
                  value={editFields.fixed_days || (Array.isArray(item.fixed_days) ? item.fixed_days.join(", ") : "")}
                  onChangeText={(text) =>
                    setEditFields((prev) => ({
                      ...prev,
                      fixed_days: text,
                    }))
                  }
                />
  
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter Max Hours per Week"
                  keyboardType="numeric"
                  value={editFields.max_hours_week || item.max_hours_week?.toString() || ""}
                  onChangeText={(text) =>
                    setEditFields((prev) => ({
                      ...prev,
                      max_hours_week: text,
                    }))
                  }
                />
  
                <View style={styles.editButtonsContainer}>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={() => handleSaveEdit(item)}
                  >
                    <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
  
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelEdit}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEdit(item)}
              >
                <Ionicons name="pencil" size={16} color="#fff" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
            {/* Delete User Button */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() =>
              Alert.alert(
                "Delete User",
                `Are you sure you want to delete ${item.first_name} ${item.last_name}?`,
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", onPress: () => handleDeleteUser(item) },
                ]
              )
            }
          >
            <Ionicons name="trash" size={16} color="#fff" />
            <Text style={styles.deleteButtonText}>Delete User</Text>
          </TouchableOpacity>
          </>
        ) : null}
      </View>
    );
  };
  
  
  
  

  // ----------------------------------------------------------------
  // RENDER SECTION HEADER
  // ----------------------------------------------------------------
  const renderSectionHeader = ({ section }) => {
    return (
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection(section.title)}
      >
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Ionicons
          name={expandedSections[section.title] ? "chevron-up" : "chevron-down"}
          size={20}
          color="#333"
        />
      </TouchableOpacity>
    );
  };

  // ----------------------------------------------------------------
  // MAIN RENDER (UI)
  // ----------------------------------------------------------------
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BFA6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
<View style={styles.header}>
  <TouchableOpacity
    onPress={() => navigation.goBack()}
    style={styles.backButton}
  >
    <Ionicons name="arrow-back" size={24} color="#333" />
  </TouchableOpacity>
  <Text style={styles.mainTitle}>
    {filter === "pending" ? "Pending Accounts" : "Approved Accounts"}
  </Text>
</View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search users..."
        value={searchQuery}
        onChangeText={handleSearch}
      />

<FlatList
  data={users}
  keyExtractor={(item) => item.id}
  renderItem={renderItem}
  edit
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => fetchUsers(filter)}
    />
  }
/>

    </SafeAreaView>
  );
};

// ----------------------------------------------------------------
// STYLES
// ----------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EAF6F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    marginRight: 10,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  searchInput: {
    margin: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#DADFE1",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#F2F5F7",
    borderRadius: 8,
    marginHorizontal: 10,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 15,
    margin: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  userDetail: {
    fontSize: 14,
    color: "#555",
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  picker: {
    marginVertical: 10,
    backgroundColor: "#F2F5F7",
    borderRadius: 8,
    padding: 10,
  },
  textInput: {
    marginVertical: 5,
    padding: 10,
    borderWidth: 1,
    borderColor: "#DADFE1",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  approveButton: {
    backgroundColor: "#27AE60",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    marginTop: 10,
  },
  editButton: {
    flexDirection: "row",
    backgroundColor: "#27AE60",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    marginTop: 10,
  },
  editButtonText: {
    color: "#fff",
    marginLeft: 5,
    fontWeight: "600",
  },
  editButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: "#27AE60",
    borderRadius: 8,
    padding: 10,
    flex: 1,
    alignItems: "center",
    marginRight: 5,
  },
  cancelButton: {
    backgroundColor: "#C0392B",
    borderRadius: 8,
    padding: 10,
    flex: 1,
    alignItems: "center",
    marginLeft: 5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#C0392B",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  deleteButtonText: {
    color: "#fff",
    marginLeft: 5,
    fontWeight: "600",
  },
  
});

// ----------------------------------------------------------------
// FINAL EXPORT
// ----------------------------------------------------------------
export default AdminPanelScreen;
