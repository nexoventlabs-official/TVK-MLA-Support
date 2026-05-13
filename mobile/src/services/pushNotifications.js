import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { registerPushToken } from '../api/admin';

// Foreground display: while the app is open, still show the notification banner.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Ask for permission, fetch an Expo push token, register it with the
 * backend. Safe to call repeatedly — the backend de-dups.
 *
 * Returns the token on success, or null if anything went wrong (permission
 * denied, simulator, missing EAS projectId). Callers should treat a null
 * return as a "no-op" rather than an error — push is best-effort.
 */
export async function registerForPushNotifications(role) {
  try {
    if (!Device.isDevice) return null;

    // Android requires an explicit channel for sound + vibration.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'TVK alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0b3d2e',
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const ask = await Notifications.requestPermissionsAsync();
      status = ask.status;
    }
    if (status !== 'granted') return null;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId;

    // expo-notifications v0.29+ requires projectId in dev clients & EAS builds.
    // In Expo Go without a configured project, getExpoPushTokenAsync still
    // works but emits a warning — we swallow that.
    const tokenRes = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync().catch(() => null);

    const token = tokenRes?.data;
    if (!token) return null;

    await registerPushToken(token, role);
    return token;
  } catch (err) {
    console.warn('[push] register failed:', err?.message || err);
    return null;
  }
}

/**
 * Subscribe to incoming notifications + user taps. Returns an unsubscribe
 * function to call from useEffect cleanup.
 */
export function addNotificationListeners({ onReceive, onResponse } = {}) {
  const sub1 = onReceive
    ? Notifications.addNotificationReceivedListener(onReceive)
    : null;
  const sub2 = onResponse
    ? Notifications.addNotificationResponseReceivedListener(onResponse)
    : null;
  return () => {
    sub1?.remove();
    sub2?.remove();
  };
}
