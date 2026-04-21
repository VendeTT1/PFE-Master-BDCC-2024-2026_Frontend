import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { api } from '../../utils/api'
import { ExternalLink, LogOut, Sun, Moon, Loader, AlertCircle } from 'lucide-react'
import '../../styles/global.css'
import '../../styles/admin.css'

export default function StaffRedirect() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [instance, setInstances] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  useEffect(() => {
     async function loadInstances() {
    setLoading(true)
    try {
      // GET /api/instances → InstanceResponseDTO[] { id, name, url, status }
      const data = await api.get('/instances/userInstance')
      setInstances(data || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
    loadInstances()
  }, [])

   async function handleOpenInstance(id) {
    try {
      // GET /api/instances/{id}/access → plain string URL in the response
      const response = await api.get(`/instances/${id}/access`);

      // Extracting the access URL from the response object
      const url = response.accessURL;

      // Open the access URL in a new tab
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');  // '_blank' opens in a new tab
      } else {
        console.error('Access URL not found in the response');
      }
    } catch (err) {
      console.error('Error fetching access URL:', err.message);
      setError('Could not get instance URL: ' + err.message);
    }
  }

  async function handleLogout() {
    await logout()
    window.location.href = '/login'
  }

  const initials = user
    ? `${user.firstName || ''}${user.lastName || ''}`.toUpperCase() || '??'
    : '??'

  return (
    <div className="staff-page">
      <button className="login-theme-toggle" onClick={toggleTheme}
        style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 10,
          width: 38, height: 38, borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)', border: '1px solid var(--border-md)',
          color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', transition: 'all var(--transition)' }}>
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="staff-card card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent)',
            color: '#fff', fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>M</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
            Welcome, {user.firstName || 'there'}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Select your instance to get started.
          </p>
        </div>

        {/* User pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '1.5rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)',
            color: '#fff', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{user.firstName} {user.lastName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.email}</div>
          </div>
          <span className="badge badge-info" style={{ marginLeft: 'auto', fontSize: 11 }}>
            {user.role.replace('ROLE_', '') || 'STAFF'}
          </span>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={14} /> {error}
        </div>}

        {/* Instances */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
            <Loader size={20} className="spin" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: 8, fontSize: 13 }}>Loading your instance…</p>
          </div>
        ) : instance.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: 14 }}>
            No instances assigned. Contact your administrator.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1rem' }}>
            {/* {instances.map(inst => ( */}
              <button key={instance.id} className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => handleOpenInstance(instance.id)}>
                <ExternalLink size={16} /> Open {instance.nameInstance}
              </button>
            {/* ))} */}
          </div>
        )}

        <div className="divider" />
        <button className="btn btn-ghost" onClick={handleLogout}
          style={{ width: '100%', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </div>
  )
}
