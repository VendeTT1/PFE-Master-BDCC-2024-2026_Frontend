/**
 * api.js — centralised fetch wrapper for Mono SaaS frontend.
 *
 * ════════════════════════════════════════════════════════════
 * AUTH STRATEGY: HTTP-Only Cookies (two-cookie system)
 * ════════════════════════════════════════════════════════════
 *
 * Cookie name │ Content       │ Max-Age  │ Set by
 * ────────────┼───────────────┼──────────┼─────────────────
 * JWT         │ Access token  │ 15 min   │ /api/auth/login
 * Refresh_Token│ Refresh token │ 7 days   │ /api/auth/login
 *
 * JavaScript NEVER reads, writes, or stores either cookie.
 * The browser attaches them automatically via credentials:'include'.
 *
 * ════════════════════════════════════════════════════════════
 * PROACTIVE REFRESH STRATEGY
 * ════════════════════════════════════════════════════════════
 *
 * Instead of waiting for a 401 to know the access token expired,
 * we proactively call POST /api/auth/refresh every 12 minutes
 * (3 minutes before the 15-minute JWT expiry).
 *
 * This means users NEVER hit a mid-action 401 due to expiry.
 *
 * Timeline:
 *   t=0min  → login → JWT set (expires t=15min)
 *   t=12min → silent refresh → new JWT set (expires t=27min)
 *   t=24min → silent refresh → new JWT set (expires t=39min)
 *   ...continues as long as the Refresh_Token (7 days) is valid
 *
 * ════════════════════════════════════════════════════════════
 * REACTIVE 401 HANDLING (safety net)
 * ════════════════════════════════════════════════════════════
 *
 * If a request still gets a 401 (race condition, clock drift, etc.):
 *   1. Immediately call POST /api/auth/refresh
 *   2. Retry the original request once
 *   3. If refresh also fails → fire 'mono:session-expired' event
 *      → AuthContext clears user state → user sees /login
 *
 * ════════════════════════════════════════════════════════════
 * IMPORTANT: /api/auth/refresh returns 200 with an EMPTY BODY.
 * Do NOT call res.json() on it — it will throw a parse error.
 * ════════════════════════════════════════════════════════════
 *
 * PUBLIC API:
 *   import { api, startTokenRefresh, stopTokenRefresh } from '../utils/api'
 *
 *   startTokenRefresh()   // call once after login / session restore
 *   stopTokenRefresh()    // call on logout
 *
 *   await api.get('/instances')
 *   await api.post('/instances/create', { name: 'Prod' })
 *   await api.put('/company', { name: 'Acme', region: 'MA' })
 *   await api.del('/company/users/5')
 */

export const API_BASE = 'http://localhost:8080/api'

// ─── Refresh interval config ──────────────────────────────────────────────
// JWT expires in 15 minutes → we refresh every 12 minutes (3 min safety buffer)
const REFRESH_INTERVAL_MS = 13 * 60 * 1000  // 12 minutes in milliseconds

// Internal reference to the setInterval timer so we can clear it on logout
let _refreshTimer = null

// Tracks whether a refresh is already in-flight (prevents parallel refresh calls)
let _refreshInProgress = null

// ─── Silent token refresh ─────────────────────────────────────────────────
// Calls POST /api/auth/refresh.
// The Refresh_Token cookie is sent automatically by the browser.
// Spring Boot validates it and sets a new JWT cookie in the response.
// The response body is EMPTY — we only check the status code.
export async function silentRefresh() {
  // If a refresh is already running, wait for it instead of firing a second one
  if (_refreshInProgress) return _refreshInProgress

  _refreshInProgress = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',  // sends Refresh_Token cookie
        // No Content-Type — no request body needed
      })

      if (!res.ok) {
        // Refresh_Token is expired or revoked — session is dead
        stopTokenRefresh()
        window.dispatchEvent(new Event('mono:session-expired'))
        throw new Error('SESSION_EXPIRED')
      }

      // New JWT cookie is now set by the response headers.
      // res.body is empty — do NOT call res.json()
    } finally {
      _refreshInProgress = null
    }
  })()

  return _refreshInProgress
}

// ─── Start proactive refresh timer ───────────────────────────────────────
// Call this once after a successful login or session restore.
// It will call silentRefresh() every 12 minutes automatically.
export function startTokenRefresh() {
  // Clear any existing timer first (safety guard against double-calls)
  stopTokenRefresh()

  _refreshTimer = setInterval(async () => {
    try {
      await silentRefresh()
    } catch {
      // silentRefresh already fired 'mono:session-expired' if needed
      stopTokenRefresh()
    }
  }, REFRESH_INTERVAL_MS)

  // setInterval does NOT fire immediately — it waits for the first interval.
  // That's correct: we just logged in so the token is fresh.
}

// ─── Stop proactive refresh timer ────────────────────────────────────────
// Call this on logout or when the session expires.
export function stopTokenRefresh() {
  if (_refreshTimer !== null) {
    clearInterval(_refreshTimer)
    _refreshTimer = null
  }
}

// ─── Core request ─────────────────────────────────────────────────────────
async function request(method, path, body, isRetry = false) {
  const headers = {}

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',  // sends JWT cookie on every request
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // ── 401 handling: try one silent refresh then retry ───────────────────
  if (res.status === 401 && !isRetry) {
    try {
      await silentRefresh()
      // Refresh succeeded → retry the original request with the new JWT cookie
      return request(method, path, body, true)
    } catch {
      // Refresh failed → session is dead, silentRefresh already fired the event
      throw new Error('Your session has expired. Please sign in again.')
    }
  }

  // ── Hard 401 after retry — should not normally happen ────────────────
  if (res.status === 401 && isRetry) {
    stopTokenRefresh()
    window.dispatchEvent(new Event('mono:session-expired'))
    throw new Error('Your session has expired. Please sign in again.')
  }

  // ── Other error responses ─────────────────────────────────────────────
  if (!res.ok) {
    let message = `Request failed: ${res.status} ${res.statusText}`
    try {
      const json = await res.json()
      if (json.message) message = json.message
    } catch { /* response body wasn't JSON */ }
    throw new Error(message)
  }

  // ── Success ───────────────────────────────────────────────────────────
  if (res.status === 204) return null          // No Content
  if (res.headers.get('content-length') === '0') return null  // empty body

  // Guard: only parse JSON if content-type says so
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json()
  }

  // Plain text response (e.g. a URL string from /instances/{id}/access)
  return res.text()
}

export const api = {
  get:   (path)        => request('GET',    path),
  post:  (path, body)  => request('POST',   path, body),
  put:   (path, body)  => request('PUT',    path, body),
  patch: (path, body)  => request('PATCH',  path, body),
  del:   (path)        => request('DELETE', path),
}