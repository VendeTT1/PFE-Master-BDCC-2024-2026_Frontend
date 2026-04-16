import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { Search, Download, TrendingUp, Users, DollarSign, CreditCard } from 'lucide-react'

import { api } from '../../utils/api'

const PLAN_OPTIONS = ['ALL', 'FREE', 'PRO', 'ENTERPRISE']

export default function AdminSubscriptions() {
  const [subs, setSubs]           = useState([])
  const [filtered, setFiltered]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [planFilter, setPlan]     = useState('ALL')
  const [summary, setSummary]     = useState(null)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    let result = subs
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(s => s.ownerName.toLowerCase().includes(q) || s.ownerEmail.toLowerCase().includes(q))
    }
    if (planFilter !== 'ALL') {
      result = result.filter(s => s.plan === planFilter)
    }
    setFiltered(result)
  }, [subs, search, planFilter])

  // async function loadData() {
  //   setLoading(true)
  //   // TODO: GET /api/admin/subscriptions
  //   setTimeout(() => {
  //     setSummary({
  //       totalRevenue: 2831,
  //       mrr: 2831,
  //       growth: 12,
  //       totalSubs: 6,
  //       paidSubs: 4,
  //     })
  //     setSubs([
  //       { id: 1, ownerName: 'John Smith',  ownerEmail: 'john@acme.com', plan: 'PRO',        billing: 'MONTHLY', amount: 19,  status: 'ACTIVE',   nextBilling: '2025-05-01', startDate: '2024-01-10' },
  //       { id: 2, ownerName: 'Sara Lee',    ownerEmail: 'sara@beta.io',  plan: 'FREE',       billing: '—',       amount: 0,   status: 'ACTIVE',   nextBilling: '—',          startDate: '2024-02-14' },
  //       { id: 3, ownerName: 'Ops Team',    ownerEmail: 'ops@gamma.com', plan: 'ENTERPRISE', billing: 'YEARLY',  amount: 490, status: 'ACTIVE',   nextBilling: '2025-01-05', startDate: '2024-01-05' },
  //       { id: 4, ownerName: 'Dev Delta',   ownerEmail: 'dev@delta.net', plan: 'PRO',        billing: 'MONTHLY', amount: 19,  status: 'ACTIVE',   nextBilling: '2025-04-01', startDate: '2024-03-01' },
  //       { id: 5, ownerName: 'Epsilon Co',  ownerEmail: 'hi@epsilon.io', plan: 'PRO',        billing: 'YEARLY',  amount: 190, status: 'CANCELLED',nextBilling: '—',          startDate: '2023-10-01' },
  //       { id: 6, ownerName: 'Zeta Ltd',    ownerEmail: 'z@zeta.com',    plan: 'FREE',       billing: '—',       amount: 0,   status: 'ACTIVE',   nextBilling: '—',          startDate: '2024-03-15' },
  //     ])
  //     setLoading(false)
  //   }, 500)
  // }
  
  async function loadData(){
    setLoading(true)
    try{
      const data = await api.get('/subscription/all')
      setSubs(data)
    } catch (error) {
      console.error('Error fetching subscription data:', error)
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
        <p>Revenue overview and subscription management across all tenants.</p>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
              <DollarSign size={18} />
            </div>
            <div className="stat-label">Monthly Revenue</div>
            <div className="stat-value" style={{ fontSize: 22 }}>${summary.mrr.toLocaleString()}</div>
            <div className="stat-sub" style={{ color: 'var(--success)' }}>+{summary.growth}% growth</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Users size={18} /></div>
            <div className="stat-label">Total Subscribers</div>
            <div className="stat-value">{summary.totalSubs}</div>
            <div className="stat-sub">{summary.paidSubs} paid plans</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>
              <CreditCard size={18} />
            </div>
            <div className="stat-label">Paid Plans</div>
            <div className="stat-value">{summary.paidSubs}</div>
            <div className="stat-sub">{summary.totalSubs - summary.paidSubs} on free tier</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
              <TrendingUp size={18} />
            </div>
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value" style={{ fontSize: 22 }}>${summary.totalRevenue.toLocaleString()}</div>
            <div className="stat-sub">All-time</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="table-filters">
        <div className="table-search-wrap">
          <Search size={14} className="table-search-icon" />
          <input
            className="input"
            style={{ paddingLeft: '2rem', maxWidth: 260 }}
            placeholder="Search by owner..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-pills">
          {PLAN_OPTIONS.map(p => (
            <button
              key={p}
              className={`filter-pill ${planFilter === p ? 'filter-pill-active' : ''}`}
              onClick={() => setPlan(p)}
            >
              {p === 'ALL' ? 'All Plans' : p.charAt(0) + p.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><p>Loading subscriptions...</p></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Plan Type</th>
                <th>Status</th>
                <th>Start Date</th>
                {/* <th>Amount</th> */}
                <th>End Date</th>
                {/* <th>Since</th> */}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{s.companyName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.userEmail}</div>
                  </td>
                  <td>
                    <span className={`badge ${planBadgeClass(s.plan)}`} style={{ fontSize: 11 }}>{s.planType}</span>
                  </td>
                  {/* <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.billing}</td>
                  <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 13 }}>
                    {s.amount > 0 ? `$${s.amount}` : <span style={{ color: 'var(--text-muted)' }}>Free</span>}
                  </td> */}
                  <td>
                    <span className={`badge ${s.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 11 }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.endDate}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.startDate}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" title="Download invoice">
                      <Download size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No subscriptions found.
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
