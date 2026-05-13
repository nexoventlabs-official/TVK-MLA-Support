import Constants from 'expo-constants';

// Resolve in priority order:
//   1. EXPO_PUBLIC_API_BASE_URL env (Expo injects EXPO_PUBLIC_* into process.env at build)
//   2. app.json -> expo.extra.apiBaseUrl
//   3. dev fallback
const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const extraUrl = Constants?.expoConfig?.extra?.apiBaseUrl;

export const API_BASE_URL =
  envUrl || extraUrl || 'http://localhost:5000/api';

export const APP_NAME = 'TVK Mylapore';
