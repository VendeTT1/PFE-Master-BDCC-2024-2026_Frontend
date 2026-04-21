import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './ProtectedRoute.css'

/**
 * ProtectedRoute — guards pages by auth status and role.
 *
 * LOADING BEHAVIOUR:
 *   While AuthContext is calling GET /api/auth/me on startup,
 *   loading=true. We show a full-screen spinner instead of null/redirect.
 *   This prevents the flash-to-login on page refresh.
 *
 * ROLE STRINGS:
 *   simpleRole strips 'ROLE_' prefix: 'OWNER' | 'ADMIN' | 'STAFF'
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, simpleRole, loading } = useAuth()

  // Still waiting for the cookie session check — show spinner, never redirect
  if (loading) {
    return (
      <div className="pr-loading">
        <div className="pr-spinner" />
      </div>
    )
  }

  // Session check finished and no user — go to login
  if (!user) return <Navigate to="/login" replace />

  // User is authenticated but hitting a route they can't access — redirect to their home
  if (allowedRoles && !allowedRoles.includes(simpleRole)) {
    if (simpleRole === 'ADMIN') return <Navigate to="/admin/dashboard" replace />
    if (simpleRole === 'OWNER') return <Navigate to="/dashboard"       replace />
    if (simpleRole === 'STAFF') return <Navigate to="/staff"           replace />
  }

  return children
}