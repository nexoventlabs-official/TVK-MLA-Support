import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import Placeholder from '../screens/Placeholder';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="Register"
        children={(p) => (
          <Placeholder
            {...p}
            name="Register"
            description="Phase 2 — register with phone, OTP, name, EPIC (optional)."
          />
        )}
        options={{ headerShown: true, title: 'Create account' }}
      />
    </Stack.Navigator>
  );
}
