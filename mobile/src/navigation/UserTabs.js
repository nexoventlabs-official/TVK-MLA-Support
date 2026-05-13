import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import LandingScreen from '../screens/user/LandingScreen';
import Placeholder from '../screens/Placeholder';
import ProfileScreen from '../screens/ProfileScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const stub = (name, description) => (props) =>
  <Placeholder {...props} name={name} description={description} />;

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerTitleAlign: 'center' }}>
      <Stack.Screen name="Home" component={LandingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NewGrievance" options={{ title: 'Raise Grievance' }}>
        {stub('Raise Grievance', 'Phase 2 — service catalog, photo capture, location, submit.')}
      </Stack.Screen>
      <Stack.Screen name="EventDetail" options={{ title: 'Event' }}>
        {stub('Event details', 'Phase 2 — full event detail with directions + RSVP.')}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function GrievanceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerTitleAlign: 'center' }}>
      <Stack.Screen name="MyGrievances" options={{ title: 'My Grievances' }}>
        {stub('My Grievances', 'Phase 2 — list of your tickets with live status.')}
      </Stack.Screen>
      <Stack.Screen name="GrievanceDetail" options={{ title: 'Grievance' }}>
        {stub('Grievance details', 'Phase 2 — full ticket detail with photos + timeline.')}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function EventsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerTitleAlign: 'center' }}>
      <Stack.Screen name="Events" options={{ title: 'Events' }}>
        {stub('Events', 'Phase 2 — upcoming events list.')}
      </Stack.Screen>
      <Stack.Screen name="EventDetail" options={{ title: 'Event' }}>
        {stub('Event details', 'Phase 2 — full event detail.')}
      </Stack.Screen>
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
