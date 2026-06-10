import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { api } from '../../utils/api'
import { Search, Loader, AlertCircle } from 'lucide-react'

const PAGE_SIZE = 10

// ── Status badge config ───────────────────────────────────────────────────────
const STATUS_META = {
  SUCCESS:          { label: 'Paid',          cls: 'badge-success'  },
  PENDING:          { label: 'Pending',        cls: 'badge-warning'  },
  FAILED:           { label: 'Failed',         cls: 'badge-danger'   },
  CANCELLED:        { label: 'Cancelled',      cls: 'badge-secondary'},
  WAITING_CUSTOMER: { label: 'Awaiting user',  cls: 'badge-info'     },
}

const PLAN_LABELS = {
  TRIAL:      'Trial',
  PREMIUM:    'Premium',
  ENTERPRISE: 'Enterprise',
}

function fmt(n) {
  return new Intl.NumberFormat('fr-FR').format(n)
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminBillingHistory() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [page, setPage]                 = useState(0)
  const [totalPages, setTotalPages]     = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => { loadHistory(page) }, [page])

  async function loadHistory(pageNum = 0) {
    setLoading(true)
    setError('')
    try {
      // GET /api/billing/admin/history?page=0&size=20&sort=createdAt,desc
      const data = await api.get(
        `/billing/admin/history?page=${pageNum}&size=${PAGE_SIZE}&sort=createdAt,desc`
      )
      setTransactions(data.content || [])
      setTotalPages(data.totalPages ?? 0)
      setTotalElements(data.totalElements ?? 0)
    } catch (err) {
      setError(err.message || 'Failed to load billing history.')
    } finally {
      setLoading(false)
    }
  }

  // Client-side filter on the current page (search + status)
  const filtered = transactions.filter(tx => {
    const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter
    const q = search.toLowerCase()
    const matchesSearch = !search ||
      tx.transactionId?.toLowerCase().includes(q) ||
      tx.companyName?.toLowerCase().includes(q) ||
      tx.planType?.toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  const totalRevenue = transactions
    .filter(tx => tx.status === 'SUCCESS')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0)

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1>Billing History</h1>
          <p>All payment transactions across every company.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* ── Summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <SummaryCard label="Total transactions" value={totalElements} />
        <SummaryCard label="This page revenue" value={`${fmt(totalRevenue)} XOF`} />
        <SummaryCard
          label="Successful"
          value={transactions.filter(t => t.status === 'SUCCESS').length}
          sub={`of ${transactions.length} on this page`}
        />
        <SummaryCard
          label="Failed / Cancelled"
          value={transactions.filter(t => t.status === 'FAILED' || t.status === 'CANCELLED').length}
          danger
        />
      </div>

      {/* ── Filters ── */}
      <div className="table-filters">
        <div className="table-search-wrap">
          <Search size={14} className="table-search-icon" />
          <input
            className="input"
            style={{ paddingLeft: '2rem', maxWidth: 280 }}
            placeholder="Search by company, plan, transaction ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input"
          style={{ maxWidth: 160, fontSize: 13 }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All statuses</option>
          <option value="SUCCESS">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="WAITING_CUSTOMER">Awaiting user</option>
        </select>

        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
          {totalElements} transaction{totalElements !== 1 ? 's' : ''} total
        </span>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="empty-state"><Loader size={24} className="spin" /></div>
      ) : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Company</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Paid at</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => {
                  const meta = STATUS_META[tx.status] || { label: tx.status, cls: 'badge-secondary' }
                  return (
                    <tr key={tx.transactionId}>
                      <td>
                        <span style={{
                          fontFamily: 'monospace', fontSize: 11,
                          color: 'var(--text-muted)', letterSpacing: '0.02em',
                        }}>
                          {tx.transactionId}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>
                        {tx.companyName || '—'}
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ fontSize: 11 }}>
                          {PLAN_LABELS[tx.planType] || tx.planType}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, fontSize: 13, fontFamily: 'monospace' }}>
                        {fmt(tx.amount)}
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 3 }}>
                          {tx.currency}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {fmtDate(tx.createdAt)}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {tx.paidAt ? fmtDate(tx.paidAt) : '—'}
                      </td>
                      <td>
                        <span className={`badge ${meta.cls}`} style={{ fontSize: 11 }}>
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      {search || statusFilter !== 'ALL'
                        ? 'No transactions match your filters.'
                        : 'No transactions found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
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

          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
            Page {page + 1} of {totalPages} — showing {filtered.length} of {PAGE_SIZE} per page
          </div>
        </>
      )}
    </Layout>
  )
}

// ── Summary card ──────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, danger }) {
  return (
    <div style={{
      background: 'var(--card-bg, var(--surface))',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '16px 20px',
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: danger ? 'var(--danger)' : 'var(--text-primary, var(--text))' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}