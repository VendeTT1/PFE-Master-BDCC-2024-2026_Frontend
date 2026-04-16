import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'
import {
  Search, Server, Play, Square, RotateCcw,
  Trash2, Filter, ExternalLink
} from 'lucide-react'

import { api } from '../../utils/api'

function StatusDot({ status }) {
  const cls = status === 'RUNNING' ? 'online' : status === 'STOPPED' ? 'offline' : 'pending'
  return <span className={`status-dot ${cls}`} />
}

const STATUS_OPTIONS = ['ALL', 'RUNNING', 'STOPPED', 'PENDING']

export default function AdminInstances() {
  const { user } = useAuth()
  const [instances, setInstances]   = useState([])
  const [filtered, setFiltered]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('ALL')
  const [actionLoading, setAL]      = useState({})

  useEffect(() => { loadInstances() }, [])

  // Filter whenever search or status changes
  useEffect(() => {
    let result = instances
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.owner.toLowerCase().includes(q) ||
        i.region.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'ALL') {
      result = result.filter(i => i.status === statusFilter)
    }
    setFiltered(result)
  }, [instances, search, statusFilter])

  async function loadInstances() {
    setLoading(true)
    // TODO: GET /api/admin/instances
    setTimeout(() => {
      setInstances([
        { id: 1,  name: 'Acme Production',   owner: 'john@acme.com',  ownerName: 'John Smith',  type: 'Database', region: 'us-east-1',     status: 'RUNNING', uptime: '99.9%', url: 'https://acme.odoo.com'   },
        { id: 2,  name: 'Beta API Server',   owner: 'sara@beta.io',   ownerName: 'Sara Lee',    type: 'Server',   region: 'eu-central-1',  status: 'STOPPED', uptime: '0%',    url: null                      },
        { id: 3,  name: 'Gamma Worker',      owner: 'ops@gamma.com',  ownerName: 'Ops Team',    type: 'Server',   region: 'us-west-2',     status: 'RUNNING', uptime: '99.1%', url: null                      },
        { id: 4,  name: 'Delta Cache',       owner: 'dev@delta.net',  ownerName: 'Dev Delta',   type: 'Database', region: 'ap-southeast-1',status: 'PENDING', uptime: '—',     url: null                      },
        { id: 5,  name: 'Epsilon Storage',   owner: 'ops@gamma.com',  ownerName: 'Ops Team',    type: 'Cloud',    region: 'us-east-1',     status: 'RUNNING', uptime: '100%',  url: null                      },
        { id: 6,  name: 'Zeta Dev',          owner: 'john@acme.com',  ownerName: 'John Smith',  type: 'Server',   region: 'us-west-2',     status: 'STOPPED', uptime: '0%',    url: null                      },
      ])
      setLoading(false)
    }, 500)
  }

  async function handleAction(id, action) {
    setAL(prev => ({ ...prev, [id]: action }))
    try {
      // TODO: POST /api/admin/instances/{id}/{action}
      await new Promise(r => setTimeout(r, 700))
      setInstances(prev => prev.map(i => {
        if (i.id !== id) return i
        if (action === 'start')   return { ...i, status: 'RUNNING' }
        if (action === 'stop')    return { ...i, status: 'STOPPED' }
        if (action === 'restart') return { ...i, status: 'RUNNING' }
        return i
      }))
    } finally {
      setAL(prev => ({ ...prev, [id]: null }))
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Permanently delete this instance?')) return
    // TODO: DELETE /api/admin/instances/{id}
    setInstances(prev => prev.filter(i => i.id !== id))
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>All Instances</h1>
        <p>Manage every instance across all tenant accounts.</p>
      </div>

      {/* Filters */}
      <div className="table-filters">
        <div className="table-search-wrap">
          <Search size={14} className="table-search-icon" />
          <input
            className="input"
            style={{ paddingLeft: '2rem', maxWidth: 280 }}
            placeholder="Search by name, owner, region..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-pills">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              className={`filter-pill ${statusFilter === s ? 'filter-pill-active' : ''}`}
              onClick={() => setStatus(s)}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
          {filtered.length} instance{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="empty-state"><p>Loading instances...</p></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Instance</th>
                <th>Owner</th>
                <th>Type</th>
                <th>Region</th>
                <th>Uptime</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inst => (
                <tr key={inst.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Server size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{inst.name}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{inst.ownerName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{inst.owner}</div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{inst.type}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace" }}>{inst.region}</td>
                  <td style={{ fontSize: 13, fontFamily: "'Space Mono', monospace" }}>{inst.uptime}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <StatusDot status={inst.status} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{inst.status}</span>
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Start"
                        disabled={inst.status === 'RUNNING' || actionLoading[inst.id]}
                        onClick={() => handleAction(inst.id, 'start')}
                      >
                        <Play size={13} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Stop"
                        disabled={inst.status === 'STOPPED' || actionLoading[inst.id]}
                        onClick={() => handleAction(inst.id, 'stop')}
                      >
                        <Square size={13} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Restart"
                        disabled={!!actionLoading[inst.id]}
                        onClick={() => handleAction(inst.id, 'restart')}
                      >
                        <RotateCcw size={13} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Delete"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => handleDelete(inst.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No instances match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
