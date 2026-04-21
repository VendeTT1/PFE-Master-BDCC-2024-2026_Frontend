import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { api } from '../../utils/api'
import { Search, Server, Play, Square, RotateCcw, Trash2, AlertCircle } from 'lucide-react'

function StatusDot({ status }) {
  const cls = status === 'RUNNING' ? 'online' : status === 'STOPPED' ? 'offline' : 'pending'
  return <span className={`status-dot ${cls}`} />
}

const STATUS_OPTIONS = ['ALL', 'RUNNING', 'STOPPED', 'PENDING']

export default function AdminInstances() {
  const [instances, setInstances] = useState([])
  const [filtered, setFiltered]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('ALL')
  const [actionLoading, setAL]    = useState({})
  const [page, setPage]           = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const PAGE_SIZE = 10

  useEffect(() => { loadInstances(page) }, [page])

  // Client-side filter on what's already loaded in this page
  useEffect(() => {
    let result = instances
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(i =>
        i.nameInstance?.toLowerCase().includes(q) ||
        i.userEmail?.toLowerCase().includes(q) ||
        i.region?.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'ALL') {
      result = result.filter(i => i.status === statusFilter)
    }
    setFiltered(result)
  }, [instances, search, statusFilter])

  async function loadInstances(pageNum = 0) {
    setLoading(true)
    setError('')
    try {
      // GET /instances/allInstances?page=0&size=10
      // Response: Page<InstanceResponseDTO> { content: [...], totalElements, totalPages }
      const data = await api.get(`/instances/allInstances?page=${pageNum}&size=${PAGE_SIZE}`)
      setInstances(data.content || [])
      setTotalPages(data.totalPages ?? 0)
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
      await loadInstances(page)
    } catch (err) {
      setError(err.message)
    } finally {
      setAL(prev => ({ ...prev, [id]: null }))
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Permanently delete this instance?')) return
    try {
      await api.del(`/instances/${id}`)
      await loadInstances(page)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>All Instances</h1>
        <p>Manage every instance across all tenant accounts.</p>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="table-filters">
        <div className="table-search-wrap">
          <Search size={14} className="table-search-icon" />
          <input className="input" style={{ paddingLeft: '2rem', maxWidth: 280 }}
            placeholder="Search by name, owner, region..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-pills">
          {STATUS_OPTIONS.map(s => (
            <button key={s}
              className={`filter-pill ${statusFilter === s ? 'filter-pill-active' : ''}`}
              onClick={() => setStatus(s)}>
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
          {filtered.length} shown
        </span>
      </div>

      {loading ? (
        <div className="empty-state"><p>Loading instances...</p></div>
      ) : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Instance</th>
                  <th>Owner</th>
                  <th>Region</th>
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
                        <span style={{ fontWeight: 500, fontSize: 13 }}>{inst.nameInstance}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{inst.userEmail}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{inst.firstName} {inst.lastName}</div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace" }}>
                      {inst.region}
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <StatusDot status={inst.status} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{inst.status}</span>
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" title="Start"
                          disabled={inst.status === 'RUNNING' || !!actionLoading[inst.id]}
                          onClick={() => handleAction(inst.id, 'start')}>
                          <Play size={13} />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Stop"
                          disabled={inst.status === 'STOPPED' || !!actionLoading[inst.id]}
                          onClick={() => handleAction(inst.id, 'stop')}>
                          <Square size={13} />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Restart"
                          disabled={!!actionLoading[inst.id]}
                          onClick={() => handleAction(inst.id, 'restart')}>
                          <RotateCcw size={13} className={actionLoading[inst.id] === 'restart' ? 'spin' : ''} />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Delete"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDelete(inst.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No instances match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: '1.5rem' }}>
              <button className="btn btn-secondary btn-sm"
                disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                Previous
              </button>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', alignSelf: 'center' }}>
                Page {page + 1} of {totalPages}
              </span>
              <button className="btn btn-secondary btn-sm"
                disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  )
}