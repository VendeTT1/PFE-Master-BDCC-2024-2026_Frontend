import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Eye, EyeOff, Sun, Moon, Loader, Check } from 'lucide-react'
import './Login.css'

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

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    companyName: '', country: '',
    password: '', confirm: '', agreeTerms: false,
  })
  const [showPass, setShowPass]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState(false)

  const strength = getPasswordStrength(form.password)

  function set(field) {
    return e => setForm(prev => ({
      ...prev,
      [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    if (!form.agreeTerms) { setError('You must accept the terms to continue.'); return }

    setLoading(true)
    try {
      // POST /api/auth/register
      // Body: { companyName, country, email, password, firstName, lastName }
      // Response: { companyId, userId, message }
      await register({
        companyName: form.companyName,
        country:     form.country,
        email:       form.email,
        password:    form.password,
        firstName:   form.firstName,
        lastName:    form.lastName,
      })
      // Registration doesn't auto-login — redirect to login with success message
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
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Account created!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Redirecting you to sign in...
            </p>
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

      <div className="login-container" style={{ maxWidth: 460 }}>
        <div className="login-brand">
          <div className="login-logo">M</div>
          <h1 className="login-title">Create your account</h1>
          <p className="login-subtitle">Set up your company and start managing Odoo instances</p>
        </div>

        <div className="login-card">
          {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Name */}
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

            {/* Company */}
            <div className="form-row">
              <div className="form-group">
                <label className="label">Company name *</label>
                <input className="input" type="text" placeholder="Acme Corp"
                  value={form.companyName} onChange={set('companyName')} required />
              </div>
              <div className="form-group">
                <label className="label">Country *</label>
                <input className="input" type="text" placeholder="MA"
                  value={form.country} onChange={set('country')}
                  maxLength={3} required />
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="label">Email address *</label>
              <input className="input" type="email" placeholder="you@company.com"
                value={form.email} onChange={set('email')} required autoComplete="email" />
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="label">Password *</label>
              <div className="login-pass-wrapper">
                <input className="input" type={showPass ? 'text' : 'password'}
                  placeholder="Min. 6 characters" value={form.password}
                  onChange={set('password')} required autoComplete="new-password" />
                <button type="button" className="login-pass-toggle"
                  onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password && (
                <div style={{ marginTop: 8 }}>
                  <div className="strength-bar-track">
                    {[1,2,3,4].map(n => (
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

            {/* Confirm */}
            <div className="form-group">
              <label className="label">Confirm password *</label>
              <div className="login-pass-wrapper">
                <input className="input" type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat your password" value={form.confirm}
                  onChange={set('confirm')} required autoComplete="new-password"
                  style={{
                    borderColor: form.confirm && form.confirm !== form.password ? 'var(--danger)'
                      : form.confirm && form.confirm === form.password ? 'var(--success)' : undefined
                  }} />
                <button type="button" className="login-pass-toggle"
                  onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.confirm && form.confirm === form.password && (
                <span style={{ fontSize: 12, color: 'var(--success)', display: 'flex',
                  alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Check size={12} /> Passwords match
                </span>
              )}
            </div>

            {/* Terms */}
            <label className="register-terms">
              <input type="checkbox" checked={form.agreeTerms} onChange={set('agreeTerms')} />
              <span>
                I agree to the{' '}
                <a href="/terms" target="_blank" style={{ color: 'var(--accent)' }}>Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" style={{ color: 'var(--accent)' }}>Privacy Policy</a>
              </span>
            </label>

            <button type="submit" className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '1.25rem' }} disabled={loading}>
              {loading
                ? <><Loader size={16} className="spin" /> Creating account...</>
                : 'Create account'
              }
            </button>
          </form>
        </div>

        <p className="login-footer">
          Already have an account?{' '}
          <Link to="/login" className="login-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
