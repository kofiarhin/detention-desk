/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getMe, loginUser, registerSchool as registerSchoolRequest } from '../services/auth.service'
import { setApiAuthHandlers } from '../services/api'

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

const getRoleHome = (user) => {
  if (!user) return '/login'
  if (user.role === 'schoolAdmin') return '/admin/dashboard'
  if (user.role === 'teacher') return '/teacher/students'
  if (user.role === 'parent') {
    return user.mustChangePassword ? '/parent/change-password' : '/parent/students'
  }
  return '/login'
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => readStorage(TOKEN_KEY) || '')
  const [session, setSession] = useState(() => parseSession(readStorage(SESSION_KEY)))
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [sessionMessage, setSessionMessage] = useState('')

  const persistSession = useCallback(({ nextToken, nextSession }) => {
    setToken(nextToken)
    setSession(nextSession)
    localStorage.setItem(TOKEN_KEY, nextToken)
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
  }, [])

  const clearAuth = useCallback((message = '') => {
    setToken('')
    setSession(null)
    setSessionMessage(message)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(SESSION_KEY)
  }, [])

  useEffect(() => {
    setApiAuthHandlers({
      onUnauthorized: () => clearAuth('Session expired. Please sign in again.'),
      onPasswordResetRequired: () => {
        window.location.assign('/parent/change-password')
      },
    })
  }, [clearAuth])

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
        clearAuth('Session expired. Please sign in again.')
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
      setSessionMessage('')
      return nextSession
    },
    [persistSession],
  )

  const refreshMe = useCallback(async () => {
    if (!token) return null
    const payload = await getMe(token)
    const nextSession = {
      user: payload.data.user,
      school: payload.data.school || session?.school || null,
      policy: payload.data.policy || null,
    }
    setSession(nextSession)
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
    return nextSession
  }, [token, session?.school])

  const register = useCallback(
    async (input) => {
      const payload = await registerSchoolRequest(input)
      const nextSession = {
        user: payload.data.user,
        school: payload.data.school || null,
        policy: payload.data.policy || null,
      }
      persistSession({ nextToken: payload.data.token, nextSession })
      setSessionMessage('')
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
      role,
      isAuthenticated: Boolean(token),
      isBootstrapping,
      sessionMessage,
      login,
      register,
      refreshMe,
      logout: clearAuth,
      getRoleHome,
    }
  }, [token, session, isBootstrapping, login, register, refreshMe, clearAuth, sessionMessage])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
