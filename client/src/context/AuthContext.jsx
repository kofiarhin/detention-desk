/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getMe, loginUser, registerSchool as registerSchoolRequest } from '../services/auth.service'

const TOKEN_KEY = 'detentiondesk_token'
const SESSION_KEY = 'detentiondesk_session'

const AuthContext = createContext(null)

const readStorage = (key) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const parseSession = (raw) => {
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => readStorage(TOKEN_KEY) || '')
  const [session, setSession] = useState(() => parseSession(readStorage(SESSION_KEY)))
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  const persistSession = useCallback(({ nextToken, nextSession }) => {
    setToken(nextToken)
    setSession(nextSession)
    localStorage.setItem(TOKEN_KEY, nextToken)
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
  }, [])

  const clearAuth = useCallback(() => {
    setToken('')
    setSession(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(SESSION_KEY)
  }, [])

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setIsBootstrapping(false)
        return
      }

      try {
        const payload = await getMe(token)
        const nextSession = {
          user: payload.data.user,
          school: payload.data.school || session?.school || null,
          policy: payload.data.policy || null,
        }
        setSession(nextSession)
        localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
      } catch {
        clearAuth()
      } finally {
        setIsBootstrapping(false)
      }
    }

    bootstrap()
  }, [token, clearAuth, session?.school])

  const login = useCallback(
    async (credentials) => {
      const payload = await loginUser(credentials)
      const nextSession = {
        user: payload.data.user,
        school: payload.data.school || null,
        policy: payload.data.policy || null,
      }
      persistSession({ nextToken: payload.data.token, nextSession })
      return nextSession
    },
    [persistSession],
  )

  const register = useCallback(
    async (input) => {
      const payload = await registerSchoolRequest(input)
      const nextSession = {
        user: payload.data.user,
        school: payload.data.school || null,
        policy: payload.data.policy || null,
      }
      persistSession({ nextToken: payload.data.token, nextSession })
      return nextSession
    },
    [persistSession],
  )

  const value = useMemo(() => {
    const role = session?.user?.role || ''
    return {
      token,
      user: session?.user || null,
      school: session?.school || null,
      policy: session?.policy || null,
      role,
      isAdmin: role === 'schoolAdmin',
      isAuthenticated: Boolean(token),
      isBootstrapping,
      login,
      register,
      logout: clearAuth,
    }
  }, [token, session, isBootstrapping, login, register, clearAuth])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
