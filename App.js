import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import WorkerHome from './screens/WorkerHome';
import ManagerHome from './screens/ManagerHome';
import UserPanel from './screens/UserPanel'; // Import UserPanel screen
import ShiftDetailsScreen from './screens/shiftdetails';
import ManageShiftRequestScreen from './screens/ManageShiftRequestScreen';
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Welcome">
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="WorkerHome" component={WorkerHome} />
        <Stack.Screen name="ManagerHome" component={ManagerHome} />
        <Stack.Screen name="ShiftDetailsScreen" component={ShiftDetailsScreen} />
        <Stack.Screen name="ManageShiftRequestScreen" component={ManageShiftRequestScreen} />
        {/* User Panel */}
        <Stack.Screen name="UserPanel" component={UserPanel} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
