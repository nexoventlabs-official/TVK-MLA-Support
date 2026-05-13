import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../store/AuthContext';
import AuthStack from './AuthStack';
import UserTabs from './UserTabs';
import AdminTabs from './AdminTabs';
import SplashScreen from '../screens/SplashScreen';

/**
 * The whole app shows ONE of three stacks based on auth state:
 *   - hydrating      → splash
 *   - role === null  → AuthStack (login / register)
 *   - role === 'admin' → AdminTabs
 *   - role === 'user'  → UserTabs
 *
 * Swapping the entire navigator (rather than redirecting) means there's no
 * residual back-stack: a citizen who logs out can't swipe back into the app.
 */
export default function RootNavigator() {
  const { hydrating, role } = useAuth();

  if (hydrating) return <SplashScreen />;

  return (
    <NavigationContainer>
      {role === 'admin' ? <AdminTabs /> : role === 'user' ? <UserTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
