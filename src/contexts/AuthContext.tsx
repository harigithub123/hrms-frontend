import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { UserInfo } from '../types/auth'
import * as api from '../api/client'

interface AuthState {
  user: UserInfo | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  roles: string[]
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (role: string) => boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getRefreshToken(): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [accessToken, setAccessTokenState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const logoutRef = useRef<() => void>(() => {})

  const persistAndSetAuth = useCallback((token: string | null, userData: UserInfo | null) => {
    api.setAccessToken(token)
    setAccessTokenState(token)
    setUser(userData)
    try {
      if (!token && typeof window !== 'undefined') localStorage.removeItem('refreshToken')
    } catch {
      // ignore
    }
  }, [])

  const logout = useCallback(() => {
    try {
      if (typeof window !== 'undefined') localStorage.removeItem('refreshToken')
    } catch {
      // ignore
    }
    persistAndSetAuth(null, null)
  }, [persistAndSetAuth])

  logoutRef.current = logout

  useEffect(() => {
    api.setOnTokenUpdate((token) => setAccessTokenState(token))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleSessionExpired = () => logoutRef.current()
    window.addEventListener('auth:session-expired', handleSessionExpired)
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired)
  }, [])

  useEffect(() => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      setIsLoading(false)
      return
    }
    let cancelled = false
    const timeoutId = setTimeout(() => {
      if (!cancelled) setIsLoading(false)
    }, 8000)
    api
      .refreshAuth()
      .then((data) => {
        if (cancelled) return
        if (data) persistAndSetAuth(data.accessToken, data.user)
      })
      .catch(() => {
        if (!cancelled) {
          try {
            if (typeof window !== 'undefined') localStorage.removeItem('refreshToken')
          } catch {
            // ignore
          }
          api.setAccessToken(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          clearTimeout(timeoutId)
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [persistAndSetAuth])

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await api.login(username, password)
      try {
        if (typeof window !== 'undefined') localStorage.setItem('refreshToken', res.refreshToken)
      } catch {
        // ignore
      }
      persistAndSetAuth(res.accessToken, res.user)
    },
    [persistAndSetAuth]
  )

  const hasRole = useCallback(
    (role: string) => {
      const r = role.startsWith('ROLE_') ? role : `ROLE_${role}`
      return user?.roles?.includes(r) ?? false
    },
    [user]
  )

  const refreshUser = useCallback(async () => {
    const u = await api.getMe()
    setUser(u)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: !!user && !!accessToken,
      isLoading,
      roles: user?.roles ?? [],
      login,
      logout,
      hasRole,
      refreshUser,
    }),
    [user, accessToken, isLoading, login, logout, hasRole, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
