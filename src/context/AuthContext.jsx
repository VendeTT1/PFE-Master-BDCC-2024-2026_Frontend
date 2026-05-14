import { createContext, useContext, useState, useEffect } from 'react'
import { api, API_BASE, silentRefresh, startTokenRefresh, stopTokenRefresh } from '../utils/api'

/**
 * AuthContext — session management with HTTP-Only cookie auth.
 *
 * COOKIE NAMES (set by Spring Boot, HttpOnly):
 *   JWT           → access token  (15 min)
 *   Refresh_Token → refresh token (8 hours per AuthService)
 *
 * UserResponseDTO shape (from AuthService.login):
 *   { email, firstName, lastName, role, status }
 *   NOTE: no 'id' field — the backend DTO doesn't include it.
 *
 * ROLES (UserRole enum → .name()):
 *   ROLE_OWNER  → /dashboard
 *   ROLE_ADMIN  → /admin/dashboard
 *   ROLE_STAFF  → /staff
 *
 * SESSION RESTORE ON PAGE REFRESH:
 *   1. POST /api/auth/refresh → reads Refresh_Token cookie → sets new JWT
 *   2. fetchAndSetProfile()   → GET /api/auth/admin or /api/auth/staff
 *      (using the new JWT cookie just set in step 1)
 *
 * LOGIN:
 *   POST /api/auth/login → returns UserResponseDTO directly in body
 *   (cookies set in response headers — no second profile call needed)
 *
 * PROACTIVE REFRESH:
 *   startTokenRefresh() fires every 12 minutes to keep the JWT alive
 *   before its 15-minute expiry.
 */

const AuthContext = createContext(null)

export { API_BASE }

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Listen for hard 401 events from api.js
  useEffect(() => {
    function onExpired() { _clearSession() }
    window.addEventListener('mono:session-expired', onExpired)
    return () => window.removeEventListener('mono:session-expired', onExpired)
  }, [])

  // Restore session on every mount / page refresh
  useEffect(() => {
    restoreSession()
    return () => stopTokenRefresh()
  }, [])

  // ── Restore session on page refresh ────────────────────────────────────
  async function restoreSession() {
    setLoading(true)
    try {
      // Step 1: exchange Refresh_Token cookie for a new JWT cookie
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!refreshRes.ok) {
        // Refresh_Token expired or missing — user must log in again
        setUser(null)
        stopTokenRefresh()
        return
      }

      // Step 2: JWT is fresh, fetch the user profile
      await fetchAndSetProfile()
      startTokenRefresh()
    } catch {
      setUser(null)
      stopTokenRefresh()
    } finally {
      setLoading(false)
    }
  }

  // ── Fetch user profile ──────────────────────────────────────────────────
  // Tries /auth/admin first (ROLE_ADMIN), falls back to /auth/staff (ROLE_OWNER / ROLE_STAFF).
  // TODO: replace both calls with api.get('/auth/me') once that endpoint is added.
  async function fetchAndSetProfile() {
    try {
      const adminUser = await api.get('/auth/admin')
      if (adminUser) {
        setUser(adminUser)
        return adminUser.role
      }
    } catch { /* not an admin, fall through */ }

    const staffUser = await api.get('/auth/staff')
    setUser(staffUser)
    return staffUser?.role
  }

  // ── Login ───────────────────────────────────────────────────────────────
  // POST /api/auth/login
  // Response: UserResponseDTO { email, firstName, lastName, role, status }
  //   (Spring Boot sets JWT + Refresh_Token cookies in the response headers)
  // No second profile call needed — the response IS the user DTO.
  async function login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message || 'Invalid email or password.')
    }

    // UserResponseDTO: { email, firstName, lastName, role, status }
    const userData = await res.json()
    setUser(userData)
    startTokenRefresh()

    return userData.role  // caller uses this to navigate to the right home page
  }

  // ── Register ────────────────────────────────────────────────────────────
  // POST /api/auth/register
  // Body: RegisterRequestDTO { companyName, country, email, password, firstName, lastName }
  // Response: RegisterResponseDTO { companyId, userId, message }
  // Does NOT log the user in — redirect to /login after success.
  async function register({ companyName, country, email, password, firstName, lastName }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ companyName, country, email, password, firstName, lastName }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message || 'Registration failed. Please try again.')
    }

    return res.json()
  }

  // ── Logout ──────────────────────────────────────────────────────────────
  // POST /api/auth/logout
  // Spring Boot revokes Refresh_Token and clears both cookies (MaxAge=0).
  async function logout() {
    stopTokenRefresh()
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch { /* network error — still clear local state */ }
    _clearSession()
  }

  function _clearSession() {
    stopTokenRefresh()
    setUser(null)
  }

  // Update local display info without a full re-login
  function updateUser(partial) {
    setUser(prev => prev ? { ...prev, ...partial } : prev)
  }

  // Strips 'ROLE_' prefix for simple role checks in components
  // e.g. 'ROLE_OWNER' → 'OWNER'
  const simpleRole = user?.role ? user.role.replace('ROLE_', '') : null

  return (
    <AuthContext.Provider value={{
      user,
      simpleRole,
      loading,
      login,
      logout,
      register,
      updateUser,
      restoreSession,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}