import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const hydrate = useCallback(async () => {
    const raw = localStorage.getItem('shopsense_session')
    if (!raw) { setLoading(false); return }
    try {
      const saved = JSON.parse(raw)
      // Older builds saved only profile information.  A profile without a JWT
      // looks signed in in the UI but cannot access any protected endpoint.
      if (!saved?.access_token || typeof saved.access_token !== 'string') {
        localStorage.removeItem('shopsense_session')
        setSession(null)
        return
      }
      setSession(saved)
      const { data: profile } = await api.get('/auth/me')
      const merged = { ...saved, ...profile }
      setSession(merged)
      localStorage.setItem('shopsense_session', JSON.stringify(merged))
    } catch {
      localStorage.removeItem('shopsense_session')
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { hydrate() }, [hydrate])

  // Vite hot reload can preserve React state from an older build.  Do not let
  // an in-memory profile without its JWT remain visible as a signed-in user.
  useEffect(() => {
    if (session && (!session.access_token || typeof session.access_token !== 'string')) {
      localStorage.removeItem('shopsense_session')
      setSession(null)
    }
  }, [session])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    setSession(data)
    localStorage.setItem('shopsense_session', JSON.stringify(data))
    return data
  }, [])

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload)
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('shopsense_session')
    setSession(null)
  }, [])

  return (
    <AuthContext.Provider value={{ session, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
