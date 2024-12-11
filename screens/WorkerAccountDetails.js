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
    
}