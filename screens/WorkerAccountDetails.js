import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from "react-native";

export default function AccountDetails() 
{
    const [userDetails, setUserDetails] = useState({
        firstName: "Lucas",
        lastName: "Huygen",
        phone: "+0032478965412",
        email: "naam@mail.com",
        fixedDays: "maandag, dinsdag...",
        hours: "20",
      });
    
      return(
        <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Account Details</Text>
        <Text style={styles.subHeader}>Contract Type: soort type</Text>
  
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Voornaam:</Text>
          <TextInput
            style={styles.input}
            value={userDetails.firstName}
            editable={false}
          />
        </View>




        </ScrollView>
      );
}