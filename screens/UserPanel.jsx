import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
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

const AdminPanelScreen = () => {
  const navigation = useNavigation();

  // ----------------------------------------------------------------
  // STATE
  // ----------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSections, setFilteredSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  // State for inputs
  const [role, setRole] = useState("");
  const [contractType, setContractType] = useState("");
  const [fixDay, setFixDay] = useState("");
  const [maxHoursWeek, setMaxHoursWeek] = useState("");
  const [sapNumber, setSapNumber] = useState("");

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

  // ----------------------------------------------------------------
  // LIFECYCLE: FETCH USERS ONCE COMPONENT MOUNTS
  // ----------------------------------------------------------------
  useEffect(() => {
    fetchUsers();
  }, []);

  // ----------------------------------------------------------------
  // FETCH USERS
  // ----------------------------------------------------------------
  const fetchUsers = async () => {
    try {
      setLoading(true);

      const db = getDatabase();
      const dbRef = ref(db);

      // Fetch all users
      const usersSnapshot = await get(child(dbRef, "users"));
      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();

        const pendingUsers = [];
        const approvedUsers = [];

        // Fetch all workers data once
        const workersSnapshot = await get(child(dbRef, "workers"));
        const workersData = workersSnapshot.exists() ? workersSnapshot.val() : {};

        // Separate users into pending / approved
        Object.entries(usersData).forEach(([id, user]) => {
          if (user.status === "pending") {
            pendingUsers.push({ id, ...user });
          } else if (user.status === "approved") {
            // If user is a worker and worker data exists, merge
            if (user.role === "worker" && user.worker_id && workersData[user.worker_id]) {
              approvedUsers.push({
                id,
                ...user,
                ...workersData[user.worker_id],
              });
            }
            // If user is a worker but no matching worker data
            else if (user.role === "worker") {
              console.warn(`Worker data missing or incomplete for user ID: ${id}`);
              approvedUsers.push({
                id,
                ...user,
                contract_type: "N/A",
                fixed_days: [],
                max_hours_week: "N/A",
              });
            } 
            // Otherwise, just push the user data
            else {
              approvedUsers.push({ id, ...user });
            }
          }
        });

        // Sort approved users by contract_type (CDI, CDD, Student)
        approvedUsers.sort((a, b) => {
          const aOrder = a.contract_type ? contractOrder[a.contract_type] || 99 : 99;
          const bOrder = b.contract_type ? contractOrder[b.contract_type] || 99 : 99;
          return aOrder - bOrder;
        });

        // Set up sections
        setSections([
          { title: "Pending Users", data: pendingUsers },
          { title: "Approved Users", data: approvedUsers },
        ]);
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
    if (!sapNumber) {
      Alert.alert("Error", "Please provide an SAP number.");
      return;
    }

    if (role === "worker") {
      if (!fixDay || !contractType || !maxHoursWeek) {
        Alert.alert("Error", "Please fill in all fields for the worker before approving.");
        return;
      }

      const enteredDays = fixDay
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
        // Generate a random worker ID
        const workerId = `worker_${Math.random().toString(36).substr(2, 9)}`;

        // Update the workers node with new worker data
        const workersRef = ref(getDatabase(), `workers/${workerId}`);
        await set(workersRef, {
          user_id: user.id,
          contract_type: contractType,
          fixed_days: enteredDays,
          max_hours_week: parseInt(maxHoursWeek, 10),
        });

        // Update the user node
        const userRef = ref(getDatabase(), `users/${user.id}`);
        await update(userRef, {
          status: "approved",
          role,
          sap_number: sapNumber,
          worker_id: workerId,
        });

        Alert.alert("Success", `${user.first_name} has been approved and added as a worker.`);
        fetchUsers();
        resetFields();
      } catch (error) {
        console.error("Error approving worker:", error);
        Alert.alert("Error", "Failed to approve the worker.");
      }
    } else if (role === "manager") {
      try {
        // Update user node for manager
        const userRef = ref(getDatabase(), `users/${user.id}`);
        await update(userRef, {
          status: "approved",
          role,
          sap_number: sapNumber,
        });

        Alert.alert("Success", `${user.first_name} has been approved as a manager.`);
        fetchUsers();
        resetFields();
      } catch (error) {
        console.error("Error approving manager:", error);
        Alert.alert("Error", "Failed to approve the manager.");
      }
    }
  };

  // ----------------------------------------------------------------
  // RESET FIELDS AFTER APPROVAL
  // ----------------------------------------------------------------
  const resetFields = () => {
    setFixDay("");
    setContractType("");
    setMaxHoursWeek("");
    setSapNumber("");
    setRole("");
  };

  // ----------------------------------------------------------------
  // SEARCH USERS
  // ----------------------------------------------------------------
  const handleSearch = (query) => {
    const lowerCaseQuery = query.toLowerCase();
    if (!query) {
      // Restore original sections
      setFilteredSections(sections);
      return;
    }

    // Filter each section’s data
    const newFilteredSections = sections.map((section) => {
      const filteredData = section.data.filter((user) =>
        Object.values(user).some((val) =>
          String(val).toLowerCase().includes(lowerCaseQuery)
        )
      );
      return { ...section, data: filteredData };
    });

    // Only keep sections that have at least 1 result
    const nonEmpty = newFilteredSections.filter((sec) => sec.data.length > 0);
    setFilteredSections(nonEmpty);
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
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      phone: user.phone || "",
      role: user.role || "",
      sap_number: user.sap_number || "",
      contract_type: user.contract_type || "",
      fixed_days: Array.isArray(user.fixed_days) ? user.fixed_days.join(", ") : "",
      max_hours_week: user.max_hours_week ? user.max_hours_week.toString() : "",
    });
  };

  // ----------------------------------------------------------------
  // SAVE EDIT
  // ----------------------------------------------------------------
  const handleSaveEdit = async (user) => {
    try {
      const db = getDatabase();
      const userRef = ref(db, `users/${user.id}`);

      // Update user fields
      const updates = {
        first_name: editFields.first_name,
        last_name: editFields.last_name,
        phone: editFields.phone,
        role: editFields.role,
        sap_number: editFields.sap_number,
      };

      // If newly set to worker, or continuing as worker, update worker node
      if (editFields.role === "worker" && user.worker_id) {
        const workersRef = ref(db, `workers/${user.worker_id}`);
        const workerUpdates = {
          contract_type: editFields.contract_type,
          fixed_days: editFields.fixed_days
            .toLowerCase()
            .split(",")
            .map((day) => day.trim()),
          max_hours_week: parseInt(editFields.max_hours_week, 10),
        };
        await update(workersRef, workerUpdates);
      }

      await update(userRef, updates);

      Alert.alert("Success", "User information has been updated.");
      setEditingUserId(null);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      Alert.alert("Error", "Failed to update user information.");
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
    // Only render if value is not empty, undefined, "N/A", etc.
    if (value !== undefined && value !== null && value !== "" && value !== "N/A") {
      return (
        <Text style={styles.userDetail}>
          {label}: {value}
        </Text>
      );
    }
    return null;
  };

  // ----------------------------------------------------------------
  // RENDER ITEM
  // ----------------------------------------------------------------
  const renderItem = ({ item, section }) => {
    if (section.title === "Pending Users") {
      // PENDING USERS
      return (
        <View style={styles.userCard}>
          <Text style={styles.userName}>
            {item.first_name} {item.last_name}
          </Text>
          {renderUserDetail("Email", item.email)}

          {/* Role Picker */}
          <Picker
            selectedValue={role}
            style={styles.picker}
            onValueChange={(value) => setRole(value)}
          >
            <Picker.Item label="Select Role" value="" />
            {roleOptions.map((r) => (
              <Picker.Item key={r} label={r} value={r} />
            ))}
          </Picker>

          {/* If role=worker, show worker-specific fields */}
          {role === "worker" && (
            <>
              {/* Contract Type Picker */}
              <Picker
                selectedValue={contractType}
                style={styles.picker}
                onValueChange={(value) => setContractType(value)}
              >
                <Picker.Item label="Select Contract Type" value="" />
                {contractOptions.map((ct) => (
                  <Picker.Item key={ct} label={ct} value={ct} />
                ))}
              </Picker>

              {/* Fixed Days Input */}
              <TextInput
                style={styles.textInput}
                placeholder="Enter Fixed Days (e.g., monday,tuesday)"
                value={fixDay}
                onChangeText={(text) => setFixDay(text)}
              />

              {/* Max Hours/week */}
              <TextInput
                style={styles.textInput}
                placeholder="Enter Max Hours per Week"
                keyboardType="numeric"
                value={maxHoursWeek}
                onChangeText={(text) => setMaxHoursWeek(text)}
              />
            </>
          )}

          {/* SAP Number */}
          <TextInput
            style={styles.textInput}
            placeholder="Enter SAP Number"
            value={sapNumber}
            onChangeText={(text) => setSapNumber(text)}
          />

          {/* Approve Button */}
          <TouchableOpacity
            style={styles.approveButton}
            onPress={() => handleApproveUser(item)}
          >
            <Text style={styles.buttonText}>Approve</Text>
          </TouchableOpacity>
        </View>
      );
    } // end if (section.title === "Pending Users")

    // ----------------------------------------------------------------
    // APPROVED USERS
    // ----------------------------------------------------------------
    if (section.title === "Approved Users") {
      // If this user is in "editing" mode
      if (editingUserId === item.id) {
        return (
          <View style={styles.userCard}>
            {/* Editable Fields */}
            <TextInput
              style={styles.textInput}
              placeholder="First Name"
              value={editFields.first_name}
              onChangeText={(text) =>
                setEditFields((prev) => ({ ...prev, first_name: text }))
              }
            />
            <TextInput
              style={styles.textInput}
              placeholder="Last Name"
              value={editFields.last_name}
              onChangeText={(text) =>
                setEditFields((prev) => ({ ...prev, last_name: text }))
              }
            />
            <TextInput
              style={styles.textInput}
              placeholder="Phone"
              value={editFields.phone}
              onChangeText={(text) =>
                setEditFields((prev) => ({ ...prev, phone: text }))
              }
            />

            {/* Role Picker */}
            <Picker
              selectedValue={editFields.role}
              style={styles.picker}
              onValueChange={(value) =>
                setEditFields((prev) => ({ ...prev, role: value }))
              }
            >
              <Picker.Item label="Select Role" value="" />
              {roleOptions.map((r) => (
                <Picker.Item key={r} label={r} value={r} />
              ))}
            </Picker>

            {/* If worker, show contract details */}
            {editFields.role === "worker" && (
              <>
                <Picker
                  selectedValue={editFields.contract_type}
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
                  placeholder="Fixed Days (e.g., monday,tuesday)"
                  value={editFields.fixed_days}
                  onChangeText={(text) =>
                    setEditFields((prev) => ({ ...prev, fixed_days: text }))
                  }
                />

                <TextInput
                  style={styles.textInput}
                  placeholder="Max Hours/Week"
                  keyboardType="numeric"
                  value={editFields.max_hours_week}
                  onChangeText={(text) =>
                    setEditFields((prev) => ({
                      ...prev,
                      max_hours_week: text,
                    }))
                  }
                />
              </>
            )}

            {/* SAP Number */}
            <TextInput
              style={styles.textInput}
              placeholder="Enter SAP Number"
              value={editFields.sap_number}
              onChangeText={(text) =>
                setEditFields((prev) => ({ ...prev, sap_number: text }))
              }
            />

            {/* Save & Cancel */}
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
          </View>
        );
      } // end if editingUserId === item.id

      // ----------------------------------------------------------------
      // NOT EDITING: SHOW READ-ONLY FIELDS
      // ----------------------------------------------------------------
      return (
        <View style={styles.userCard}>
          <Text style={styles.userName}>
            {item.first_name} {item.last_name}
          </Text>
          {renderUserDetail("Email", item.email)}
          {renderUserDetail("Role", item.role)}

          {item.role === "worker" && (
            <>
              {renderUserDetail("Contract Type", item.contract_type)}
              {renderUserDetail(
                "Fixed Days",
                Array.isArray(item.fixed_days) && item.fixed_days.length > 0
                  ? item.fixed_days.join(", ")
                  : null
              )}
              {renderUserDetail("Max Hours/Week", item.max_hours_week)}
            </>
          )}
          {renderUserDetail("SAP Number", item.sap_number)}

          {/* Edit Button */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="pencil" size={20} color="#fff" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      );
    } // end if (section.title === "Approved Users")

    // If for some reason section.title doesn't match
    return null;
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.mainTitle}>Admin Panel</Text>
      </View>

      {/* Search Input */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search users..."
        value={searchQuery}
        onChangeText={(text) => {
          setSearchQuery(text);
          handleSearch(text);
        }}
      />

      {/* SectionList */}
      <SectionList
        sections={searchQuery ? filteredSections : sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item, section }) =>
          expandedSections[section.title] ? renderItem({ item, section }) : null
        }
        renderSectionHeader={renderSectionHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchUsers} />
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
});

// ----------------------------------------------------------------
// FINAL EXPORT
// ----------------------------------------------------------------
export default AdminPanelScreen;
