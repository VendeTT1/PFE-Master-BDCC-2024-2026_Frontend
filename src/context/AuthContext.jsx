import { createContext, useContext, useState, useEffect } from 'react'
import { api, API_BASE, silentRefresh, startTokenRefresh, stopTokenRefresh } from '../utils/api'

/**
 * AuthContext — session management with HTTP-Only cookie auth.
 *
 * COOKIE NAMES (set by Spring Boot, HttpOnly, inaccessible to JS):
 *   JWT           → access token  (15 min)
 *   Refresh_Token → refresh token (7 days)
 *
 * WHY PAGE REFRESH USED TO LOG THE USER OUT:
 *   The old code called GET /api/auth/me which doesn't exist in the backend.
 *   Every call threw a 404/401, restoreSession() caught it, set user=null,
 *   and ProtectedRoute redirected to /login.
 *
 * HOW SESSION RESTORE NOW WORKS:
 *   On page refresh the JWT cookie may still be valid (< 15min old).
 *   We call POST /api/auth/refresh which:
 *     - reads the Refresh_Token cookie (valid for 7 days)
 *     - issues a fresh JWT cookie
 *     - returns 200 with empty body
 *   Then we call the profile endpoint that actually exists in your backend
 *   to get the user's display info and role.
 *
 * SESSION LIFECYCLE:
 *
 *  APP START / PAGE REFRESH:
 *    POST /api/auth/refresh  (Refresh_Token cookie sent automatically)
 *      ├── 200 → new JWT cookie set → GET profile endpoint → setUser()
 *      └── 401 → Refresh_Token expired → user must log in
 *
 *  LOGIN:
 *    POST /api/auth/login → returns UserResponseDTO directly → setUser()
 *    startTokenRefresh() → fires every 12 min
 *
 *  EVERY 12 MIN (background):
 *    POST /api/auth/refresh → new JWT cookie
 *
 *  LOGOUT:
 *    POST /api/auth/logout → both cookies deleted server-side
 *    stopTokenRefresh() → timer cleared, user=null
 *
 *  ANY 401 SLIPPING THROUGH:
 *    api.js fires 'mono:session-expired' → _clearSession()
 *
 * ─────────────────────────────────────────────────────────────
 * BACKEND NOTE:
 *   Your backend has GET /api/auth/staff and GET /api/auth/admin.
 *   We use /api/auth/staff as the profile endpoint since it works
 *   for ROLE_OWNER and ROLE_STAFF. ROLE_ADMIN uses /api/auth/admin.
 *   Once you add GET /api/auth/me on the backend, replace both calls
 *   with a single api.get('/auth/me').
 * ─────────────────────────────────────────────────────────────
 */

const AuthContext = createContext(null)

export { API_BASE }

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Listen for hard 401s from api.js
  useEffect(() => {
    function onExpired() { _clearSession() }
    window.addEventListener('mono:session-expired', onExpired)
    return () => window.removeEventListener('mono:session-expired', onExpired)
  }, [])

  // Restore session on every mount (page load / refresh)
  useEffect(() => {
    restoreSession()
    return () => stopTokenRefresh()
  }, [])

  // ── Restore session on page refresh ──────────────────────────────────
  // Step 1: call /api/auth/refresh to get a fresh JWT from the Refresh_Token cookie.
  //         This is the only endpoint that doesn't need a valid JWT — just the refresh cookie.
  // Step 2: fetch the user profile with the new JWT.
  async function restoreSession() {
    setLoading(true)
    try {
      // POST /api/auth/refresh — reads Refresh_Token cookie, sets new JWT cookie.
      // Returns 200 with EMPTY body (do not parse as JSON).
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',  // sends Refresh_Token cookie
      })

      if (!refreshRes.ok) {
        // Refresh_Token is expired or missing — user must log in
        setUser(null)
        stopTokenRefresh()
        return
      }

      // JWT is now fresh. Fetch the user profile.
      await fetchAndSetProfile()
      startTokenRefresh()
    } catch {
      setUser(null)
      stopTokenRefresh()
    } finally {
      setLoading(false)
    }
  }

  // ── Fetch user profile ────────────────────────────────────────────────
  // Uses whichever profile endpoint exists on the backend.
  // TODO: replace both calls with api.get('/auth/me') once you add that endpoint.
  async function fetchAndSetProfile() {
    // Try admin endpoint first — returns UserResponseDTO for ROLE_ADMIN
    try {
      const adminUser = await api.get('/auth/admin')
      if (adminUser) {
        setUser(adminUser)
        return adminUser.role
      }
    } catch { /* not admin, fall through */ }

    // Owner and Staff endpoint — returns UserResponseDTO for ROLE_OWNER / ROLE_STAFF
    const staffUser = await api.get('/auth/staff')
    setUser(staffUser)
    return staffUser.role
  }

  // ── Login ─────────────────────────────────────────────────────────────
  // POST /api/auth/login returns UserResponseDTO directly — no second profile call needed.
  async function login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',  // browser stores JWT + Refresh_Token from Set-Cookie headers
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message || 'Invalid email or password.')
    }

    // Login response IS the UserResponseDTO — no extra call needed
    const userData = await res.json()
    setUser(userData)
    startTokenRefresh()

    return userData.role
  }

  // ── Register ──────────────────────────────────────────────────────────
  // RegisterRequestDTO: { companyName, country, email, password, firstName, lastName }
  // RegisterResponseDTO: { companyId, userId, message }
  // Does NOT log in — user redirected to /login after.
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

  // ── Logout ────────────────────────────────────────────────────────────
  async function logout() {
    stopTokenRefresh()  // stop the timer immediately
    try {
      // Spring Boot sets both cookies Max-Age=0 and revokes the refresh token
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

  function updateUser(partial) {
    setUser(prev => prev ? { ...prev, ...partial } : prev)
  }

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