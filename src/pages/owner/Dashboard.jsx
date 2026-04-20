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
  const [instance, setInstance]         = useState(null)   // single object, not array
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [actionLoading, setAL]          = useState({})

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      // GET /api/instances/userInstance
      // Response: single InstanceResponseDTO {
      //   id, firstName, lastName, nameInstance, region, status, url, userEmail
      // }
      const [inst, sub] = await Promise.all([
        api.get('/instances/userInstance'),
        api.get('/subscription').catch(() => null),
      ])
      setInstance(inst || null)
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
      await api.post(`/instances/${id}/${action}`)
      await loadData()
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
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        setError('Access URL not found in response.')
      }
    } catch (err) {
      setError('Could not get instance URL: ' + err.message)
    }
  }

  const firstName = user?.firstName || user?.email?.split('@')[0] || 'there'

  const daysLeft = subscription?.endDate
    ? Math.max(0, Math.ceil((new Date(subscription.endDate) - new Date()) / 86400000))
    : null

  if (loading) return <Layout><div className="empty-state"><p>Loading dashboard...</p></div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Good morning, {firstName} 👋</h1>
        <p>Here's what's happening with your Odoo instance today.</p>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Server size={18} /></div>
          <div className="stat-label">Instance</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {instance?.nameInstance || '—'}
          </div>
          <div className="stat-sub">Region: {instance?.region || '—'}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
            <Activity size={18} />
          </div>
          <div className="stat-label">Status</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {instance?.status || '—'}
          </div>
          <div className="stat-sub">
            {instance?.status === 'RUNNING' ? 'Instance is live' : 'Instance is offline'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>
            <CreditCard size={18} />
          </div>
          <div className="stat-label">Current Plan</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {subscription?.planType || '—'}
          </div>
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
              Ends {new Date(subscription.endDate).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      {/* Instance card */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>Your Instance</h2>
        <Link to="/instances" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Manage <ArrowRight size={14} />
        </Link>
      </div>

      {!instance ? (
        <div className="card empty-state">
          <Server size={36} />
          <h3>No instance yet</h3>
          <p>Go to Instances to create your first Odoo deployment.</p>
        </div>
      ) : (
        <div className="card dashboard-instance-card">
          <div className="dic-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Server size={18} style={{ color: 'var(--text-muted)' }} />
              <div>
                {/* nameInstance is the correct field from the API */}
                <div style={{ fontWeight: 600, fontSize: 14 }}>{instance.nameInstance}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {instance.userEmail} · {instance.region}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StatusDot status={instance.status} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                {instance.status}
              </span>
            </div>
          </div>

          <div className="dic-actions">
            <button
              className="btn btn-ghost btn-sm"
              title="Start"
              disabled={instance.status === 'RUNNING' || !!actionLoading[instance.id]}
              onClick={() => handleAction(instance.id, 'start')}
            >
              <Play size={13} />
            </button>
            <button
              className="btn btn-ghost btn-sm"
              title="Stop"
              disabled={instance.status === 'STOPPED' || !!actionLoading[instance.id]}
              onClick={() => handleAction(instance.id, 'stop')}
            >
              <Square size={13} />
            </button>
            <button
              className="btn btn-ghost btn-sm"
              title="Restart"
              disabled={!!actionLoading[instance.id]}
              onClick={() => handleAction(instance.id, 'restart')}
            >
              <RotateCcw
                size={13}
                className={actionLoading[instance.id] === 'restart' ? 'spin' : ''}
              />
            </button>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => handleOpenInstance(instance.id)}
            >
              <ExternalLink size={13} /> Open
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}
