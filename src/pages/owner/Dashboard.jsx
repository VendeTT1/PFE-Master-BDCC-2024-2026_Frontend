import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../utils/api'
import Layout from '../../components/Layout'
import { Server, CreditCard, Activity, Clock, Play, Square, RotateCcw, ExternalLink, ArrowRight, AlertCircle } from 'lucide-react'

function StatusDot({ status }) {
  const cls = status === 'RUNNING' ? 'online' : status === 'STOPPED' ? 'offline' : 'pending'
  return <span className={`status-dot ${cls}`} />
}

export default function OwnerDashboard() {
  const { user } = useAuth()
  const [instances, setInstances]     = useState([])
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [actionLoading, setAL]        = useState({})

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      // GET /api/instances  → InstanceResponseDTO[]  { id, name, url, status }
      // GET /api/subscription → SubscriptionResponseDTO { planType, status, startDate, endDate }
      const [inst, sub] = await Promise.all([
        api.get('/instances'),
        api.get('/subscription').catch(() => null),
      ])
      setInstances(inst || [])
      setSubscription(sub)
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
      await loadData() // refresh list
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

  const running = instances.filter(i => i.status === 'RUNNING').length
  const firstName = user?.firstName || user?.email?.split('@')[0] || 'there'

  // Days left in subscription
  const daysLeft = subscription?.endDate
    ? Math.max(0, Math.ceil((new Date(subscription.endDate) - new Date()) / 86400000))
    : null

  if (loading) return <Layout><div className="empty-state"><p>Loading dashboard...</p></div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Good morning, {firstName} 👋</h1>
        <p>Here's what's happening with your Odoo instances today.</p>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={15} /> {error}</div>}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Server size={18} /></div>
          <div className="stat-label">Total Instances</div>
          <div className="stat-value">{instances.length}</div>
          <div className="stat-sub">{running} running</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
            <Activity size={18} />
          </div>
          <div className="stat-label">Running</div>
          <div className="stat-value">{running}</div>
          <div className="stat-sub">of {instances.length} total</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>
            <CreditCard size={18} />
          </div>
          <div className="stat-label">Current Plan</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{subscription?.planType || '—'}</div>
          <div className="stat-sub">{subscription?.status || 'No subscription'}</div>
        </div>
        {daysLeft !== null && (
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
              <Clock size={18} />
            </div>
            <div className="stat-label">Days Left</div>
            <div className="stat-value">{daysLeft}</div>
            <div className="stat-sub">
              Ends {subscription?.endDate ? new Date(subscription.endDate).toLocaleDateString() : '—'}
            </div>
          </div>
        )}
      </div>

      {/* Instances */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>Your Instances</h2>
        <Link to="/instances" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          View all <ArrowRight size={14} />
        </Link>
      </div>

      {instances.length === 0 ? (
        <div className="card empty-state">
          <Server size={36} />
          <h3>No instances yet</h3>
          <p>Go to Instances to create your first Odoo deployment.</p>
        </div>
      ) : (
        <div className="dashboard-instances-grid">
          {instances.slice(0, 4).map(inst => (
            <div key={inst.id} className="card dashboard-instance-card">
              <div className="dic-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Server size={18} style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{inst.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID #{inst.id}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StatusDot status={inst.status} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {inst.status}
                  </span>
                </div>
              </div>
              <div className="dic-actions">
                <button className="btn btn-ghost btn-sm" title="Start"
                  disabled={inst.status === 'RUNNING' || actionLoading[inst.id]}
                  onClick={() => handleAction(inst.id, 'start')}>
                  <Play size={13} />
                </button>
                <button className="btn btn-ghost btn-sm" title="Stop"
                  disabled={inst.status === 'STOPPED' || actionLoading[inst.id]}
                  onClick={() => handleAction(inst.id, 'stop')}>
                  <Square size={13} />
                </button>
                <button className="btn btn-ghost btn-sm" title="Restart"
                  disabled={!!actionLoading[inst.id]}
                  onClick={() => handleAction(inst.id, 'restart')}>
                  <RotateCcw size={13} className={actionLoading[inst.id] === 'restart' ? 'spin' : ''} />
                </button>
                <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}
                  onClick={() => handleOpenInstance(inst.id)}>
                  <ExternalLink size={13} /> Open
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
