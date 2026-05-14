import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { api } from '../../utils/api'
import {
  Loader, AlertCircle, Calendar, CheckCircle,
  Zap, Shield, Building2, ArrowRight, Users
} from 'lucide-react'

/**
 * Subscription page for OWNER role.
 *
 * API calls:
 *   GET /api/subscription          → SubscriptionResponseDTO
 *     { companyName, planType, status, startDate, endDate, userEmail }
 *
 *   GET /api/subscription/plans    → SubscriptionPlanDTO[]
 *     [{ code, label, includedUsers, paid }]
 *     Plans: TRIAL, PREMIUM, ENTERPRISE
 *
 * Status values (SubscriptionStatus enum):
 *   ACTIVE, EXPIRED, SUSPENDED
 *
 * Plan types (PlanType enum):
 *   TRIAL, PREMIUM, ENTERPRISE
 */

// Icon per plan code
const PLAN_ICONS = {
  TRIAL:      Zap,
  PREMIUM:    Shield,
  ENTERPRISE: Building2,
}

// Badge class per status
function statusBadge(status) {
  if (status === 'ACTIVE')    return 'badge-success'
  if (status === 'EXPIRED')   return 'badge-danger'
  if (status === 'SUSPENDED') return 'badge-warning'
  return 'badge-info'
}

export default function SubscriptionPage() {
  const [sub, setSub]         = useState(null)
  const [plans, setPlans]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [upgrading, setUpgrading] = useState(null) // which plan code is being selected

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      // Run both calls in parallel
      const [subData, plansData] = await Promise.all([
        api.get('/subscription'),
        api.get('/subscription/plans').catch(() => []), // graceful fallback
      ])
      setSub(subData)
      setPlans(plansData || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Days remaining — endDate is a LocalDateTime array from Jackson: [year,month,day,h,m,s]
  // OR an ISO string depending on your Jackson config. We handle both.
  function parseDateSafe(raw) {
    if (!raw) return null
    if (Array.isArray(raw)) {
      // LocalDateTime serialised as [year, month, day, hour, minute, second, nano]
      const [y, mo, d, h = 0, mi = 0, s = 0] = raw
      return new Date(y, mo - 1, d, h, mi, s)
    }
    return new Date(raw)
  }

  const endDate   = parseDateSafe(sub?.endDate)
  const startDate = parseDateSafe(sub?.startDate)

  const daysLeft = endDate
    ? Math.max(0, Math.ceil((endDate - new Date()) / 86400000))
    : null

  const isActive = sub?.status === 'ACTIVE'

  // Progress bar percentage (time elapsed vs total duration)
  function getProgress() {
    if (!startDate || !endDate) return 0
    const total   = endDate   - startDate
    const elapsed = new Date() - startDate
    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  }

  function progressColor(pct) {
    if (pct > 85) return 'var(--danger)'
    if (pct > 65) return 'var(--warning)'
    return 'var(--success)'
  }

  async function handleUpgrade(companyName, planCode) {
    if (planCode === sub?.planType) return
    if (planCode === 'ENTERPRISE') {
      // Enterprise requires contacting sales — no self-serve upgrade
      alert('Please contact our sales team to upgrade to Enterprise.')
      return
    }
    setUpgrading(planCode)
    try { 
      await api.put(`/subscription/UpgradeSubscription/${companyName}/${planCode}`).catch(err => {
        throw new Error(err.message || 'Upgrade failed')
      })
      // await loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setUpgrading(null)
    }
  }

  if (loading) {
    return <Layout><div className="empty-state"><Loader size={24} className="spin" /></div></Layout>
  }

  const pct = getProgress()

  return (
    <Layout>
      <div className="page-header">
        <h1>Subscription</h1>
        <p>Your current plan, usage, and available upgrades.</p>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {sub ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

          {/* ── Left: Current plan details ── */}
          <div>
            <div className="card" style={{ marginBottom: '1rem' }}>
              {/* Plan header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.5rem' }}>
                {(() => {
                  const Icon = PLAN_ICONS[sub.planType] || Zap
                  return (
                    <div style={{
                      width: 48, height: 48, borderRadius: 'var(--radius-md)',
                      background: isActive ? 'var(--success-soft)' : 'var(--bg-elevated)',
                      color: isActive ? 'var(--success)' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={22} />
                    </div>
                  )
                })()}
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
                    {sub.planType || 'Unknown Plan'}
                  </div>
                  <span className={`badge ${statusBadge(sub.status)}`}>{sub.status}</span>
                </div>
              </div>

              <div className="divider" />

              {/* Detail rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: '1rem' }}>
                {[
                  { label: 'Company',   value: sub.companyName || '—' },
                  { label: 'Account',   value: sub.userEmail   || '—' },
                  {
                    label: 'Start date',
                    value: startDate
                      ? startDate.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
                      : '—'
                  },
                  {
                    label: 'End date',
                    value: endDate
                      ? endDate.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
                      : '—'
                  },
                  {
                    label: 'Days remaining',
                    value: daysLeft !== null
                      ? <span style={{ color: daysLeft <= 3 ? 'var(--danger)' : 'inherit', fontWeight: 600 }}>
                          {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                        </span>
                      : '—'
                  },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              {startDate && endDate && (
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12,
                    color: 'var(--text-muted)', marginBottom: 6 }}>
                    <span>Start</span>
                    <span>{pct.toFixed(0)}% elapsed</span>
                    <span>End</span>
                  </div>
                  <div style={{ background: 'var(--bg-base)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct.toFixed(1)}%`, height: '100%',
                      background: progressColor(pct), borderRadius: 6,
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              )}

              {/* Expired / suspended warning */}
              {!isActive && (
                <div className="alert alert-danger" style={{ marginTop: '1.25rem' }}>
                  <AlertCircle size={14} />
                  Your subscription is <strong>{sub.status}</strong>.
                  Upgrade below to restore access.
                </div>
              )}
            </div>

            {/* Contact card */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Calendar size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Need help?</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Contact us for custom pricing or billing questions.
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                Contact Support
              </button>
            </div>
          </div>

          {/* ── Right: Available plans ── */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '1rem' }}>
              {plans.length > 0 ? 'Available Plans' : 'Plan Options'}
            </h2>

            {plans.length === 0 ? (
              <div className="card empty-state" style={{ padding: '2rem' }}>
                <Zap size={28} style={{ opacity: 0.3 }} />
                <p style={{ fontSize: 13 }}>Plan information unavailable.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {plans.map(plan => {
                  const Icon = PLAN_ICONS[plan.code] || Zap
                  const isCurrent  = plan.code === sub.planType
                  const isUpgrading = upgrading === plan.code

                  return (
                    <div key={plan.code} className="card" style={{
                      border: isCurrent ? '2px solid var(--accent)' : '1px solid var(--border)',
                      padding: '1.25rem',
                      transition: 'box-shadow var(--transition)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Icon */}
                        <div style={{
                          width: 38, height: 38, borderRadius: 'var(--radius-md)',
                          background: isCurrent ? 'var(--accent)' : 'var(--accent-soft)',
                          color: isCurrent ? '#fff' : 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Icon size={18} />
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{plan.label}</span>
                            {isCurrent && (
                              <span className="badge badge-accent" style={{ fontSize: 10 }}>Current</span>
                            )}
                            {!plan.paid && !isCurrent && (
                              <span className="badge badge-warning" style={{ fontSize: 10 }}>Trial</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            <Users size={11} style={{ display: 'inline', marginRight: 4 }} />
                            Up to {plan.includedUsers} user{plan.includedUsers !== 1 ? 's' : ''}
                            {plan.paid ? ' · Paid plan' : ' · Free trial'}
                          </div>
                        </div>

                        {/* Action */}
                        {isCurrent ? (
                          <CheckCircle size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                            onClick={() => handleUpgrade(sub.companyName, plan.code)}
                            disabled={!!upgrading}
                          >
                            {isUpgrading
                              ? <Loader size={13} className="spin" />
                              : plan.code === 'ENTERPRISE'
                                ? 'Contact Sales'
                                : <><ArrowRight size={13} /> Upgrade</>
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
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