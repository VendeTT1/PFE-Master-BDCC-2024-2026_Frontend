import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { API_BASE } from '../../context/AuthContext'
import { Eye, EyeOff, Sun, Moon, Loader, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import './Login.css'

/**
 * ResetPassword page — /reset-password
 *
 * Reached via the link in the reset email:
 *   https://yourapp.com/reset-password?token=<uuid>
 *
 * Calls POST /api/auth/reset-password
 * Body:     ResetPasswordRequestDTO { token, newPassword }
 * Response: MessageResponseDTO      { message }
 */

function getPasswordStrength(pw) {
  let s = 0
  if (pw.length >= 6)           s++
  if (pw.length >= 10)          s++
  if (/[A-Z]/.test(pw))        s++
  if (/[0-9]/.test(pw))        s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(s, 4)
}
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLORS = ['', 'var(--danger)', 'var(--warning)', 'var(--info)', 'var(--success)']

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  // Token comes from the URL: /reset-password?token=abc123
  const token = searchParams.get('token') || ''

  const [newPassword, setNewPassword]     = useState('')
  const [confirmPassword, setConfirm]     = useState('')
  const [showNew, setShowNew]             = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [loading, setLoading]             = useState(false)
  const [success, setSuccess]             = useState(false)
  const [error, setError]                 = useState('')

  const strength = getPasswordStrength(newPassword)
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword

  // If no token in the URL — show an error immediately
  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new one.')
    }
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!token) {
      setError('Invalid reset link. Please request a new one.')
      return
    }

    setLoading(true)
    try {
      // POST /api/auth/reset-password
      // Body: ResetPasswordRequestDTO { token, newPassword }
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, newPassword }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Reset failed. The link may have expired.')
      }

      setSuccess(true)
      // Auto-redirect to login after 3 seconds
      setTimeout(() => navigate('/login', { replace: true }), 3000)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <button className="login-theme-toggle" onClick={toggleTheme}>
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="login-container">
        <div className="login-brand">
          <div className="login-logo">M</div>
          <h1 className="login-title">
            {success ? 'Password updated!' : 'Set new password'}
          </h1>
          <p className="login-subtitle">
            {success
              ? 'Redirecting you to sign in...'
              : 'Choose a strong password for your account'
            }
          </p>
        </div>

        <div className="login-card">

          {/* ── Success state ── */}
          {success ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--success-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}>
                <CheckCircle size={26} style={{ color: 'var(--success)' }} />
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Your password has been updated successfully.
                You will be redirected to the sign in page in a moment.
              </p>
              <Link to="/login" className="btn btn-primary btn-lg"
                style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
                Go to sign in
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              {/* Token missing warning */}
              {!token && (
                <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                  <AlertCircle size={14} /> Invalid reset link. Please{' '}
                  <Link to="/forgot-password" style={{ color: 'inherit', fontWeight: 600 }}>
                    request a new one
                  </Link>.
                </div>
              )}

              {error && token && (
                <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* New password */}
                <div className="form-group">
                  <label className="label">New password</label>
                  <div className="login-pass-wrapper">
                    <input
                      className="input"
                      type={showNew ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      autoFocus
                      disabled={!token}
                      autoComplete="new-password"
                    />
                    <button type="button" className="login-pass-toggle"
                      onClick={() => setShowNew(v => !v)} tabIndex={-1}>
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Strength meter */}
                  {newPassword && (
                    <div style={{ marginTop: 8 }}>
                      <div className="strength-bar-track">
                        {[1, 2, 3, 4].map(n => (
                          <div key={n} className="strength-bar-segment"
                            style={{ background: n <= strength ? STRENGTH_COLORS[strength] : 'var(--border-md)' }} />
                        ))}
                      </div>
                      <span style={{ fontSize: 12, color: STRENGTH_COLORS[strength] }}>
                        {STRENGTH_LABELS[strength]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="form-group">
                  <label className="label">Confirm new password</label>
                  <div className="login-pass-wrapper">
                    <input
                      className="input"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={e => setConfirm(e.target.value)}
                      required
                      disabled={!token}
                      autoComplete="new-password"
                      style={{
                        borderColor: confirmPassword
                          ? passwordsMatch ? 'var(--success)' : 'var(--danger)'
                          : undefined
                      }}
                    />
                    <button type="button" className="login-pass-toggle"
                      onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Match indicator */}
                  {confirmPassword && (
                    <span style={{
                      fontSize: 12, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4,
                      color: passwordsMatch ? 'var(--success)' : 'var(--danger)',
                    }}>
                      {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </span>
                  )}
                </div>

                <button type="submit" className="btn btn-primary btn-lg"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                  disabled={loading || !token || !passwordsMatch}>
                  {loading
                    ? <><Loader size={16} className="spin" /> Updating password...</>
                    : 'Set new password'
                  }
                </button>
              </form>
            </>
          )}
        </div>

        {!success && (
          <p className="login-footer">
            <Link to="/login" className="login-link"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}