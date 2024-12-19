import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
// Picker voor rollen / contracten
import { Picker } from '@react-native-picker/picker';
// Veilige weergave voor camera dat text er niet onder gaat
import { SafeAreaView } from 'react-native-safe-area-context';
// Firebase functies
import { collection, getDocs, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getDatabase, ref, get, child } from 'firebase/database'; 
import { db } from '../firebaseConfig';

// Functie om een gebruiker goed te keuren
const handleApproveUser = async (user) => {
  try {
    const db = getDatabase();

    // 1. Update de user status naar 'approved'
    const userRef = ref(db, `users/${user.id}`);
    await update(userRef, { status: "approved" });

    // 2. Maak een nieuwe worker entry aan in 'workers'
    const workerId = `worker_${user.id}`; // Genereer een uniek ID voor de worker
    const workerRef = ref(db, `workers/${workerId}`);

    const workerData = {
      user_id: user.id,
      contract_id: "contract1", // Dit kun je aanpassen naar de juiste contract_id
      fixed_days: {
        Monday: true, // Deze kunnen dynamisch ingevuld worden
        Wednesday: true,
      },
      max_hours_week: 40, // Default max uren, dit kan aangepast worden
    };

    await set(workerRef, workerData);

    // 3. Optioneel: Verwijder de gebruiker uit 'pending_users'
    const pendingUserRef = ref(db, `pending_users/${user.id}`);
    await remove(pendingUserRef);

    console.log("User approved and added to workers:", workerData);
    Alert.alert("Success", "User approved and added to workers!");

  } catch (error) {
    console.error("Error approving user:", error);
    Alert.alert("Error", "Failed to approve user.");
  }
};
const AdminPanelScreen = () => {
  // State variabelen (laden, data, etc.)
  
  const [searchQuery, setSearchQuery] = useState(''); // Search query input
  const [filteredSections, setFilteredSections] = useState([]); // Filtered data
  const [loading, setLoading] = useState(true); // laden gebruikers
  const [sections, setSections] = useState([]); // secties (pending, approved)
  const [expandedSections, setExpandedSections] = useState({}); // ingeklapt/uitgeklapt secties
  const [refreshing, setRefreshing] = useState(false); // verversen lijst
  const [modalVisible, setModalVisible] = useState(false); // zichtbaarheid approve-modal
  const [editModalVisible, setEditModalVisible] = useState(false); // zichtbaarheid edit-modal
  const [selectedUser, setSelectedUser] = useState(null); // geselecteerde gebruiker
  const [fixDay, setFixDay] = useState(''); // ingevoerde dagen
  const [role, setRole] = useState(''); // geselecteerde rol
  const [contractType, setContractType] = useState(''); // geselecteerd contracttype
  const [phone, setPhone] = useState(''); // telefoonnummer invoer
  
  // Mogelijke rollen en contracten (keuzelijsten)
  const roleOptions = ['manager', 'worker', '']; // rollen
  const contractOptions = ['CDI', 'CDD', 'Student', '']; // contracten

  // Toegestane dagen (lowercase)
  const allowedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'sunday'];
  const minDays = 1; // minimum aantal dagen
  const maxDays = 5; // maximum aantal dagen

  useEffect(() => {
    // Laden van gebruikers data bij montage
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
  
      const dbRef = ref(getDatabase()); // Verwijzing naar de Realtime Database
  
      // Haal alle benodigde data op
      const usersSnapshot = await get(child(dbRef, 'users'));
      const workersSnapshot = await get(child(dbRef, 'workers'));
      const contractsSnapshot = await get(child(dbRef, 'contracts'));
  
      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();
        const workersData = workersSnapshot.exists() ? workersSnapshot.val() : {};
        const contractsData = contractsSnapshot.exists() ? contractsSnapshot.val() : {};
  
        // Pending users verzamelen
        const pendingUsers = [];
        const categorizedUsers = {
          FixedTerm: [],
          Permanent: [],
          Student: [],
        };
  
        // Verwerk alle gebruikers
        Object.entries(usersData).forEach(([userId, user]) => {
          if (user.status === 'pending') {
            pendingUsers.push({ id: userId, ...user });
          } else if (user.status === 'approved') {
            // Alleen goedgekeurde gebruikers koppelen aan contractinformatie
            const worker = Object.values(workersData).find((w) => w.user_id === userId);
            if (worker) {
              const contract = contractsData[worker.contract_id];
              if (contract) {
                const userWithDetails = {
                  id: userId,
                  ...user,
                  contractType: contract.type,
                  fixedDays: worker.fixed_days || {},
                  maxHours: worker.max_hours_week,
                };
  
                if (contract.type === 'CDI') {
                  categorizedUsers.FixedTerm.push(userWithDetails);
                } else if (contract.type === 'CDD') {
                  categorizedUsers.Permanent.push(userWithDetails);
                } else if (contract.type === 'Student') {
                  categorizedUsers.Student.push(userWithDetails);
                }
              }
            }
          }
        });
  
        // Stel secties in
        const sectionsData = [
          { title: 'Pending Users', data: pendingUsers },
          { title: 'Fixed Term', data: categorizedUsers.FixedTerm },
          { title: 'Permanent - Term', data: categorizedUsers.Permanent },
          { title: 'Student', data: categorizedUsers.Student },
        ];
  
        setSections(sectionsData);
  
        // Stel de standaardsecties uitklapstatus in
        const initialExpandedState = {};
        sectionsData.forEach((section) => {
          initialExpandedState[section.title] = true;
        });
        setExpandedSections(initialExpandedState);
      } else {
        console.log('No user data found in the database.');
      }
  
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users from the Realtime Database:', error);
      setLoading(false);
    }
  };
  
  const handleSearch = (query) => {
    const lowerCaseQuery = query.toLowerCase();
  
    if (!query) {
      setFilteredSections(sections); // Reset to original data if query is empty
      return;
    }
  
    const newFilteredSections = sections.map((section) => {
      const filteredData = section.data.filter((user) =>
        Object.values(user).some((value) =>
          value.toString().toLowerCase().includes(lowerCaseQuery)
        )
      );
  
      return { ...section, data: filteredData };
    });
  
    setFilteredSections(newFilteredSections.filter((section) => section.data.length > 0));
  };
  
  

  const onRefresh = async () => {
    // Refresh-lijst
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const toggleSection = (title) => {
    // Uitklappen/inklapppen sectie
    setExpandedSections((prevState) => ({
      ...prevState,
      [title]: !prevState[title],
    }));
  };

  const normalizeDay = (dayString) => {
    // Normaliseren dag (trim, lowercase)
    const trimmed = dayString.trim();
    const lower = trimmed.toLowerCase();
    return { original: trimmed, normalized: lower };
  };

  const validateFixDay = () => {
    // Validatie ingevoerde dagen
    const parts = fixDay.split(',').map(p => p.trim()).filter(Boolean);

    const normalizedDays = [];
    for (let p of parts) {
      const { original, normalized } = normalizeDay(p);

      // Check of dag toegestaan is
      if (!allowedDays.includes(normalized)) {
        Alert.alert(
          'Invalid Day',
          `De ingevoerde dag "${original}" wordt niet herkend.\n\nKies uit: ${allowedDays.join(', ')}`
        );
        return false;
      }

      // Check of dag lowercase is
      if (original !== normalized) {
        Alert.alert(
          'Incorrect Format',
          `De ingevoerde dag "${original}" moet in lowercase. Gebruik "${normalized}".`
        );
        return false;
      }

      normalizedDays.push(normalized);
    }

    // Check min/max aantal dagen
    const uniqueDays = Array.from(new Set(normalizedDays));
    if (uniqueDays.length < minDays || uniqueDays.length > maxDays) {
      Alert.alert(
        'Invalid Number of Days',
        `Voer tussen ${minDays} en ${maxDays} verschillende toegestane dagen in.`
      );
      return false;
    }

    return true;
  };

  const handleApprove = async () => {
    // Gebruiker goedkeuren
    if (!fixDay || !role || !contractType || !phone) {
      Alert.alert('Error', 'Vul alle velden in.');
      return;
    }

    if (!validateFixDay()) return;

    try {
      const userRef = doc(db, 'users', selectedUser.id);

      await updateDoc(userRef, {
        status: 'approved',
        fixDay,
        role,
        contract: contractType,
        phone,
      });

      Alert.alert('Success', `${selectedUser.firstName} is goedgekeurd.`);
      setModalVisible(false);
      clearFormFields();
      await fetchUsers(); // Data verversen
    } catch (error) {
      console.error('Fout bij goedkeuren gebruiker:', error);
    }
  };

  const handleDeleteUser = async (user) => {
    // Gebruiker verwijderen
    Alert.alert(
      'Bevestig Verwijderen',
      `Weet je zeker dat je ${user.first_Name} ${user.last_Name} wilt verwijderen?`,
      [
        { text: 'Annuleer', style: 'cancel' },
        {
          text: 'Verwijderen',
          style: 'destructive',
          onPress: async () => {
            try {
              const userRef = doc(db, 'users', user.id);
              await deleteDoc(userRef);
              Alert.alert('Verwijderd', `${user.firstName} is verwijderd.`);
              await fetchUsers(); // Data vernieuwen
            } catch (error) {
              console.error('Fout bij verwijderen gebruiker:', error);
            }
          },
        },
      ]
    );
  };

  const handleEditUser = (user) => {
    // Modal openen om gebruiker aan te passen
    setSelectedUser(user);
    setFixDay(user.fixDay || '');
    setRole(user.role || '');
    setContractType(user.contract || '');
    setPhone(user.phone || '');
    setEditModalVisible(true);
  };

  const handleUpdateUser = async () => {
    // Gebruiker updaten
    if (!fixDay || !role || !contractType || !phone) {
      Alert.alert('Error', 'Vul alle velden in.');
      return;
    }

    if (!validateFixDay()) return;

    try {
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        role,
        contract: contractType,
        phone,
        fixDay,
      });
      Alert.alert('Success', `${selectedUser.firstName} is bijgewerkt.`);
      setEditModalVisible(false);
      clearFormFields();
      await fetchUsers();
    } catch (error) {
      console.error('Fout bij updaten gebruiker:', error);
    }
  };

  const clearFormFields = () => {
    //  leegmaken
    setFixDay('');
    setRole('');
    setContractType('');
    setPhone('');
    setSelectedUser(null);
  };

  const renderItem = ({ item, section }) => {
    // Gebruiker rij renderen
    if (section.title === 'Pending Users') {
      // Pending user weergave
      return (
        <View style={styles.pendingUserContainer}>
          <Text style={styles.pendingUserName}>
            {item.first_name} {item.last_name}
          </Text>
          <Text style={styles.pendingUserDetails}> {item.email}</Text>
          <Text style={styles.pendingUserDetails}>+{item.phone}</Text>
          <View style={styles.pendingButtonContainer}>
            <TouchableOpacity
              style={styles.originalApproveButton}
              onPress={() => {
                setSelectedUser(item);
                setFixDay('');
                setRole('');
                setContractType('');
                setPhone('');
                setModalVisible(true);
              }}
            >
              <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.originalRejectButton}
              onPress={() => handleApproveUser(item)}

            >
              <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else {
      // existing user weergave
      return (
        <View style={styles.userContainer}>
          <Text style={styles.userName}>
            {item.first_name} {item.last_name}
          </Text>
          <Text style={styles.userDetails}> {item.email}</Text>
          <Text style={styles.userDetails}>+{item.phone}</Text>
          <Text style={styles.userDetails}> {item.fixDay}</Text>
          <Text style={styles.userDetails}> {item.role}</Text>
          <Text style={styles.userDetails}> {item.contract}</Text>

          {/* delet en edit button */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.originalApproveButton}
              onPress={() => handleEditUser(item)}
            >
              <Text style={styles.buttonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.originalRejectButton}
              onPress={() => handleDeleteUser(item)}
            >
              <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  };

  const renderSectionHeader = ({ section }) => (
    // Sectie kop weergave met toggle
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={() => toggleSection(section.title)}
    >
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.toggleText}>
        {expandedSections[section.title] ? '-' : '+'}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    // refresh
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BFA6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Titel bovenaan */}
      <Text style={styles.mainTitle}>User Panel</Text>
       {/* Search Bar */}
    <TextInput
      style={styles.searchInput}
      placeholder="Search users..."
      value={searchQuery}
      onChangeText={(text) => {
        setSearchQuery(text);
        handleSearch(text);
      }}
    />
      
      {/* Lijst van gebruikers in secties */}
      <SectionList
  sections={searchQuery ? filteredSections : sections}
  keyExtractor={(item) => item.id}
  renderItem={({ item, section }) =>
    expandedSections[section.title] ? renderItem({ item, section }) : null
  }
  renderSectionHeader={renderSectionHeader}
  stickySectionHeadersEnabled
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
/>


      {/* Approve Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalInnerContainer}>
            <Text style={styles.modalTitle}>Approve User</Text>
            <TextInput
              placeholder={`Fix Days (${minDays}-${maxDays} uit ${allowedDays.join(', ')})`}
              style={styles.input}
              value={fixDay}
              onChangeText={(text) => setFixDay(text)}
            />

            <Text style={{fontWeight:'bold', marginTop:20}}>Select Role:</Text>
            <Picker
              selectedValue={role}
              style={styles.picker}
              onValueChange={(itemValue) => setRole(itemValue)}
            >
              {roleOptions.map((r, index) => (
                <Picker.Item key={index} label={r || "Select Role"} value={r} />
              ))}
            </Picker>

            <Text style={{fontWeight:'bold', marginTop:20}}>Select Contract Type:</Text>
            <Picker
              selectedValue={contractType}
              style={styles.picker}
              onValueChange={(itemValue) => setContractType(itemValue)}
            >
              {contractOptions.map((c, index) => (
                <Picker.Item key={index} label={c || "Select Contract Type"} value={c} />
              ))}
            </Picker>

            <TextInput
              placeholder="Phone number"
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.originalApproveButton}
                onPress={handleApprove}
              >
                <Text style={styles.buttonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.originalRejectButton}
                onPress={() => {
                  setModalVisible(false);
                  clearFormFields();
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalInnerContainer}>
            <Text style={styles.modalTitle}>Edit User</Text>

            <TextInput
              placeholder={`Fix Days (${minDays}-${maxDays} uit ${allowedDays.join(', ')})`}
              style={styles.input}
              value={fixDay}
              onChangeText={setFixDay}
            />

            <Text style={{fontWeight:'bold', marginTop:20}}>Select Role:</Text>
            <Picker
              selectedValue={role}
              style={styles.picker}
              onValueChange={(itemValue) => setRole(itemValue)}
            >
              {roleOptions.map((r, index) => (
                <Picker.Item key={index} label={r || "Select Role"} value={r} />
              ))}
            </Picker>

            <Text style={{fontWeight:'bold', marginTop:20}}>Select Contract Type:</Text>
            <Picker
              selectedValue={contractType}
              style={styles.picker}
              onValueChange={(itemValue) => setContractType(itemValue)}
            >
              {contractOptions.map((c, index) => (
                <Picker.Item key={index} label={c || "Select Contract Type"} value={c} />
              ))}
            </Picker>

            <TextInput
              placeholder="Phone number"
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.originalApproveButton}
                onPress={handleUpdateUser}
              >
                <Text style={styles.buttonText}>Update</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.originalRejectButton}
                onPress={() => {
                  setEditModalVisible(false);
                  clearFormFields();
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

// Stijlen voor de componenten
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff', // lichte achtergrond
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: 15,
    textAlign: 'center',
    color: '#333', // titel tekstkleur
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa', // sectie header achtergrond
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333', // sectie titel tekstkleur
  },
  toggleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00BFA6',
  },
  pendingUserContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    margin: 10,
    elevation: 2,
  },
  pendingUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  pendingUserDetails: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  pendingButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  originalApproveButton: {
    backgroundColor: '#00BFA6',
    borderRadius: 5,
    padding: 10,
    alignItems: 'center',
    flex: 1,
    marginRight: 5,
  },
  originalRejectButton: {
    backgroundColor: '#FF5A5F',
    borderRadius: 5,
    padding: 10,
    alignItems: 'center',
    flex: 1,
  },
  userContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    margin: 10,
    elevation: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userDetails: {
    fontSize: 14,
    color: '#555',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // halfdoorzichtige achtergrond
    padding: 20,
  },
  modalInnerContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    borderWidth:1,
    borderColor:'#ccc'
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  picker: {
    backgroundColor: '#fff',
    marginBottom: 10,
    borderRadius: 5,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 10,
    margin: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    fontSize: 16,
  },
  
});

export default AdminPanelScreen;
