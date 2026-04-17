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
  const [stats, setStats] = useState(null)
  const [recentInstances, setRI] = useState([])  // State for recent instances
  const [recentUsers, setRU] = useState([])  // State for recent users
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => {
      setStats({
        totalUsers: 142,
        totalInstances: 87,
        activeInstances: 64,
        monthlyRevenue: 2831,
        revenueGrowth: 12,
        pendingIssues: 3,
      })
      setLoading(false)
      loadInstances()  // Call loadInstances after mock data is set
      loadUsers()  // Call loadUsers to fetch recent users  
    }, 500)
  }, [])

  async function loadInstances() {
    setLoading(true)
    try {
      // Log the API response to check if data is being fetched correctly
      const data = await api.get('/instances/allInstances')

      // Slice the first 4 items from the response data and update state
      setRI(data.slice(-4))  // Update recentInstances with the first 4 records
    } catch (error) {
      console.error('Error loading instances:', error)
    } finally {
      setLoading(false)
    }
  }

    async function loadUsers() {
      setLoading(true)
      try {
        // GET /api/company/users → UserResponseDTO[] { id, email, firstName, lastName, role, status }
        const data = await api.get('/admin/allUsers')
        setRU(data.slice(-4))
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

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        {/* Individual stats cards */}
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
            <Link to="/admin/users" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                {recentUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                   <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{u.firstName} {u.lastName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : u.status === 'INACTIVE' ? 'badge-info' : 'badge-warning'}`}
                        style={{ fontSize: 11 }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.userRole}</td>
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