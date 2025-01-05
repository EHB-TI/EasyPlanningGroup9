import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import base64js from 'base64-js';
import { Alert } from 'react-native';
import { getDatabase, ref, get, update } from 'firebase/database';

export const handleFileUpload = async () => {
  try {
    console.log('handleFileUpload started');

    // Step 1: Open file picker
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    console.log('File Picker Result:', result);

    if (!result.canceled) {
      const fileUri = result.assets?.[0]?.uri;

      if (!fileUri) {
        console.error('File URI not found in result.');
        Alert.alert('Error', 'Unable to access the file. Please try again.');
        return;
      }

      console.log('File URI:', fileUri);

      // Step 2: Read file content using expo-file-system
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('File content read successfully. Length:', fileContent.length);

      // Step 3: Parse the file content into a workbook
      let workbook;
      try {
        const binaryData = base64js.toByteArray(fileContent); // Convert Base64 to Uint8Array
        workbook = XLSX.read(binaryData, { type: 'array' }); // Use "array" instead of "binary"
        console.log('Workbook Object:', workbook);
      } catch (err) {
        console.error('Error parsing workbook:', err);
        Alert.alert('Error', 'Failed to parse the Excel file. Please check the file format.');
        return;
      }

      // Step 4: Check if the "productiviteit" sheet exists
      const sheetNames = workbook.SheetNames;
      console.log('Available Sheet Names:', sheetNames);

      if (!sheetNames.includes('productiviteit')) {
        Alert.alert('Error', 'The sheet "productiviteit" was not found in the file.');
        console.log('The sheet "productiviteit" was not found.');
        return;
      }

      // Step 5: Convert the "productiviteit" sheet into JSON
      const sheet = workbook.Sheets['productiviteit'];
      let jsonData;
      try {
        jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log('Excel Data from "productiviteit":', jsonData);
      } catch (err) {
        console.error('Error converting sheet to JSON:', err);
        Alert.alert('Error', 'Failed to process the sheet data. Please check the file content.');
        return;
      }

      // Step 6: Flexible header matching
      const headers = jsonData[0]; // First row of the sheet
      if (!headers) {
        Alert.alert('Error', 'The sheet does not contain any headers.');
        console.log('No headers found in the sheet.');
        return;
      }

      const findColumnIndex = (headerName) =>
        headers.findIndex((header) => header?.trim().toLowerCase() === headerName.toLowerCase());

      const nameIndex = findColumnIndex('naam');
      const gem2024Index = findColumnIndex('gem. 2024');
      const gemLast3MonthsIndex = findColumnIndex('gem. laatste 3 maand');

      if (nameIndex === -1 || gem2024Index === -1 || gemLast3MonthsIndex === -1) {
        Alert.alert(
          'Error',
          'Required columns (Naam, Gem. 2024, Gem. Laatste 3 maand) are missing or incorrectly formatted.'
        );
        console.log('Detected headers:', headers);
        return;
      }

      console.log('Header Indexes:', { nameIndex, gem2024Index, gemLast3MonthsIndex });

      // Step 7: Initialize Firebase Database
      const database = getDatabase();
      let updatedRecords = 0;

      // Step 8: Process rows and update Firebase
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) {
          console.log(`Skipping empty row at index ${i}`);
          continue;
        }

        const fullName = row[nameIndex];
        const productivityYear = row[gem2024Index];
        const productivityLast3Months = row[gemLast3MonthsIndex];

        if (fullName && productivityYear !== undefined && productivityLast3Months !== undefined) {
          const nameParts = fullName.split(' ');
          const lastName = nameParts[0];
          const firstName = nameParts.slice(1).join(' '); // Handle multi-word first names

          try {
            const usersRef = ref(database, 'users');
            const snapshot = await get(usersRef);

            if (snapshot.exists()) {
              const users = snapshot.val();

              // Match user by first_name and last_name
              const userId = Object.keys(users).find(
                (key) =>
                  users[key].first_name?.toLowerCase() === firstName.toLowerCase() &&
                  users[key].last_name?.toLowerCase() === lastName.toLowerCase()
              );

              if (userId) {
                const user = users[userId];
                const userRef = ref(database, `users/${userId}`);

                // Prepare updates
                const updates = {};
                updates.productivity_last_3_months = productivityLast3Months;
                updates.productivity_year_2024 = productivityYear;

                // Update Firebase
                await update(userRef, updates);
                console.log(`Updated successfully for ${fullName}`);
                updatedRecords++;
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
          console.log(`Incomplete data for row ${i + 1}:`, row);
        }
      }

      // Step 9: Show success message
      if (updatedRecords > 0) {
        Alert.alert('Success', `${updatedRecords} records were successfully updated.`);
      } else {
        Alert.alert('No Updates', 'No matching records were found or updated.');
      }
    }
  } catch (error) {
    if (DocumentPicker.isCancel(error)) {
      console.log('File selection cancelled');
    } else {
      console.error('Error in handleFileUpload:', error);
      Alert.alert('Error', 'An error occurred during the file upload process.');
    }
  }
};
