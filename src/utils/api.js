/**
 * api.js — centralised fetch wrapper for Mono SaaS frontend.
 *
 * AUTH STRATEGY: HTTP-Only Cookies
 * ─────────────────────────────────
 * The backend sets the JWT inside an HTTP-Only cookie on every successful
 * login/register response. The browser stores it and sends it automatically
 * on every subsequent request — JavaScript never reads or writes the token.
 *
 * What this means for every fetch call:
 *   - credentials: 'include'  →  tells the browser to attach the cookie
 *   - NO Authorization header →  the cookie IS the auth mechanism
 *   - NO localStorage/sessionStorage for any token
 *
 * On 401 (cookie expired / missing):
 *   - api.js fires a 'mono:session-expired' window event
 *   - AuthContext catches it, clears user state, redirects to /login
 *
 * USAGE:
 *   import { api } from '../utils/api'
 *
 *   const instances  = await api.get('/instances')
 *   const newInst    = await api.post('/instances/create', { name: 'Prod' })
 *   const updated    = await api.put('/company', { name: 'Acme', region: 'MA' })
 *   await api.del('/company/users/5')
 *
 * All methods throw an Error on non-2xx responses. The error message comes
 * from the backend JSON { message } field when available.
 */

export const API_BASE = 'http://localhost:8080/api'

// ── Core request ──────────────────────────────────────────────────────────
async function request(method, path, body) {
  const headers = {}

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',   // ← sends the HTTP-Only cookie automatically
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Cookie is expired or missing — notify AuthContext to clear user state
  if (res.status === 401) {
    window.dispatchEvent(new Event('mono:session-expired'))
    throw new Error('Your session has expired. Please sign in again.')
  }

  if (!res.ok) {
    let message = `Request failed: ${res.status} ${res.statusText}`
    try {
      const json = await res.json()
      if (json.message) message = json.message
    } catch { /* response body wasn't JSON */ }
    throw new Error(message)
  }

  // 204 No Content — nothing to parse
  if (res.status === 204) return null

  return res.json()
}

export const api = {
  get:   (path)        => request('GET',    path),
  post:  (path, body)  => request('POST',   path, body),
  put:   (path, body)  => request('PUT',    path, body),
  patch: (path, body)  => request('PATCH',  path, body),
  del:   (path)        => request('DELETE', path),
}
