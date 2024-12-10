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
} from 'react-native';
import { collection, getDocs, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig'; 

const AdminPanelScreen = () => {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [fixDay, setFixDay] = useState('');
  const [role, setRole] = useState('');
  const [contractType, setContractType] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
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

        // Map approved users into categories (Fixed Term, Permanent, Student)
        const approvedUsers = approvedSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

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

    fetchUsers();
  }, []);

  const toggleSection = (title) => {
    setExpandedSections((prevState) => ({
      ...prevState,
      [title]: !prevState[title], // Toggle the expanded state
    }));
  };

  const handleApprove = async () => {
    if (!fixDay || !role || !contractType) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }

    try {
      const userRef = doc(db, 'users', selectedUser.id);

      await updateDoc(userRef, {
        status: 'approved',
        fixDay,
        role,
        contract: contractType,
      });

      Alert.alert('Success', `${selectedUser.firstName} approved.`);
      setModalVisible(false);
      setFixDay('');
      setRole('');
      setContractType('');
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const handleReject = async (user) => {
    try {
      const userRef = doc(db, 'users', user.id);
      await deleteDoc(userRef);
      Alert.alert('Rejected', `${user.firstName} has been rejected.`);
    } catch (error) {
      console.error('Error rejecting user:', error);
    }
  };

  const renderItem = ({ item, section }) => {
    if (section.title === 'Pending Users') {
      return (
        <View style={styles.pendingUserContainer}>
          <Text style={styles.pendingUserName}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.pendingUserDetails}>{item.email}</Text>
          <View style={styles.pendingButtonContainer}>
            <TouchableOpacity
              style={styles.originalApproveButton}
              onPress={() => {
                setSelectedUser(item);
                setModalVisible(true);
              }}
            >
              <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.originalRejectButton}
              onPress={() => handleReject(item)}
            >
              <Text style={styles.buttonText}>Reject</Text>
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
          <Text style={styles.userDetails}>{item.email}</Text>
          <Text style={styles.userDetails}>{item.fixDay}</Text>
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
      />

      {/* Approve Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Approve User</Text>
          <TextInput
            placeholder="Fix Day (e.g., Monday)"
            style={styles.input}
            value={fixDay}
            onChangeText={setFixDay}
          />
          <TextInput
            placeholder="Role (e.g., Manager or Worker)"
            style={styles.input}
            value={role}
            onChangeText={setRole}
          />
          <TextInput
            placeholder="Contract Type (CDI, CDD, Student)"
            style={styles.input}
            value={contractType}
            onChangeText={setContractType}
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
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#fff',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
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
});

export default AdminPanelScreen;
