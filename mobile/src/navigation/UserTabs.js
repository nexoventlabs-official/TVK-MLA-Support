import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import LandingScreen from '../screens/user/LandingScreen';
import NewGrievanceScreen from '../screens/user/NewGrievanceScreen';
import MyGrievancesScreen from '../screens/user/MyGrievancesScreen';
import GrievanceDetailScreen from '../screens/user/GrievanceDetailScreen';
import EventsScreen from '../screens/user/EventsScreen';
import EventDetailScreen from '../screens/user/EventDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerTitleAlign: 'center' }}>
      <Stack.Screen name="Home" component={LandingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NewGrievance" component={NewGrievanceScreen} options={{ title: 'Raise Grievance' }} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Event' }} />
    </Stack.Navigator>
  );
}

function GrievanceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerTitleAlign: 'center' }}>
      <Stack.Screen name="MyGrievances" component={MyGrievancesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GrievanceDetail" component={GrievanceDetailScreen} options={{ title: 'Grievance' }} />
    </Stack.Navigator>
  );
}

function EventsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerTitleAlign: 'center' }}>
      <Stack.Screen name="Events" component={EventsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Event' }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

const tabIcon = (emoji) => () =>
  <Text style={{ fontSize: 20 }}>{emoji}</Text>;

export default function UserTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand700,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Home', tabBarIcon: tabIcon('🏠') }} />
      <Tab.Screen name="GrievancesTab" component={GrievanceStack} options={{ title: 'Grievances', tabBarIcon: tabIcon('📋') }} />
      <Tab.Screen name="EventsTab" component={EventsStack} options={{ title: 'Events', tabBarIcon: tabIcon('📅') }} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ title: 'Profile', tabBarIcon: tabIcon('👤') }} />
    </Tab.Navigator>
  );
}
