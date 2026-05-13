import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_KEY, ROLE_KEY, USER_KEY } from '../api/client';
import * as auth from '../api/auth';
import { registerForPushNotifications } from '../services/pushNotifications';

const AuthContext = createContext(null);

/**
 * AuthProvider owns:
 *   - role ('admin' | 'user' | null)
 *   - token (the bearer for /api/auth or /api/portal)
 *   - user (profile blob — shape differs per role)
 *
 * On launch we restore from AsyncStorage; AuthContext re-validates the token
 * in the background and signs out automatically if the server says it's
 * stale (so old logins don't leave the app in a half-broken state).
 */
export function AuthProvider({ children }) {
  const [hydrating, setHydrating] = useState(true);
  const [role, setRole] = useState(null); // 'admin' | 'user' | null
  const [user, setUser] = useState(null);

  // Bootstrap from storage.
  useEffect(() => {
    (async () => {
      try {
        const [storedRole, storedUser] = await Promise.all([
          AsyncStorage.getItem(ROLE_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (storedRole) setRole(storedRole);
        if (storedUser) {
          try { setUser(JSON.parse(storedUser)); } catch { /* ignore */ }
        }
      } finally {
        setHydrating(false);
      }
    })();
  }, []);

  // Background revalidation — runs once per launch after the bootstrap above
  // resolves. If the backend says the token is no good, we sign out silently
  // so the user lands on the login screen with no surprise mid-session error.
  useEffect(() => {
    if (hydrating || !role) return;
    (async () => {
      try {
        if (role === 'admin') {
          const { user: u } = await auth.adminVerify();
          setUser(u);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
        } else if (role === 'user') {
          const u = await auth.portalMe();
          setUser(u.user || u);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(u.user || u));
        }
      } catch (err) {
        // 401/403 => signout. Network errors => leave session intact.
        const status = err?.response?.status;
        if (status === 401 || status === 403) await signOut();
        return;
      }
      // Token survived revalidation — (re)register for push. Best-effort.
      registerForPushNotifications(role).catch(() => {});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrating]);

  const signInAdmin = useCallback(async (username, password) => {
    const data = await auth.adminLogin(username, password);
    await persist('admin', data.token, data.user);
    setRole('admin');
    setUser(data.user);
    registerForPushNotifications('admin').catch(() => {});
    return data;
  }, []);

  const signInUser = useCallback(async (data) => {
    // `data` shape: { token, user: {...} } OR { token, ...userFields }
    const u = data.user || {
      phone: data.phone,
      name: data.name,
      memberId: data.memberId,
      isRegistered: data.isRegistered,
    };
    await persist('user', data.token, u);
    setRole('user');
    setUser(u);
    registerForPushNotifications('user').catch(() => {});
    return data;
  }, []);

  const signOut = useCallback(async () => {
    setRole(null);
    setUser(null);
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(ROLE_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
  }, []);

  return (
    <AuthContext.Provider
      value={{ hydrating, role, user, signInAdmin, signInUser, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

async function persist(role, token, user) {
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, token),
    AsyncStorage.setItem(ROLE_KEY, role),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(user || null)),
  ]);
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
