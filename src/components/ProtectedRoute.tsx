import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSpinner } from './ui'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: string[]
}

export default function ProtectedRoute({ children, requiredRoles = [] }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location }, replace: true })
      return
    }
    if (requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some((role) => hasRole(role))
      if (!hasRequiredRole) {
        navigate('/', { replace: true })
      }
    }
  }, [isAuthenticated, isLoading, hasRole, requiredRoles, navigate, location])

  if (isLoading || !isAuthenticated) {
    return <LoadingSpinner />
  }

  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some((role) => hasRole(role))
    if (!hasRequiredRole) {
      return null
    }
  }

  return <>{children}</>
}
