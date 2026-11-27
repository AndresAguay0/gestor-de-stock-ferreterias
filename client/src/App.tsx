import { useCallback, useEffect, useState } from 'react'

import { AuthProvider, useAuth } from './auth/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

import './App.css'

function AppContent() {
  const { user, isLoading, logout } = useAuth()

  const [currentPath, setCurrentPath] = useState(
    window.location.pathname,
  )

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path)
    setCurrentPath(path)
  }, [])

  useEffect(() => {
    function handlePopState() {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    if (!user && currentPath !== '/login') {
      window.history.replaceState({}, '', '/login')
    }

    if (user && currentPath === '/login') {
      window.history.replaceState({}, '', '/')
    }
  }, [user, isLoading, currentPath])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  if (isLoading) {
    return (
      <main className="loading-screen">
        <p>Verificando sesión...</p>
      </main>
    )
  }

  if (!user) {
    return (
      <Login
        onLoginSuccess={() => navigate('/')}
      />
    )
  }

  return (
    <Dashboard onLogout={handleLogout} />
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App