import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
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
      <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// Grievances tab — opens the service catalog directly so a citizen can
// raise a new grievance without an intermediate landing screen.
function GrievanceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerTitleAlign: 'center' }}>
      <Stack.Screen name="NewGrievance" component={NewGrievanceScreen} options={{ title: 'Raise Grievance' }} />
    </Stack.Navigator>
  );
}

// My Requests tab — the user's filed grievances + per-ticket detail.
function RequestsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerTitleAlign: 'center' }}>
      <Stack.Screen name="MyGrievances" component={MyGrievancesScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="GrievanceDetail"
        component={GrievanceDetailScreen}
        options={{ title: 'Request', headerBackTitle: '', headerBackTitleVisible: false }}
      />
    </Stack.Navigator>
  );
}

function EventsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerTitleAlign: 'center' }}>
      <Stack.Screen name="Events" component={EventsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ headerShown: false }} />
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

const tabIcon = (name) => ({ color, size }) => (
  <Feather name={name} color={color} size={size || 22} />
);

export default function UserTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand700,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.1,
          shadowRadius: 15,
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          borderRadius: 30,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 11,
        },
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Home', tabBarIcon: tabIcon('home') }} />
      <Tab.Screen name="GrievancesTab" component={GrievanceStack} options={{ title: 'Grievances', tabBarIcon: tabIcon('plus-square') }} />
      <Tab.Screen name="RequestsTab" component={RequestsStack} options={{ title: 'My Requests', tabBarIcon: tabIcon('inbox') }} />
      <Tab.Screen name="EventsTab" component={EventsStack} options={{ title: 'Events', tabBarIcon: tabIcon('calendar') }} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ tabBarButton: () => null }} />
    </Tab.Navigator>
  );
}
