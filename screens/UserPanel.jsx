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
import { Picker } from '@react-native-picker/picker';
import { collection, getDocs, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const AdminPanelScreen = () => {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [fixDay, setFixDay] = useState('');
  const [role, setRole] = useState('');
  const [contractType, setContractType] = useState('');
  const [phone, setPhone] = useState('');

  const roleOptions = ['Manager', 'Worker', ''];
  const contractOptions = ['CDI', 'CDD', 'Student', ''];

  // Allowed days (excluding Saturday if needed)
  const allowedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'sunday'];
  const minDays = 1;
  const maxDays = 5;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const pendingUsersQuery = query(
        collection(db, 'users'),
        where('status', '==', 'pending')
      );
      const approvedUsersQuery = query(
        collection(db, 'users'),
        where('status', '==', 'approved')
      );

      const pendingSnapshot = await getDocs(pendingUsersQuery);
      const approvedSnapshot = await getDocs(approvedUsersQuery);

      // Map pending users
      const pendingUsers = pendingSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Map approved users
      const approvedUsers = approvedSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Categorize approved users
      const categorizedUsers = {
        FixedTerm: approvedUsers.filter((user) => user.contract === 'CDI'),
        Permanent: approvedUsers.filter((user) => user.contract === 'CDD'),
        Student: approvedUsers.filter((user) => user.contract === 'Student'),
      };

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

      setSections(sectionsData);

      // Initialize expanded state (default to expanded)
      const initialExpandedState = {};
      sectionsData.forEach((section) => {
        initialExpandedState[section.title] = true;
      });
      setExpandedSections(initialExpandedState);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const toggleSection = (title) => {
    setExpandedSections((prevState) => ({
      ...prevState,
      [title]: !prevState[title],
    }));
  };

  
  //fix dagen kiezen/wijzigen.

const normalizeDay = (dayString) => {
  const trimmed = dayString.trim();
  const lower = trimmed.toLowerCase();
  return { original: trimmed, normalized: lower };
};

const validateFixDay = () => {
  const parts = fixDay.split(',').map(p => p.trim()).filter(Boolean);

  const normalizedDays = [];
  for (let p of parts) {
    const { original, normalized } = normalizeDay(p);

    // allowed days gebruiken 
    if (!allowedDays.includes(normalized)) {
      // dag bestaat niet
      Alert.alert(
        'Invalid Day',
        `The entered day "${original}" is not recognized.\n\nPlease choose from: ${allowedDays.join(', ')}`
      );
      return false;
    }

    //check lowercase.
    if (original !== normalized) {
      // moet lowercase zijn
      Alert.alert(
        'Incorrect Format',
        `The entered day "${original}" should be in all lowercase. Please write it as "${normalized}".`
      );
      return false;
    }

    normalizedDays.push(normalized);
  }

  const uniqueDays = Array.from(new Set(normalizedDays));
  if (uniqueDays.length < minDays || uniqueDays.length > maxDays) {
    Alert.alert(
      'Invalid Number of Days',
      `Please enter between ${minDays} and ${maxDays} distinct allowed days.`
    );
    return false;
  }

  //oke
  return true;
};
  

  const handleApprove = async () => {
    if (!fixDay || !role || !contractType || !phone) {
      Alert.alert('Error', 'Please fill all fields.');
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

      Alert.alert('Success', `${selectedUser.firstName} approved.`);
      setModalVisible(false);
      clearFormFields();
      await fetchUsers(); // Refresh data after update
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const handleDeleteUser = async (user) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${user.firstName} ${user.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const userRef = doc(db, 'users', user.id);
              await deleteDoc(userRef);
              Alert.alert('Deleted', `${user.firstName} has been deleted.`);
              await fetchUsers(); // Refresh data after deletion
            } catch (error) {
              console.error('Error deleting user:', error);
            }
          },
        },
      ]
    );
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFixDay(user.fixDay || '');
    setRole(user.role || '');
    setContractType(user.contract || '');
    setPhone(user.phone || '');
    setEditModalVisible(true);
  };

  const handleUpdateUser = async () => {
    if (!fixDay || !role || !contractType || !phone) {
      Alert.alert('Error', 'Please fill all fields.');
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
      Alert.alert('Success', `${selectedUser.firstName} updated successfully.`);
      setEditModalVisible(false);
      clearFormFields();
      await fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const clearFormFields = () => {
    setFixDay('');
    setRole('');
    setContractType('');
    setPhone('');
    setSelectedUser(null);
  };

  const renderItem = ({ item, section }) => {
    if (section.title === 'Pending Users') {
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
          <TouchableOpacity
            style={[styles.originalApproveButton, { marginTop: 10 }]}
            onPress={() => handleEditUser(item)}
          >
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.originalRejectButton, { marginTop: 10 }]}
            onPress={() => handleDeleteUser(item)}
          >
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  const renderSectionHeader = ({ section }) => (
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
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BFA6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        <View style={styles.modalContainer}>
          <View style={styles.modalInnerContainer}>
            <Text style={styles.modalTitle}>Approve User</Text>
            <TextInput
              placeholder={`Fix Days (${minDays}-${maxDays} from ${allowedDays.join(', ')})`}
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
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalInnerContainer}>
            <Text style={styles.modalTitle}>Edit User</Text>

            <TextInput
              placeholder={`Fix Days (${minDays}-${maxDays} from ${allowedDays.join(', ')})`}
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
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
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
