import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import {
  Cpu, HardDrive, Wifi, Thermometer,
  RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock
} from 'lucide-react'

import { api } from '../../utils/api'

// Simple progress bar component
function ProgressBar({ value, color = 'var(--accent)' }) {
  const pct = Math.min(100, Math.max(0, value))
  const barColor =
    pct > 90 ? 'var(--danger)' :
    pct > 70 ? 'var(--warning)' :
    color

  return (
    <div style={{ background: 'var(--bg-base)', borderRadius: 6, height: 8, overflow: 'hidden', marginTop: 8 }}>
      <div style={{
        width: `${pct}%`,
        height: '100%',
        background: barColor,
        borderRadius: 6,
        transition: 'width 0.5s ease',
      }} />
    </div>
  )
}

// Alert level icon
function AlertIcon({ level }) {
  if (level === 'OK')       return <CheckCircle  size={16} style={{ color: 'var(--success)' }} />
  if (level === 'WARNING')  return <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
  if (level === 'CRITICAL') return <XCircle       size={16} style={{ color: 'var(--danger)'  }} />
  return <Clock size={16} style={{ color: 'var(--text-muted)' }} />
}

export default function SystemHealth() {
  const [health, setHealth]     = useState(null)
  const [alerts, setAlerts]     = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [lastRefresh, setLR]    = useState(new Date())

  useEffect(() => { loadHealth() }, [])

  async function loadHealth() {
    setLoading(true)
    // TODO: GET /api/admin/health — returns system metrics
    setTimeout(() => {
      setHealth({
        cpu:    42,
        memory: 67,
        disk:   55,
        network: 28,
        uptime: '14d 6h 22m',
        version: '2.4.1',
        environment: 'production',
      })
      setServices([
        { name: 'API Gateway',      status: 'OK',       latency: '12ms',  uptime: '99.99%' },
        { name: 'Database Cluster', status: 'OK',       latency: '3ms',   uptime: '99.97%' },
        { name: 'Message Queue',    status: 'WARNING',  latency: '124ms', uptime: '99.80%' },
        { name: 'Storage Service',  status: 'OK',       latency: '8ms',   uptime: '100%'   },
        { name: 'Email Service',    status: 'OK',       latency: '55ms',  uptime: '99.95%' },
        { name: 'Redis Cache',      status: 'CRITICAL', latency: '—',     uptime: '94.00%' },
      ])
      setAlerts([
        { id: 1, level: 'CRITICAL', message: 'Redis Cache is unreachable on us-west-2',      time: '5 min ago'  },
        { id: 2, level: 'WARNING',  message: 'Message Queue latency is elevated (124ms)',    time: '18 min ago' },
        { id: 3, level: 'WARNING',  message: 'Memory usage above 65% on node prod-03',        time: '1h ago'     },
      ])
      setLR(new Date())
      setLoading(false)
    }, 500)
  }

  function handleRefresh() { loadHealth() }

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>System Health</h1>
          <p>Real-time infrastructure metrics and service status.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && !health ? (
        <div className="empty-state"><p>Loading health data...</p></div>
      ) : (
        <>
          {/* Server info strip */}
          <div className="card" style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', padding: '1rem 1.5rem', flexWrap: 'wrap' }}>
            <div><span className="label" style={{ marginBottom: 2 }}>Uptime</span><span style={{ fontSize: 14, fontWeight: 500, fontFamily: "'Space Mono', monospace" }}>{health?.uptime}</span></div>
            <div><span className="label" style={{ marginBottom: 2 }}>Version</span><span style={{ fontSize: 14, fontWeight: 500 }}>v{health?.version}</span></div>
            <div><span className="label" style={{ marginBottom: 2 }}>Environment</span><span className="badge badge-success" style={{ fontSize: 11 }}>{health?.environment}</span></div>
            <div style={{ marginLeft: 'auto' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.5rem' }}>
            {[
              { icon: Cpu,         label: 'CPU Usage',     value: health?.cpu,     unit: '%' },
              { icon: HardDrive,   label: 'Memory',        value: health?.memory,  unit: '%' },
              { icon: HardDrive,   label: 'Disk Usage',    value: health?.disk,    unit: '%' },
              { icon: Wifi,        label: 'Network',       value: health?.network, unit: '%' },
            ].map(({ icon: Icon, label, value, unit }) => (
              <div key={label} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div className="stat-label">{label}</div>
                  <Icon size={15} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div className="stat-value" style={{ fontSize: 28, fontFamily: "'Space Mono', monospace" }}>
                  {value}<span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>{unit}</span>
                </div>
                <ProgressBar value={value} />
              </div>
            ))}
          </div>

          {/* Two-column: alerts + services */}
          <div className="admin-dash-grid">
            {/* Active Alerts */}
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '1rem' }}>Active Alerts</h2>
              {alerts.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <CheckCircle size={28} style={{ margin: '0 auto 8px', color: 'var(--success)' }} />
                  <p style={{ fontSize: 13 }}>All systems are operating normally.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {alerts.map(alert => (
                    <div key={alert.id} className={`alert ${alert.level === 'CRITICAL' ? 'alert-danger' : 'alert-warning'}`}
                      style={{ alignItems: 'flex-start' }}>
                      <AlertIcon level={alert.level} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{alert.message}</div>
                        <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>{alert.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Service Status */}
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '1rem' }}>Service Status</h2>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Latency</th>
                      <th>Uptime</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map(svc => (
                      <tr key={svc.name}>
                        <td style={{ fontSize: 13, fontWeight: 500 }}>{svc.name}</td>
                        <td style={{ fontSize: 12, fontFamily: "'Space Mono', monospace", color: 'var(--text-secondary)' }}>{svc.latency}</td>
                        <td style={{ fontSize: 12, fontFamily: "'Space Mono', monospace" }}>{svc.uptime}</td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <AlertIcon level={svc.status} />
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{svc.status}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  )
}
