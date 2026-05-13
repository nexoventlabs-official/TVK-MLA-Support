import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
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
      <Stack.Screen name="ServiceRequestDetail" component={ServiceRequestDetailScreen} options={{ headerShown: true, title: 'Ticket' }} />
    </Stack.Navigator>
  );
}

function RequestsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerTitleAlign: 'center' }}>
      <Stack.Screen name="ServiceRequests" component={ServiceRequestsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ServiceRequestDetail" component={ServiceRequestDetailScreen} options={{ title: 'Ticket' }} />
    </Stack.Navigator>
  );
}

function MembersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerTitleAlign: 'center' }}>
      <Stack.Screen name="Members" component={MembersScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MemberDetail" component={MemberDetailScreen} options={{ title: 'Member' }} />
      <Stack.Screen name="ServiceRequestDetail" component={ServiceRequestDetailScreen} options={{ title: 'Ticket' }} />
    </Stack.Navigator>
  );
}

function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerTitleAlign: 'center' }}>
      <Stack.Screen name="MoreHome" component={MoreScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Voters" component={VotersScreen} options={{ headerShown: false }} />
      <Stack.Screen name="VoterDetail" component={VoterDetailScreen} options={{ title: 'Voter' }} />
      <Stack.Screen name="ServiceRequestDetail" component={ServiceRequestDetailScreen} options={{ title: 'Ticket' }} />
      <Stack.Screen name="Campaigns" component={CampaignsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Events" component={AdminEventsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FlowImages" component={FlowImagesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Stack.Navigator>
  );
}

const tabIcon = (emoji) => () =>
  <Text style={{ fontSize: 20 }}>{emoji}</Text>;

export default function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand700,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="DashboardTab" component={DashboardStack} options={{ title: 'Dashboard', tabBarIcon: tabIcon('📊') }} />
      <Tab.Screen name="RequestsTab" component={RequestsStack} options={{ title: 'Requests', tabBarIcon: tabIcon('📋') }} />
      <Tab.Screen name="MembersTab" component={MembersStack} options={{ title: 'Members', tabBarIcon: tabIcon('👥') }} />
      <Tab.Screen name="MoreTab" component={MoreStack} options={{ title: 'More', tabBarIcon: tabIcon('⚙️') }} />
    </Tab.Navigator>
  );
}
