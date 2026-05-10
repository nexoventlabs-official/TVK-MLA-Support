import axios from 'axios'

/**
 * Axios client for the citizen portal.
 *
 * baseURL resolution order:
 *   1. import.meta.env.VITE_API_URL  (set in Vercel for production)
 *   2. '/api'                        (dev fallback — Vite proxies to :5050)
 *
 * In production the value should end at the API root (e.g.
 * "https://tvk-mla-support.onrender.com/api"). The portal-specific paths
 * ("/portal/...") are appended below at every call site so this client can
 * also reach the public admin endpoints (e.g. /api/events) when needed.
 */
const baseURL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL,
  timeout: 30_000,
})

const TOKEN_KEY = 'tvk_portal_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else   localStorage.removeItem(TOKEN_KEY)
}

api.interceptors.request.use((cfg) => {
  const t = getToken()
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // Drop a stale token so the next page load redirects to the auth screen
    // instead of silently failing again.
    if (err?.response?.status === 401) setToken(null)
    return Promise.reject(err)
  }
)

export default api
