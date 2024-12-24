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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  getDatabase,
  ref,
  get,
  child,
  update,
  set,
} from 'firebase/database';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const AdminPanelScreen = () => {
  const navigation = useNavigation();

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSections, setFilteredSections] = useState([]);
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
  const [maxHoursWeek, setMaxHoursWeek] = useState('');

  const roleOptions = ['manager', 'worker'];
  const contractOptions = ['CDI', 'CDD', 'Student'];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const dbRef = ref(getDatabase());
      const usersSnapshot = await get(child(dbRef, 'users'));
      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();
        const pendingUsers = Object.entries(usersData)
          .filter(([id, user]) => user.status === 'pending')
          .map(([id, user]) => ({ id, ...user }));

        const approvedUsers = Object.entries(usersData)
          .filter(([id, user]) => user.status === 'approved')
          .map(([id, user]) => ({ id, ...user }));

        setSections([
          { title: 'Pending Users', data: pendingUsers },
          { title: 'Approved Users', data: approvedUsers },
        ]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const handleApproveUser = async (user) => {
    try {
      const dbRef = ref(getDatabase(), `users/${user.id}`);
      await update(dbRef, { status: 'approved', role });
      Alert.alert('Success', `${user.first_name} has been approved.`);
      fetchUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      Alert.alert('Error', 'Failed to approve the user.');
    }
  };

  const handleDeleteUser = async (user) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${user.first_name} ${user.last_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const userRef = doc(db, 'users', user.id);
              await deleteDoc(userRef);
              Alert.alert('Deleted', `${user.first_name} has been deleted.`);
              fetchUsers();
            } catch (error) {
              console.error('Error deleting user:', error);
            }
          },
        },
      ]
    );
  };

  const handleSearch = (query) => {
    const lowerCaseQuery = query.toLowerCase();
    if (!query) {
      setFilteredSections(sections);
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

  const toggleSection = (title) => {
    setExpandedSections((prevState) => ({
      ...prevState,
      [title]: !prevState[title],
    }));
  };

  const renderItem = ({ item, section }) => {
    if (section.title === 'Pending Users') {
      return (
        <View style={styles.userCard}>
          <Text style={styles.userName}>{item.first_name} {item.last_name}</Text>
          <Text style={styles.userEmail}>Email: {item.email}</Text>
          <Picker
            selectedValue={role}
            style={styles.picker}
            onValueChange={(value) => setRole(value)}
          >
            <Picker.Item label="Select Role" value="" />
            {roleOptions.map((r, index) => (
              <Picker.Item key={index} label={r} value={r} />
            ))}
          </Picker>
          <TouchableOpacity
            style={styles.approveButton}
            onPress={() => handleApproveUser(item)}
          >
            <Text style={styles.buttonText}>Approve</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.userCard}>
        <Text style={styles.userName}>{item.first_name} {item.last_name}</Text>
        <Text style={styles.userEmail}>Email: {item.email}</Text>
        <Text style={styles.userRole}>Role: {item.role}</Text>
      </View>
    );
  };

  const renderSectionHeader = ({ section }) => (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={() => toggleSection(section.title)}
    >
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Ionicons
        name={expandedSections[section.title] ? 'chevron-up' : 'chevron-down'}
        size={20}
        color="#333"
      />
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.mainTitle}>Admin Panel</Text>
      </View>
      <TextInput
        style={styles.searchInput}
        placeholder="Search users..."
        value={searchQuery}
        onChangeText={(text) => {
          setSearchQuery(text);
          handleSearch(text);
        }}
      />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF6F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    marginRight: 10,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  searchInput: {
    margin: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#DADFE1',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#F2F5F7',
    borderRadius: 8,
    marginHorizontal: 10,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#555',
  },
  userRole: {
    fontSize: 14,
    color: '#777',
  },
  picker: {
    marginVertical: 10,
    backgroundColor: '#F2F5F7',
    borderRadius: 8,
    padding: 10,
  },
  approveButton: {
    backgroundColor: '#27AE60',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AdminPanelScreen;
