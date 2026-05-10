import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api, { getToken, setToken } from './api'

/**
 * Single source of truth for "who is the current portal user".
 *
 * On mount we look for a saved JWT and try to hydrate the session from
 * /portal/auth/me. If the call fails (token expired, server cold-started,
 * etc.) we drop the token and present the user as logged-out — so the rest of
 * the app can rely on `user === null` meaning "show login/register".
 */

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      const token = getToken()
      if (!token) { setReady(true); return }
      try {
        const { data } = await api.get('/portal/auth/me')
        if (!cancelled) setUser(data?.user || null)
      } catch {
        if (!cancelled) {
          setToken(null)
          setUser(null)
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    hydrate()
    return () => { cancelled = true }
  }, [])

  const login = useCallback((token, u) => {
    setToken(token)
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((patch) => {
    setUser((cur) => (cur ? { ...cur, ...patch } : cur))
  }, [])

  return (
    <AuthContext.Provider value={{ user, ready, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
