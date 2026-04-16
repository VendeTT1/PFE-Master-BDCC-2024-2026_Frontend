import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { api } from '../../utils/api'
import { Loader, AlertCircle, Calendar, CheckCircle } from 'lucide-react'

export default function SubscriptionPage() {
  const [sub, setSub]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    async function load() {
      try {
        // GET /api/subscription
        // SubscriptionResponseDTO: { planType, status, startDate, endDate }
        const data = await api.get('/subscription')
        setSub(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const daysLeft = sub?.endDate
    ? Math.max(0, Math.ceil((new Date(sub.endDate) - new Date()) / 86400000))
    : null

  const isActive = sub?.status === 'ACTIVE'

  if (loading) return <Layout><div className="empty-state"><Loader size={24} className="spin" /></div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Subscription</h1>
        <p>Your current plan and subscription details.</p>
      </div>

      {error && <div className="alert alert-danger"><AlertCircle size={15} /> {error}</div>}

      {sub ? (
        <div style={{ maxWidth: 520 }}>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            {/* Plan header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.5rem' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--success-soft)' : 'var(--bg-elevated)',
                color: isActive ? 'var(--success)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle size={22} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
                  {sub.planType || 'Unknown Plan'}
                </div>
                <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                  {sub.status}
                </span>
              </div>
            </div>

            <div className="divider" />

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: '1rem' }}>
              {[
                { label: 'Start date',  value: sub.startDate ? new Date(sub.startDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                { label: 'End date',    value: sub.endDate   ? new Date(sub.endDate).toLocaleDateString('en-GB',   { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                { label: 'Days remaining', value: daysLeft !== null ? `${daysLeft} days` : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Expiry progress bar */}
            {sub.startDate && sub.endDate && (
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12,
                  color: 'var(--text-muted)', marginBottom: 6 }}>
                  <span>Start</span>
                  <span>End</span>
                </div>
                {(() => {
                  const total = new Date(sub.endDate) - new Date(sub.startDate)
                  const elapsed = new Date() - new Date(sub.startDate)
                  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100))
                  const color = pct > 85 ? 'var(--danger)' : pct > 65 ? 'var(--warning)' : 'var(--success)'
                  return (
                    <div style={{ background: 'var(--bg-base)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${pct.toFixed(1)}%`, height: '100%',
                        background: color, borderRadius: 6, transition: 'width 0.5s ease' }} />
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Calendar size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Need to upgrade or change your plan?</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Contact your administrator or reach out to our support team.
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
              Contact Support
            </button>
          </div>
        </div>
      ) : (
        !error && (
          <div className="card empty-state">
            <AlertCircle size={36} style={{ opacity: 0.4 }} />
            <h3>No subscription found</h3>
            <p>Contact your administrator to set up a plan.</p>
          </div>
        )
      )}
    </Layout>
  )
}
