import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { Alert } from 'react-native';
import { getDatabase, ref, get, update } from 'firebase/database';

export const handleFileUpload = async () => {
  try {
    // Prompt user to pick a file
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // MIME type for Excel
    });

    if (result.type === 'success') {
      const fileUri = result.uri;

      // Read the Excel file
      const response = await fetch(fileUri);
      const data = await response.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      // Check if the "productiviteit" sheet exists
      if (!workbook.SheetNames.includes('productiviteit')) {
        Alert.alert('Error', 'The sheet "productiviteit" was not found in the file.');
        console.log('The sheet "productiviteit" was not found.');
        return;
      }

      // Convert the "productiviteit" sheet into JSON
      const sheet = workbook.Sheets['productiviteit'];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      console.log('Excel Data from "productiviteit":', jsonData);

      // Initialize Firebase Database
      const database = getDatabase();

      // Loop through each row in the Excel data
      for (const row of jsonData) {
        const fullName = row['Nom']; // "NOM PRENOM"
        const [lastName, firstName] = fullName.split(' '); // Split into last and first name
        const productivityYear = row['gem 2024']; // Yearly productivity
        const productivityLast3Months = row['gem dernière 3 mois']; // Last 3 months productivity

        if (firstName && lastName && productivityYear !== undefined && productivityLast3Months !== undefined) {
          try {
            // Get all users from Firebase
            const usersRef = ref(database, 'users');
            const snapshot = await get(usersRef);

            if (snapshot.exists()) {
              const users = snapshot.val();

              // Find the user matching the first_name and last_name
              const userId = Object.keys(users).find(
                (key) =>
                  users[key].first_name.toLowerCase() === firstName.toLowerCase() &&
                  users[key].last_name.toLowerCase() === lastName.toLowerCase()
              );

              if (userId) {
                const user = users[userId]; // Get the user object
                const userRef = ref(database, `users/${userId}`);

                // Only update if the productivity fields already exist
                const updates = {};
                if ('productivity_last_3_months' in user) {
                  updates.productivity_last_3_months = productivityLast3Months;
                }
                if ('productivity_year_2024' in user) {
                  updates.productivity_year_2024 = productivityYear;
                }

                // If there are updates to make, send them to Firebase
                if (Object.keys(updates).length > 0) {
                  await update(userRef, updates);
                  console.log(`Updated successfully for ${fullName}`);
                } else {
                  console.log(`No productivity fields to update for ${fullName}`);
                }
              } else {
                console.log(`User not found: ${fullName}`);
              }
            } else {
              console.log('No users found in the database.');
            }
          } catch (error) {
            console.error(`Error updating data for ${fullName}:`, error);
          }
        } else {
          console.log(`Incomplete data for ${fullName}`);
        }
      }

      // Show success message
      Alert.alert('Success', 'Productivity data has been updated successfully.');
    }
  } catch (error) {
    if (DocumentPicker.isCancel(error)) {
      console.log('File selection cancelled');
    } else {
      console.error('Error selecting file:', error);
      Alert.alert('Error', 'An error occurred while selecting the file.');
    }
  }
};
