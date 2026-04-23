import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { api } from '../../utils/api'
import {
  Server, Plus, Play, Square, RotateCcw,
  ExternalLink, X, Loader, AlertCircle, UserPlus, Mail, Check
} from 'lucide-react'

function StatusDot({ status }) {
  const cls = status === 'RUNNING' ? 'online' : status === 'STOPPED' ? 'offline' : 'pending'
  return <span className={`status-dot ${cls}`} />
}

export default function InstancesPage() {
  const [instance, setInstance]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [showAdd, setShowAdd]       = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [actionLoading, setAL]      = useState({})

  useEffect(() => { loadInstance() }, [])

  async function loadInstance() {
    setLoading(true)
    try {
      const data = await api.get('/instances/userInstance')
      setInstance(data || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(id, action) {
    setAL(prev => ({ ...prev, [id]: action }))
    try {
      await api.post(`/instances/${id}/${action}`)
      await loadInstance()
    } catch (err) {
      setError(err.message)
    } finally {
      setAL(prev => ({ ...prev, [id]: null }))
    }
  }

  async function handleOpenInstance(id) {
    try {
      const response = await api.get(`/instances/${id}/access`)
      const url = response?.accessURL || response?.url || response
      if (url && typeof url === 'string') {
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        setError('Access URL not available.')
      }
    } catch (err) {
      setError('Could not get instance URL: ' + err.message)
    }
  }

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>Instances</h1>
          <p>Monitor and manage your active Odoo connection.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setShowInvite(true)}>
            <UserPlus size={16} /> Invite Staff
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Instance
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={15} /> {error}
          <button className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto', padding: '2px 6px' }}
            onClick={() => setError('')}>x</button>
        </div>
      )}

      {loading ? (
        <div className="empty-state"><Loader size={24} className="spin" /></div>
      ) : !instance ? (
        <div className="card empty-state">
          <Server size={40} />
          <h3>No instance yet</h3>
          <p>Click "Add Instance" to deploy your first Odoo instance.</p>
        </div>
      ) : (
        <div className="instances-grid">
          <div className="card instance-card">
            <div className="ic-header">
              <div className="ic-icon-wrap"><Server size={20} /></div>
              <div className="ic-meta">
                <div className="ic-name">{instance.nameInstance}</div>
                <div className="ic-type">ID #{instance.id} - {instance.region}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                <StatusDot status={instance.status} />
              </div>
            </div>

            <div className="ic-stats">
              <div className="ic-stat">
                <span className="ic-stat-label">Status</span>
                <span className={`badge ${
                  instance.status === 'RUNNING' ? 'badge-success' :
                  instance.status === 'STOPPED' ? 'badge-danger' : 'badge-warning'
                }`} style={{ fontSize: 11 }}>{instance.status}</span>
              </div>
              <div className="ic-stat">
                <span className="ic-stat-label">Owner</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {instance.firstName} {instance.lastName}
                </span>
              </div>
              <div className="ic-stat">
                <span className="ic-stat-label">URL</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {instance.url ? 'Available' : 'Not set'}
                </span>
              </div>
            </div>

            <div className="ic-actions">
              <button className="btn btn-secondary btn-sm"
                disabled={instance.status === 'RUNNING' || !!actionLoading[instance.id]}
                onClick={() => handleAction(instance.id, 'start')}>
                <Play size={13} />
                {actionLoading[instance.id] === 'start' ? 'Starting...' : 'Start'}
              </button>
              <button className="btn btn-secondary btn-sm"
                disabled={instance.status === 'STOPPED' || !!actionLoading[instance.id]}
                onClick={() => handleAction(instance.id, 'stop')}>
                <Square size={13} />
                {actionLoading[instance.id] === 'stop' ? 'Stopping...' : 'Stop'}
              </button>
              <button className="btn btn-secondary btn-sm"
                disabled={!!actionLoading[instance.id]}
                onClick={() => handleAction(instance.id, 'restart')}>
                <RotateCcw size={13}
                  className={actionLoading[instance.id] === 'restart' ? 'spin' : ''} />
                {actionLoading[instance.id] === 'restart' ? 'Restarting...' : 'Restart'}
              </button>
              <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}
                onClick={() => handleOpenInstance(instance.id)}>
                <ExternalLink size={13} /> Open
              </button>
            </div>
          </div>

          <div className="card instance-card instance-card-add" onClick={() => setShowAdd(true)}>
            <Plus size={24} style={{ marginBottom: 8 }} />
            <span>Deploy New Instance</span>
          </div>
        </div>
      )}

      {showAdd    && <AddInstanceModal  onClose={() => setShowAdd(false)}    onAdded={loadInstance} />}
      {showInvite && <InviteStaffModal  onClose={() => setShowInvite(false)} />}
    </Layout>
  )
}

// ── Add Instance Modal ────────────────────────────────────────────────────
function AddInstanceModal({ onClose, onAdded }) {
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/instances/create', { name })
      onAdded()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2>New Instance</h2>
            <p style={{ margin: 0 }}>Deploy a new Odoo instance for your company.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 6px' }}>
            <X size={18} />
          </button>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Instance name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Production Server" required />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><Loader size={14} className="spin" /> Deploying...</> : 'Deploy Instance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Invite Staff Modal ────────────────────────────────────────────────────
// POST /api/invitations/invite — requires ROLE_OWNER
// Body:     InvitationRequestDTO  { email }
// Response: InvitationResponseDTO { email, status, expirationDate }
// The backend reads the company automatically from the authenticated user.
function InviteStaffModal({ onClose }) {
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
  })
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)
  const [inviteResult, setResult] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await api.post('/invitations/invite', {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
      })

      setResult(result)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleInviteAnother() {
    setSuccess(false)
    setResult(null)
    setForm({
      email: '',
      firstName: '',
      lastName: '',
    })
    setError('')
  }

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }


  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2>Invite Staff Member</h2>
            <p style={{ margin: 0 }}>
              Create a staff account and generate temporary login credentials.
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 6px' }}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

        {success ? (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0.5rem 0 1.5rem' }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'var(--success-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <Check size={24} style={{ color: 'var(--success)' }} />
              </div>

              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
                Staff account created
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Credentials were generated for <strong>{inviteResult?.email || form.email}</strong>
              </div>
            </div>

            {inviteResult && (
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                marginBottom: '1.5rem'
              }}>
                {[
                  { label: 'Email', value: inviteResult.email },
                  { label: 'Status', value: inviteResult.status },
                  {
                    label: 'Expires',
                    value: inviteResult.expirationDate
                      ? new Date(inviteResult.expirationDate).toLocaleString()
                      : '—'
                  },
                  {
                    label: 'Temporary Password',
                    value: inviteResult.temporaryPassword || '—'
                  },
                ].map(({ label, value }, i, arr) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      fontSize: 13,
                      borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                      gap: 12
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontWeight: 500, textAlign: 'right', wordBreak: 'break-word' }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                marginBottom: '1rem',
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              Save this temporary password now. Later, when email sending is integrated, this can be sent automatically.
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleInviteAnother}>
                <Mail size={14} /> Invite another
              </button>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="label">First name</label>
                <input
                  className="input"
                  value={form.firstName}
                  onChange={e => updateField('firstName', e.target.value)}
                  placeholder="John"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="label">Last name</label>
                <input
                  className="input"
                  value={form.lastName}
                  onChange={e => updateField('lastName', e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Email address</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={e => updateField('email', e.target.value)}
                placeholder="staff@company.com"
                required
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                A staff account will be created immediately and a temporary password will be generated.
              </span>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading
                  ? <><Loader size={14} className="spin" /> Creating...</>
                  : <><Mail size={14} /> Create Staff Account</>
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}