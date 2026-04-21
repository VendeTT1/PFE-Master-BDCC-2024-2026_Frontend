import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import { api } from '../../utils/api'
import {
  Users, Server, CreditCard, Activity,
  AlertTriangle, ArrowRight
} from 'lucide-react'

function StatusDot({ status }) {
  const cls = status === 'RUNNING' ? 'online' : status === 'STOPPED' ? 'offline' : 'pending'
  return <span className={`status-dot ${cls}`} />
}

export default function AdminDashboard() {
  const [recentInstances, setRI]  = useState([])
  const [recentUsers, setRU]      = useState([])
  const [totalInstances, setTI]   = useState(0)
  const [totalUsers, setTU]       = useState(0)
  const [totalSubs, setTS]        = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      // All three endpoints return Spring Page<T>:
      // { content: [...], totalElements: N, totalPages: N, number: 0, size: N }
      //
      // We pass ?size=4 so the backend only returns 4 rows for the dashboard preview.
      // For subscriptions we only need the count, so size=1 is enough.
      const [instPage, usersPage, subsPage] = await Promise.all([
        api.get('/instances/allInstances?size=4'),
        api.get('/admin/allUsers?size=4'),
        api.get('/subscription/all?size=4'),
      ])

      // .content is the array of items inside the Page wrapper
      setRI(instPage.content   || [])
      setTI(instPage.totalElements  ?? 0)

      setRU(usersPage.content  || [])
      setTU(usersPage.totalElements ?? 0)

      setTS(subsPage.content  || [])
      setTS(subsPage.totalElements  ?? 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Layout><div className="empty-state"><p>Loading admin dashboard...</p></div></Layout>
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Platform Overview</h1>
        <p>Real-time stats across all tenants and instances.</p>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon"><Users size={18} /></div>
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{totalUsers}</div>
          <div className="stat-sub">All roles</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Server size={18} /></div>
          <div className="stat-label">All Instances</div>
          <div className="stat-value">{totalInstances}</div>
          <div className="stat-sub">Across all tenants</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
            <Activity size={18} />
          </div>
          <div className="stat-label">Running</div>
          <div className="stat-value">
            {recentInstances.filter(i => i.status === 'RUNNING').length}
          </div>
          <div className="stat-sub">of latest 4 shown</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>
            <CreditCard size={18} />
          </div>
          <div className="stat-label">Subscriptions</div>
          <div className="stat-value">{totalSubs}</div>
          <div className="stat-sub">Total plans</div>
        </div>
      </div>

      <div className="admin-dash-grid">

        {/* Recent Instances */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Recent Instances</h2>
            <Link to="/admin/instances" className="btn btn-ghost btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Instance</th>
                  <th>Owner</th>
                  <th>Region</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInstances.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: 13 }}>
                      No instances yet.
                    </td>
                  </tr>
                ) : recentInstances.map(inst => (
                  <tr key={inst.id}>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{inst.nameInstance}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{inst.userEmail}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{inst.region}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <StatusDot status={inst.status} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{inst.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Users */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Recent Users</h2>
            <Link to="/admin/users" className="btn btn-ghost btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Status</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: 13 }}>
                      No users yet.
                    </td>
                  </tr>
                ) : recentUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{u.firstName} {u.lastName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td>
                      <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}
                        style={{ fontSize: 11 }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {u.userRole?.replace('ROLE_', '') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Layout>
  )
}