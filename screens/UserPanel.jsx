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
import { db } from '../firebaseConfig';

const AdminPanelScreen = () => {
  // State variabelen (laden, data, etc.)
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
  const roleOptions = ['Manager', 'Worker', '']; // rollen
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
    // Data uit Firestore halen
    try {
      setLoading(true);

      // Query voor pending users
      const pendingUsersQuery = query(
        collection(db, 'users'),
        where('status', '==', 'pending')
      );

      // Query voor approved users
      const approvedUsersQuery = query(
        collection(db, 'users'),
        where('status', '==', 'approved')
      );

      // Uitvoeren queries
      const pendingSnapshot = await getDocs(pendingUsersQuery);
      const approvedSnapshot = await getDocs(approvedUsersQuery);

      // Pending users mappen
      const pendingUsers = pendingSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Approved users mappen
      const approvedUsers = approvedSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Categoriseren approved users op contract type
      const categorizedUsers = {
        FixedTerm: approvedUsers.filter((user) => user.contract === 'CDI'),    // CDI
        Permanent: approvedUsers.filter((user) => user.contract === 'CDD'),   // CDD
        Student: approvedUsers.filter((user) => user.contract === 'Student'), // Student
      };

      // Data in secties indelen
      const sectionsData = [
        {
          title: 'Pending Users',
          data: pendingUsers,
        },
        {
          title: 'Fixed Term',
          data: categorizedUsers.FixedTerm,
        },
        {
          title: 'Permanent - Term',
          data: categorizedUsers.Permanent,
        },
        {
          title: 'Student',
          data: categorizedUsers.Student,
        },
      ];

      // State zetten met de nieuwe data
      setSections(sectionsData);

      // Secties standaard uitklappen
      const initialExpandedState = {};
      sectionsData.forEach((section) => {
        initialExpandedState[section.title] = true;
      });
      setExpandedSections(initialExpandedState);

      setLoading(false);
    } catch (error) {
      console.error('Fout bij ophalen users:', error);
      setLoading(false);
    }
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
      `Weet je zeker dat je ${user.firstName} ${user.lastName} wilt verwijderen?`,
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
            {item.firstName} {item.lastName}
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
              onPress={() => handleDeleteUser(item)}
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
            {item.firstName} {item.lastName}
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

      {/* Lijst van gebruikers in secties */}
      <SectionList
        sections={sections}
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
  }
});

export default AdminPanelScreen;
