import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { collection, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function ManagerDashboard() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);

  // Fetch pending and approved users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const pending = [];
        const approved = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.status === 'pending') {
            pending.push({ id: doc.id, ...data });
          } else if (data.status === 'approved') {
            approved.push({ id: doc.id, ...data });
          }
        });
        setPendingUsers(pending);
        setApprovedUsers(approved);
      } catch (error) {
        Alert.alert('Error', 'Failed to load users.');
      }
    };

    fetchUsers();
  }, []);

  // Approve a user
  const handleApprove = async (userId) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'approved',
      });
      Alert.alert('Success', 'User approved successfully!');
      setPendingUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Reject a user
  const handleReject = async (userId) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      Alert.alert('Success', 'User rejected and deleted.');
      setPendingUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Render user item
  const renderUser = (item, actions) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        {item.firstName} {item.lastName}
      </Text>
      <Text>Email: {item.email}</Text>
      <Text>Phone: {item.phone}</Text>
      <Text>Contract: {item.contractType || 'N/A'}</Text>
      {actions && (
        <View style={styles.buttons}>
          <Button title="Approve" onPress={() => handleApprove(item.id)} />
          <Button title="Reject" onPress={() => handleReject(item.id)} color="red" />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manager Dashboard</Text>

      <Text style={styles.subtitle}>Pending Accounts</Text>
      <FlatList
        data={pendingUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderUser(item, true)}
        ListEmptyComponent={<Text style={styles.noData}>No pending accounts.</Text>}
      />

      <Text style={styles.subtitle}>Approved Workers</Text>
      <FlatList
        data={approvedUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderUser(item, false)}
        ListEmptyComponent={<Text style={styles.noData}>No approved workers.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0faff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#28a745',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  card: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  noData: {
    textAlign: 'center',
    marginTop: 20,
    color: '#777',
  },
});
s