import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import {
  Users, Server, CreditCard, Activity,
  TrendingUp, AlertTriangle, ArrowRight, Circle
} from 'lucide-react'

import { api } from '../../utils/api'

function StatusDot({ status }) {
  const cls = status === 'RUNNING' ? 'online' : status === 'STOPPED' ? 'offline' : 'pending'
  return <span className={`status-dot ${cls}`} />
}

export default function AdminDashboard() {
  const [stats, setStats]           = useState(null)
  const [recentInstances, setRI]    = useState([])
  const [recentUsers, setRU]        = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    // TODO: GET /api/admin/dashboard
    setTimeout(() => {
      setStats({
        totalUsers:        142,
        totalInstances:    87,
        activeInstances:   64,
        monthlyRevenue:    2831,
        revenueGrowth:     12,
        pendingIssues:     3,
      })
      setRI([
        { id: 10, name: 'Acme Corp DB',      owner: 'john@acme.com',  status: 'RUNNING', region: 'us-east-1' },
        { id: 11, name: 'Beta Server',       owner: 'sara@beta.io',   status: 'STOPPED', region: 'eu-central-1' },
        { id: 12, name: 'Gamma Production',  owner: 'ops@gamma.com',  status: 'RUNNING', region: 'us-west-2' },
        { id: 13, name: 'Delta Worker',      owner: 'dev@delta.net',  status: 'PENDING', region: 'ap-southeast-1' },
      ])
      setRU([
        { id: 1, name: 'John Smith',   email: 'john@acme.com',  plan: 'PRO',        instances: 3, joinedAt: '2024-01-10' },
        { id: 2, name: 'Sara Lee',     email: 'sara@beta.io',   plan: 'FREE',       instances: 1, joinedAt: '2024-02-14' },
        { id: 3, name: 'Ops Team',     email: 'ops@gamma.com',  plan: 'ENTERPRISE', instances: 8, joinedAt: '2024-01-05' },
        { id: 4, name: 'Dev Delta',    email: 'dev@delta.net',  plan: 'PRO',        instances: 2, joinedAt: '2024-03-01' },
      ])
      setLoading(false)
    }, 500)
  }, [])

  if (loading) {
    return <Layout><div className="empty-state"><p>Loading admin dashboard...</p></div></Layout>
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Platform Overview</h1>
        <p>Real-time stats across all tenants and instances.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-icon"><Users size={18} /></div>
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{stats.totalUsers}</div>
          <div className="stat-sub">Owners &amp; staff</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Server size={18} /></div>
          <div className="stat-label">All Instances</div>
          <div className="stat-value">{stats.totalInstances}</div>
          <div className="stat-sub">{stats.activeInstances} active</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
            <Activity size={18} />
          </div>
          <div className="stat-label">Active Instances</div>
          <div className="stat-value">{stats.activeInstances}</div>
          <div className="stat-sub">
            {Math.round((stats.activeInstances / stats.totalInstances) * 100)}% uptime rate
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>
            <CreditCard size={18} />
          </div>
          <div className="stat-label">Monthly Revenue</div>
          <div className="stat-value" style={{ fontSize: 22 }}>${stats.monthlyRevenue.toLocaleString()}</div>
          <div className="stat-sub" style={{ color: 'var(--success)' }}>
            +{stats.revenueGrowth}% vs last month
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
            <AlertTriangle size={18} />
          </div>
          <div className="stat-label">Open Issues</div>
          <div className="stat-value">{stats.pendingIssues}</div>
          <div className="stat-sub">Needs attention</div>
        </div>
      </div>

      {/* Two-column lower section */}
      <div className="admin-dash-grid">
        {/* Recent Instances */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Recent Instances</h2>
            <Link to="/admin/instances" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                {recentInstances.map(inst => (
                  <tr key={inst.id}>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{inst.name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{inst.owner}</td>
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
            <Link to="/admin/users" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Instances</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td>
                      <span className={`badge ${u.plan === 'ENTERPRISE' ? 'badge-accent' : u.plan === 'PRO' ? 'badge-info' : 'badge-warning'}`}
                        style={{ fontSize: 11 }}>
                        {u.plan}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.instances}</td>
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
