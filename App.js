import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import WorkerHome from './screens/WorkerHome';
import ManagerHome from './screens/ManagerHome';
import UserPanel from './screens/UserPanel';
import ManageShiftRequestScreen from './screens/ManageShiftRequestScreen';

import WorkerAccountDetails from './screens/WorkerAccountDetails'; // Import WorkerAccountDetails

import AddWorkersNeededScreen from './screens/AddWorkersNeededScreen';
import WorkerMijnplanning from './screens/WorkerMijnplanning';


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Welcome">
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen
          name="WorkerHome"
          component={WorkerHome}
          options={{ title: 'Dashboard', headerShown: false }}
        />
        <Stack.Screen name="ManagerHome" component={ManagerHome} />
        <Stack.Screen name="ManageShiftRequestScreen" component={ManageShiftRequestScreen} />

        <Stack.Screen name="UserPanel" component={UserPanel} options={{ headerShown: false }}
 />
        {/* Add WorkerAccountDetails */}
        <Stack.Screen
          name="WorkerAccountDetails"
          component={WorkerAccountDetails}
          options={{ title: 'Account Details', headerShown: false }}
        />
        <Stack.Screen
          name="WorkerMijnplanning"
          component={WorkerMijnplanning}
          options={{ title: 'WorkerMijnplanning', headerShown: false }}
        />
        <Stack.Screen name="AddWorkersNeededScreen" component={AddWorkersNeededScreen} />
        

      </Stack.Navigator>
    </NavigationContainer>
  );
}
