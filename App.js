import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import WorkerHome from './screens/WorkerHome';
import ManagerHome from './screens/ManagerHome';
import UserPanel from './screens/UserPanel'; // Import UserPanel screen

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        {/* Login screen */}
        <Stack.Screen name="Login" component={LoginScreen} />
        {/* Register screen */}
        <Stack.Screen name="Register" component={RegisterScreen} />
        {/* Worker Home */}
        <Stack.Screen name="WorkerHome" component={WorkerHome} />
        {/* Manager Home */}
        <Stack.Screen name="ManagerHome" component={ManagerHome} />
        {/* User Panel */}
        <Stack.Screen name="UserPanel" component={UserPanel} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
