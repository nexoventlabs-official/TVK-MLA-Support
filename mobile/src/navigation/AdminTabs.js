import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import DashboardScreen from '../screens/admin/DashboardScreen';
import Placeholder from '../screens/Placeholder';
import ProfileScreen from '../screens/ProfileScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const stub = (name, description) => (props) =>
  <Placeholder {...props} name={name} description={description} />;

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome" component={DashboardScreen} />
      <Stack.Screen name="ServiceRequestDetail" options={{ headerShown: true, title: 'Ticket' }}>
        {stub('Ticket detail', 'Phase 3 — ticket detail + status update.')}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function RequestsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerTitleAlign: 'center' }}>
      <Stack.Screen name="ServiceRequests" options={{ title: 'Service Requests' }}>
        {stub('Service Requests', 'Phase 3 — searchable list of all tickets.')}
      </Stack.Screen>
      <Stack.Screen name="ServiceRequestDetail" options={{ title: 'Ticket' }}>
        {stub('Ticket detail', 'Phase 3 — ticket detail + status update.')}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function MembersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerTitleAlign: 'center' }}>
      <Stack.Screen name="Members" options={{ title: 'Members' }}>
        {stub('Members', 'Phase 3 — searchable list of all members.')}
      </Stack.Screen>
      <Stack.Screen name="MemberDetail" options={{ title: 'Member' }}>
        {stub('Member detail', 'Phase 3 — member profile + grievance history.')}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerTitleAlign: 'center' }}>
      <Stack.Screen name="MoreHome" options={{ title: 'More' }}>
        {stub('More', 'Voters · Campaigns · Events · Flow Images · Profile.')}
      </Stack.Screen>
      <Stack.Screen name="Voters" options={{ title: 'Voters' }}>
        {stub('Voters', 'Phase 3 — voter DB search.')}
      </Stack.Screen>
      <Stack.Screen name="VoterDetail" options={{ title: 'Voter' }}>
        {stub('Voter detail', 'Phase 3 — full voter record.')}
      </Stack.Screen>
      <Stack.Screen name="Campaigns" options={{ title: 'Campaigns' }}>
        {stub('Campaigns', 'Phase 3 — campaign list + status.')}
      </Stack.Screen>
      <Stack.Screen name="Events" options={{ title: 'Events' }}>
        {stub('Events', 'Phase 3 — event admin CRUD.')}
      </Stack.Screen>
      <Stack.Screen name="FlowImages" options={{ title: 'Flow Images' }}>
        {stub('Flow Images', 'Phase 3 — banner image management.')}
      </Stack.Screen>
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
