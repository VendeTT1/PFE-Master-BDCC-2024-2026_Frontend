import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { API_BASE } from '../../utils/api'
import { Eye, EyeOff, Sun, Moon, Loader, Check } from 'lucide-react'
import './Login.css'

/**
 * AcceptInvitation page — reached via the link in the invitation email.
 * URL format: /accept-invitation?token=<uuid>
 *
 * Calls POST /api/invitations/accept
 * Body: AcceptInvitationRequestDTO { token, password, firstName, lastName }
 * On success: redirect to /login
 */
export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const token = searchParams.get('token') || ''

  const [form, setForm] = useState({ firstName: '', lastName: '', password: '', confirm: '' })
  const [showPass, setShowPass]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState(false)

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (!token) { setError('Invalid invitation link — missing token.'); return }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/invitations/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          token,
          password:  form.password,
          firstName: form.firstName,
          lastName:  form.lastName,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Failed to accept invitation.')
      }
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Check size={26} style={{ color: 'var(--success)' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Account activated!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Redirecting you to sign in…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <button className="login-theme-toggle" onClick={toggleTheme}>
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="login-container">
        <div className="login-brand">
          <div className="login-logo">M</div>
          <h1 className="login-title">Accept your invitation</h1>
          <p className="login-subtitle">Set up your staff account to get started</p>
        </div>

        <div className="login-card">
          {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}
          {!token && (
            <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
              No invitation token found in the URL. Please use the link from your email.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="label">First name *</label>
                <input className="input" type="text" placeholder="Alex"
                  value={form.firstName} onChange={set('firstName')} required />
              </div>
              <div className="form-group">
                <label className="label">Last name *</label>
                <input className="input" type="text" placeholder="Morgan"
                  value={form.lastName} onChange={set('lastName')} required />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Password *</label>
              <div className="login-pass-wrapper">
                <input className="input" type={showPass ? 'text' : 'password'}
                  placeholder="Min. 6 characters" value={form.password}
                  onChange={set('password')} required />
                <button type="button" className="login-pass-toggle"
                  onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Confirm password *</label>
              <div className="login-pass-wrapper">
                <input className="input" type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat your password" value={form.confirm}
                  onChange={set('confirm')} required
                  style={{
                    borderColor: form.confirm && form.confirm !== form.password ? 'var(--danger)'
                      : form.confirm && form.confirm === form.password ? 'var(--success)' : undefined
                  }} />
                <button type="button" className="login-pass-toggle"
                  onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '1.25rem' }} disabled={loading || !token}>
              {loading ? <><Loader size={16} className="spin" /> Activating…</> : 'Activate Account'}
            </button>
          </form>
        </div>

        <p className="login-footer">
          Already have an account? <Link to="/login" className="login-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
