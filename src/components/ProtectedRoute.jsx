import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute — guards pages by auth status and role.
 *
 * allowedRoles uses simple role strings: 'OWNER' | 'ADMIN' | 'STAFF'
 * (the backend sends 'ROLE_OWNER' etc. — AuthContext strips the prefix
 *  and exposes it as simpleRole)
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, simpleRole, loading } = useAuth()

  if (loading) return null              // waiting for restoreSession()
  if (!user)   return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(simpleRole)) {
    if (simpleRole === 'ADMIN') return <Navigate to="/admin/dashboard" replace />
    if (simpleRole === 'OWNER') return <Navigate to="/dashboard"       replace />
    if (simpleRole === 'STAFF') return <Navigate to="/staff"           replace />
  }

  return children
}
