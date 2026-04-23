import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Eye, EyeOff, Sun, Moon, Loader } from 'lucide-react'
import './Login.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // POST /api/auth/login → returns UserResponseDTO directly (role included)
      // AuthContext.login() reads the role from the response and returns it
      const role = await login(email, password)

      if (!role) {
        setError('Login succeeded but could not load your profile. Please try again.')
        return
      }

      const simple = role.replace('ROLE_', '')
      if (simple === 'ADMIN')      navigate('/admin/dashboard', { replace: true })
      else if (simple === 'OWNER') navigate('/dashboard',       { replace: true })
      else if (simple === 'STAFF') navigate('/staff',           { replace: true })
      else                         navigate('/dashboard',       { replace: true })

    } catch (err) {
      setError(err.message || 'Unable to reach the server. Please try again.')
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
          <h1 className="login-title">Welcome back</h1>
          <p className="login-subtitle">Sign in to your Mono account</p>
        </div>

        <div className="login-card">
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email address</label>
              <input className="input" type="email" placeholder="you@company.com"
                value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email" />
            </div>

            <div className="form-group">
              <label className="label">Password</label>
              <div className="login-pass-wrapper">
                <input className="input" type={showPass ? 'text' : 'password'}
                  placeholder="........" value={password}
                  onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password" />
                <button type="button" className="login-pass-toggle"
                  onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Forgot password link */}
            <div style={{ textAlign: 'right', marginTop: 4 }}>
              <Link to="/forgot-password" className="login-forgot">Forgot password?</Link>
            </div>

            <button type="submit" className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '1.25rem' }} disabled={loading}>
              {loading ? <><Loader size={16} className="spin" /> Signing in...</> : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="login-footer">
          Don't have an account?{' '}
          <Link to="/register" className="login-link">Create one</Link>
        </p>
      </div>
    </div>
  )
}