import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { setUnauthorizedHandler } from '@/lib/axios'
import { getCurrentUser, logout as logoutRequest } from '@/services/authService'

const AuthContext = createContext(null)

/**
 * Session utilisateur. Le JWT est dans un cookie HTTP-only : au chargement,
 * `/auth/me` permet de restaurer la session après un rafraîchissement.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let active = true
    getCurrentUser()
      .then(current => { if (active) setUser(current) })
      .catch(() => { if (active) setUser(null) })
      .finally(() => { if (active) setStatus('ready') })
    setUnauthorizedHandler(() => setUser(null))
    return () => { active = false; setUnauthorizedHandler(null) }
  }, [])

  const logout = useCallback(async () => {
    try { await logoutRequest() } catch { /* La session locale est fermée même si le serveur ne répond pas. */ }
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, setUser, logout, loading: status === 'loading' }), [user, logout, status])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans <AuthProvider>.')
  return context
}
