import axios from 'axios';

// Shares the same backend API as the main admin panel but uses a
// dedicated localStorage key so a user can be signed into both panels
// simultaneously in the same browser without cross-interference.
const TOKEN_KEY = 'mylapore_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5050/api',
  timeout: 5 * 60 * 1000,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export { TOKEN_KEY };
export default api;
