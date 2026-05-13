import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

export const TOKEN_KEY = 'tvk:auth:token';
export const ROLE_KEY = 'tvk:auth:role';
export const USER_KEY = 'tvk:auth:user';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

// Attach the bearer token (admin or portal — same header) on every request.
client.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return config;
});

// Normalise the error shape so screens can do `err.message` reliably.
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'Request failed';
    err.message = msg;
    return Promise.reject(err);
  }
);

export default client;
