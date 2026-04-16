import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { api } from '../../utils/api'
import {
  Server, Plus, Play, Square, RotateCcw,
  ExternalLink, Trash2, X, Loader, AlertCircle
} from 'lucide-react'

function StatusDot({ status }) {
  const cls = status === 'RUNNING' ? 'online' : status === 'STOPPED' ? 'offline' : 'pending'
  return <span className={`status-dot ${cls}`} />
}

export default function InstancesPage() {
  const [instances, setInstances]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [showAdd, setShowAdd]       = useState(false)
  const [actionLoading, setAL]      = useState({})

  useEffect(() => { loadInstances() }, [])

  async function loadInstances() {
    setLoading(true)
    try {
      // GET /api/instances → InstanceResponseDTO[] { id, name, url, status }
      const data = await api.get('/instances')
      setInstances(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(id, action) {
    setAL(prev => ({ ...prev, [id]: action }))
    try {
      // POST /api/instances/{id}/start | stop | restart
      await api.post(`/instances/${id}/${action}`)
      await loadInstances()
    } catch (err) {
      setError(err.message)
    } finally {
      setAL(prev => ({ ...prev, [id]: null }))
    }
  }

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

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>Instances</h1>
          <p>Monitor and manage your active Odoo connections.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Instance
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={15} /> {error}
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', padding: '2px 6px' }}
            onClick={() => setError('')}>✕</button>
        </div>
      )}

      {loading ? (
        <div className="empty-state"><Loader size={24} className="spin" /></div>
      ) : instances.length === 0 ? (
        <div className="card empty-state">
          <Server size={40} />
          <h3>No instances yet</h3>
          <p>Click "Add Instance" to deploy your first Odoo instance.</p>
        </div>
      ) : (
        <div className="instances-grid">
          {instances.map(inst => (
            <div key={inst.id} className="card instance-card">
              <div className="ic-header">
                <div className="ic-icon-wrap"><Server size={20} /></div>
                <div className="ic-meta">
                  <div className="ic-name">{inst.name}</div>
                  <div className="ic-type">ID #{inst.id}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                  <StatusDot status={inst.status} />
                </div>
              </div>

              <div className="ic-stats">
                <div className="ic-stat">
                  <span className="ic-stat-label">Status</span>
                  <span className={`badge ${inst.status === 'RUNNING' ? 'badge-success' : inst.status === 'STOPPED' ? 'badge-danger' : 'badge-warning'}`}
                    style={{ fontSize: 11 }}>{inst.status}</span>
                </div>
                <div className="ic-stat">
                  <span className="ic-stat-label">URL</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {inst.url ? 'Available' : 'Not set'}
                  </span>
                </div>
              </div>

              <div className="ic-actions">
                <button className="btn btn-secondary btn-sm"
                  disabled={inst.status === 'RUNNING' || !!actionLoading[inst.id]}
                  onClick={() => handleAction(inst.id, 'start')}>
                  <Play size={13} />
                  {actionLoading[inst.id] === 'start' ? 'Starting…' : 'Start'}
                </button>
                <button className="btn btn-secondary btn-sm"
                  disabled={inst.status === 'STOPPED' || !!actionLoading[inst.id]}
                  onClick={() => handleAction(inst.id, 'stop')}>
                  <Square size={13} />
                  {actionLoading[inst.id] === 'stop' ? 'Stopping…' : 'Stop'}
                </button>
                <button className="btn btn-secondary btn-sm"
                  disabled={!!actionLoading[inst.id]}
                  onClick={() => handleAction(inst.id, 'restart')}>
                  <RotateCcw size={13} className={actionLoading[inst.id] === 'restart' ? 'spin' : ''} />
                  {actionLoading[inst.id] === 'restart' ? 'Restarting…' : 'Restart'}
                </button>
                <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}
                  onClick={() => handleOpenInstance(inst.id)}>
                  <ExternalLink size={13} /> Open
                </button>
              </div>
            </div>
          ))}

          {/* Add card */}
          <div className="card instance-card instance-card-add" onClick={() => setShowAdd(true)}>
            <Plus size={24} style={{ marginBottom: 8 }} />
            <span>Deploy New Instance</span>
          </div>
        </div>
      )}

      {showAdd && <AddInstanceModal onClose={() => setShowAdd(false)} onAdded={loadInstances} />}
    </Layout>
  )
}

function AddInstanceModal({ onClose, onAdded }) {
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // POST /api/instances/create  → body shape TBD from backend
      // Using { name } for now — adjust if backend expects more fields
      // await api.post('/instances/create', { name })
      await api.post('/instances/create')
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
              {loading ? <><Loader size={14} className="spin" /> Deploying…</> : 'Deploy Instance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
