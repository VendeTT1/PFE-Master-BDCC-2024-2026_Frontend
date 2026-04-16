import { createContext, useContext, useState, useEffect } from 'react'
import { api, API_BASE } from '../utils/api'

/**
 * AuthContext — session management with HTTP-Only cookie auth.
 *
 * SECURITY MODEL:
 * ────────────────
 * The JWT lives exclusively inside an HTTP-Only cookie set by Spring Boot.
 * JavaScript never reads, writes, or stores the token — the browser handles it.
 *
 * What React state holds (display data only — not sensitive):
 *   { id, email, firstName, lastName, role, status }
 *
 * SESSION LIFECYCLE:
 *
 *  LOGIN:
 *    POST /api/auth/login  (credentials: 'include')
 *    → Spring Boot validates credentials, sets HTTP-Only cookie in response
 *    → We call GET /api/auth/me — backend reads the cookie, returns user profile + role
 *
 *  PAGE REFRESH:
 *    → Cookie is still in the browser, sent automatically
 *    → GET /api/auth/me restores the session — backend handles everything
 *    → If 401 → cookie expired → show login
 *
 *  LOGOUT:
 *    POST /api/auth/logout  (credentials: 'include')
 *    → Spring Boot sets cookie Max-Age=0 to delete it
 *    → We clear React user state
 *
 *  401 on any request:
 *    → api.js fires 'mono:session-expired' event
 *    → AuthContext catches it and calls _clearSession()
 *
 * ROLES (from UserResponseDTO.role):
 *   'ROLE_OWNER' → /dashboard
 *   'ROLE_ADMIN' → /admin/dashboard
 *   'ROLE_STAFF' → /staff
 *
 * simpleRole strips the prefix: 'OWNER' | 'ADMIN' | 'STAFF'
 */

const AuthContext = createContext(null)

export { API_BASE }

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Listen for 401 events from api.js
  useEffect(() => {
    function onExpired() { _clearSession() }
    window.addEventListener('mono:session-expired', onExpired)
    return () => window.removeEventListener('mono:session-expired', onExpired)
  }, [])

  // On every app start / page refresh — validate the cookie by fetching user profile
  useEffect(() => {
    restoreSession()
  }, [])

  // ── Restore session ───────────────────────────────────────────────────
  // Tries to fetch the user profile using the existing cookie.
  // If it works → user is logged in. If 401 → cookie missing/expired.
  async function restoreSession() {
    setLoading(true)
    try {
      await fetchAndSetUser()
    } catch {
      // Cookie not present or expired — user needs to log in
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  // ── Fetch user profile ────────────────────────────────────────────────
  // Single call — the backend reads the cookie, resolves the role, returns the profile.
  // UserResponseDTO: { id, email, firstName, lastName, role, status }
  async function fetchAndSetUser(response_body) {

    const { email, role } = response_body;
    // const userData = await api.get('/auth/me')
    setUser({ email, role })
    return role
  }

  // ── Login ─────────────────────────────────────────────────────────────
  async function login(email, password) {
    // credentials: 'include' is set inside api.js for all requests.
    // For login we use a direct fetch because the response body tokens
    // are intentionally ignored — the cookie in the response header is all we need.
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',   // ← browser stores the Set-Cookie from the response
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message || 'Invalid email or password.')
    }

    // Cookie is now set. Fetch the user profile to learn the role.
    const role = await fetchAndSetUser(await res.json())
    return role   // caller uses this to navigate to the right home page
  }

  // ── Register ──────────────────────────────────────────────────────────
  // Creates a company + owner account.
  // Body: RegisterRequestDTO { companyName, country, email, password, firstName, lastName }
  // Response: RegisterResponseDTO { companyId, userId, message }
  // Registration does NOT log in — user is redirected to /login after.
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
  // Calls the backend to delete the HTTP-Only cookie (we cannot do it from JS).
  async function logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',   // sends the cookie so Spring Boot can clear it
      })
    } catch { /* network error — still clear local state */ }
    _clearSession()
  }

  // ── Clear local session state (called on logout or 401) ───────────────
  function _clearSession() {
    setUser(null)
    // Note: we do NOT touch localStorage here — no tokens were stored there.
    // The cookie is deleted server-side by the logout endpoint.
  }

  // ── Update user display info locally (e.g. after company name change) ─
  function updateUser(partial) {
    setUser(prev => prev ? { ...prev, ...partial } : prev)
  }

  // Strips 'ROLE_' prefix for simple role checks in components
  const simpleRole = user?.role ? user.role.replace('ROLE_', '') : null

  return (
    <AuthContext.Provider value={{
      user,
      simpleRole,     // 'OWNER' | 'ADMIN' | 'STAFF' | null
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
