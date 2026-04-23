import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { API_BASE } from '../../context/AuthContext'
import { Mail, Sun, Moon, Loader, ArrowLeft, CheckCircle } from 'lucide-react'
import './Login.css'

/**
 * ForgotPassword page — /forgot-password
 *
 * Calls POST /api/auth/forgot-password
 * Body:     ForgotPasswordRequestDTO { email }
 * Response: MessageResponseDTO       { message }
 *
 * Backend always returns 200 with:
 * "If the email exists, a reset link has been sent"
 * This prevents email enumeration attacks — we show the same
 * success message regardless of whether the email exists.
 */
export default function ForgotPasswordPage() {
  const { theme, toggleTheme } = useTheme()

  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      })

      // Backend returns 200 regardless of whether email exists (security best practice)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Something went wrong. Please try again.')
      }

      setSent(true)
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
          <h1 className="login-title">Forgot password?</h1>
          <p className="login-subtitle">
            {sent ? 'Check your inbox' : "No worries, we'll send you reset instructions"}
          </p>
        </div>

        <div className="login-card">
          {sent ? (
            /* ── Success state ── */
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--success-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}>
                <CheckCircle size={26} style={{ color: 'var(--success)' }} />
              </div>

              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                If <strong>{email}</strong> is registered, you will receive a password
                reset link shortly. Check your spam folder if you don't see it.
              </p>

              {/* Let them resend if needed */}
              <button
                className="btn btn-secondary"
                style={{ width: '100%', marginBottom: '0.75rem' }}
                onClick={() => { setSent(false); setEmail('') }}
              >
                Try a different email
              </button>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              {error && (
                <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="label">Email address</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                    Enter the email address linked to your account.
                  </span>
                </div>

                <button type="submit" className="btn btn-primary btn-lg"
                  style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
                  {loading
                    ? <><Loader size={16} className="spin" /> Sending...</>
                    : <><Mail size={16} /> Send reset link</>
                  }
                </button>
              </form>
            </>
          )}
        </div>

        {/* Back to login */}
        <p className="login-footer">
          <Link to="/login" className="login-link"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}