import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import {
  login as loginRequest,
  getCurrentUser,
  type AuthUser,
  type LoginCredentials,
} from '../api/auth.api'

import { ApiError } from '../api/client'

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(() => {
    sessionStorage.removeItem('auth_token')
    setUser(null)
  }, [])

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const response = await loginRequest(credentials)

      sessionStorage.setItem('auth_token', response.token)
      setUser(response.user)
    },
    [],
  )

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      const token = sessionStorage.getItem('auth_token')

      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const currentUser = await getCurrentUser()

        if (!cancelled) {
          setUser(currentUser)
        }
      } catch (error) {
        if (!cancelled) {
          sessionStorage.removeItem('auth_token')
          setUser(null)

          if (
            error instanceof ApiError &&
            error.status !== 401
          ) {
            console.error(
              'Error al recuperar la sesión:',
              error.message,
            )
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth debe utilizarse dentro de un AuthProvider',
    )
  }

  return context
}
