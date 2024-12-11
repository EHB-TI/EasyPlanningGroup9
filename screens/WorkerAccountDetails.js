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

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Achternaam:</Text>
          <TextInput
            style={styles.input}
            value={userDetails.lastName}
            editable={false}
          />
        </View>

        <View style={styles.inputContainer}>
        <Text style={styles.label}>GSM:</Text>
        <TextInput
          style={styles.input}
          value={userDetails.phone}
          editable={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>E-mail:</Text>
        <TextInput
          style={styles.input}
          value={userDetails.email}
          editable={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Vaste Dagen:</Text>
        <TextInput
          style={styles.input}
          value={userDetails.fixedDays}
          editable={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Aantal uren:</Text>
        <TextInput
          style={styles.input}
          value={userDetails.hours}
          editable={false}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleEdit}>
        <Text style={styles.buttonText}>Wijzig gegevens</Text>
      </TouchableOpacity>
        </ScrollView>
      );
}