import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { api } from '../../utils/api'
import { Search, Download, TrendingUp, Users, CreditCard, AlertCircle } from 'lucide-react'

const PLAN_OPTIONS = ['ALL', 'FREE', 'PRO', 'ENTERPRISE']
const PAGE_SIZE = 10

export default function AdminSubscriptions() {
  const [subs, setSubs]           = useState([])
  const [filtered, setFiltered]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')
  const [planFilter, setPlan]     = useState('ALL')
  const [page, setPage]           = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalSubs, setTotalSubs] = useState(0)

  useEffect(() => { loadData(page) }, [page])

  useEffect(() => {
    let result = subs
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(s =>
        s.companyName?.toLowerCase().includes(q) ||
        s.userEmail?.toLowerCase().includes(q)
      )
    }
    if (planFilter !== 'ALL') {
      result = result.filter(s => s.planType === planFilter)
    }
    setFiltered(result)
  }, [subs, search, planFilter])

  async function loadData(pageNum = 0) {
    setLoading(true)
    setError('')
    try {
      // GET /subscriptions/all?page=0&size=10
      // Response: Page<SubscriptionResponseDTO> { content: [...], totalElements, totalPages }
      const data = await api.get(`/subscription/all?page=${pageNum}&size=${PAGE_SIZE}`)
      setSubs(data.content || [])
      setTotalPages(data.totalPages ?? 0)
      setTotalSubs(data.totalElements ?? 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function planBadgeClass(plan) {
    if (plan === 'ENTERPRISE') return 'badge-accent'
    if (plan === 'PRO')        return 'badge-info'
    return 'badge-warning'
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Subscriptions</h1>
        <p>Subscription management across all tenants.</p>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={14} /> {error}</div>}

      {/* Summary stats derived from current page data */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon"><Users size={18} /></div>
          <div className="stat-label">Total Subscriptions</div>
          <div className="stat-value">{totalSubs}</div>
          <div className="stat-sub">All tenants</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
            <CreditCard size={18} />
          </div>
          <div className="stat-label">Active</div>
          <div className="stat-value">{subs.filter(s => s.status === 'ACTIVE').length}</div>
          <div className="stat-sub">On this page</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>
            <TrendingUp size={18} />
          </div>
          <div className="stat-label">Total Pages</div>
          <div className="stat-value">{totalPages}</div>
          <div className="stat-sub">{PAGE_SIZE} per page</div>
        </div>
      </div>

      <div className="table-filters">
        <div className="table-search-wrap">
          <Search size={14} className="table-search-icon" />
          <input className="input" style={{ paddingLeft: '2rem', maxWidth: 260 }}
            placeholder="Search by company or email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-pills">
          {PLAN_OPTIONS.map(p => (
            <button key={p}
              className={`filter-pill ${planFilter === p ? 'filter-pill-active' : ''}`}
              onClick={() => setPlan(p)}>
              {p === 'ALL' ? 'All Plans' : p.charAt(0) + p.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><p>Loading subscriptions...</p></div>
      ) : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr key={s.id ?? idx}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{s.companyName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.userEmail}</div>
                    </td>
                    <td>
                      <span className={`badge ${planBadgeClass(s.planType)}`} style={{ fontSize: 11 }}>
                        {s.planType}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${s.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}
                        style={{ fontSize: 11 }}>{s.status}</span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {s.startDate ? new Date(s.startDate).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {s.endDate ? new Date(s.endDate).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" title="Download invoice">
                        <Download size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No subscriptions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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