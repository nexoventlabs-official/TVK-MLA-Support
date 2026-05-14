import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import DashboardScreen from '../screens/admin/DashboardScreen';
import ServiceRequestsScreen from '../screens/admin/ServiceRequestsScreen';
import ServiceRequestDetailScreen from '../screens/admin/ServiceRequestDetailScreen';
import MembersScreen from '../screens/admin/MembersScreen';
import MemberDetailScreen from '../screens/admin/MemberDetailScreen';
import MoreScreen from '../screens/admin/MoreScreen';
import VotersScreen from '../screens/admin/VotersScreen';
import VoterDetailScreen from '../screens/admin/VoterDetailScreen';
import CampaignsScreen from '../screens/admin/CampaignsScreen';
import AdminEventsScreen from '../screens/admin/AdminEventsScreen';
import FlowImagesScreen from '../screens/admin/FlowImagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome" component={DashboardScreen} />
      <Stack.Screen name="ServiceRequestDetail" component={ServiceRequestDetailScreen} />
    </Stack.Navigator>
  );
}

function RequestsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ServiceRequests" component={ServiceRequestsScreen} />
      <Stack.Screen name="ServiceRequestDetail" component={ServiceRequestDetailScreen} />
    </Stack.Navigator>
  );
}

function MembersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Members" component={MembersScreen} />
      <Stack.Screen name="MemberDetail" component={MemberDetailScreen} />
      <Stack.Screen name="ServiceRequestDetail" component={ServiceRequestDetailScreen} />
    </Stack.Navigator>
  );
}

function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreHome" component={MoreScreen} />
      <Stack.Screen name="Voters" component={VotersScreen} />
      <Stack.Screen name="VoterDetail" component={VoterDetailScreen} />
      <Stack.Screen name="ServiceRequestDetail" component={ServiceRequestDetailScreen} />
      <Stack.Screen name="Campaigns" component={CampaignsScreen} />
      <Stack.Screen name="Events" component={AdminEventsScreen} />
      <Stack.Screen name="FlowImages" component={FlowImagesScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

const tabIcon = (name) => ({ color, size }) => (
  <Feather name={name} color={color} size={size || 22} />
);

export default function AdminTabs() {
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
      <Tab.Screen name="DashboardTab" component={DashboardStack} options={{ title: 'Dashboard', tabBarIcon: tabIcon('bar-chart-2') }} />
      <Tab.Screen name="RequestsTab" component={RequestsStack} options={{ title: 'Requests', tabBarIcon: tabIcon('inbox') }} />
      <Tab.Screen name="MembersTab" component={MembersStack} options={{ title: 'Members', tabBarIcon: tabIcon('users') }} />
      <Tab.Screen name="MoreTab" component={MoreStack} options={{ title: 'More', tabBarIcon: tabIcon('settings') }} />
    </Tab.Navigator>
  );
}
