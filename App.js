import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import WorkerHome from './screens/WorkerHome';
import ManagerHome from './screens/ManagerHome';
import WorkerMijnplanning from './screens/WorkerMijnplanning';
import WorkerSettings from './screens/WorkerSettings';
import ManageShiftRequestScreen from './screens/ManageShiftRequestScreen';
import AddWorkersNeededScreen from './screens/AddWorkersNeededScreen';
import WorkerAccountDetails from './screens/WorkerAccountDetails';
import UserPanel from './screens/UserPanel';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function WorkerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Mijnplanning') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'green',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { height: 60, backgroundColor: '#fff' },
      })}
    >
      <Tab.Screen name="Home" component={WorkerHome} options={{ headerShown: false }} />
      <Tab.Screen name="Mijnplanning" component={WorkerMijnplanning} options={{ headerShown: false }} />
      <Tab.Screen name="Settings" component={WorkerSettings} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

function ManagerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'ManagerHome') {
            iconName = focused ? 'speedometer' : 'speedometer-outline';
          } else if (route.name === 'ManageShiftRequestScreen') {
            iconName = focused ? 'clipboard' : 'clipboard-outline';
          } else if (route.name === 'AddWorkersNeededScreen') {
            iconName = focused ? 'people' : 'people-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'green',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { height: 60, backgroundColor: '#fff' },
      })}
    >
      <Tab.Screen name="ManagerHome" component={ManagerHome} options={{ headerShown: false }} />
      <Tab.Screen name="ManageShiftRequestScreen" component={ManageShiftRequestScreen} options={{ headerShown: false }} />
      <Tab.Screen name="AddWorkersNeededScreen" component={AddWorkersNeededScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}



export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Welcome">
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="WorkerAccountDetails" component={WorkerAccountDetails} options={{ headerShown: false }} />
        <Stack.Screen name="WorkerHome" component={WorkerTabs} options={{ headerShown: false }} />
        <Stack.Screen name="ManagerHome" component={ManagerTabs} options={{ headerShown: false }} />
        <Stack.Screen name="WorkerSettings" component={WorkerSettings} options={{ headerShown: false }} />
        <Stack.Screen name="UserPanel" component={UserPanel} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
