import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { api } from '../../utils/api'
import {
  Server, Plus, Play, Square, RotateCcw,
  ExternalLink, X, Loader, AlertCircle, UserPlus, Mail, Check,
  ShoppingCart, Package, BarChart2, CreditCard, Warehouse,
  Wrench, Globe, FileText, Users, ChevronRight, ArrowLeft
} from 'lucide-react'

// ── Module catalogue ──────────────────────────────────────────────────────
const ODOO_MODULES = [
  { key: 'sale_management',    label: 'Sales',           description: 'Quotations, orders, and customer pipeline management.',        icon: ShoppingCart, category: 'Commerce'    },
  { key: 'purchase',           label: 'Purchase',         description: 'Vendor bills, RFQs, and procurement workflows.',               icon: Package,      category: 'Commerce'    },
  { key: 'stock',              label: 'Inventory',        description: 'Stock moves, warehouses, and real-time traceability.',         icon: Warehouse,    category: 'Operations'  },
  { key: 'point_of_sale',      label: 'Point of Sale',    description: 'Retail checkout, sessions, and payment terminals.',            icon: CreditCard,   category: 'Commerce'    },
  { key: 'account_accountant', label: 'Accounting',       description: 'Invoices, journals, reconciliation, and financial reports.',   icon: BarChart2,    category: 'Finance'     },
  { key: 'hr',                 label: 'Human Resources',  description: 'Employees, contracts, and org-chart management.',              icon: Users,        category: 'HR'          },
  { key: 'saas_sso',           label: 'SaaS SSO',         description: 'Single sign-on integration for multi-tenant SaaS setups.',    icon: Server,       category: 'Platform',   required: true },
]

function StatusDot({ status }) {
  const cls = status === 'RUNNING' ? 'online' : status === 'STOPPED' ? 'offline' : 'pending'
  return <span className={`status-dot ${cls}`} />
}

export default function InstancesPage() {
  const [instance, setInstance]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [showAdd, setShowAdd]       = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [actionLoading, setAL]      = useState({})

  useEffect(() => { loadInstance() }, [])

  async function loadInstance() {
    setLoading(true)
    try {
      const data = await api.get('/instances/userInstance')
      setInstance(data || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleOpenInstance(id) {
    try {
      const response = await api.get(`/instances/${id}/access`)
      const url = response?.accessURL || response?.url || response
      if (url && typeof url === 'string') {
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        setError('Access URL not available.')
      }
    } catch (err) {
      setError('Could not get instance URL: ' + err.message)
    }
  }

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1>Instances</h1>
          <p>Monitor and manage your active Odoo connection.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setShowInvite(true)}>
            <UserPlus size={16} /> Invite Staff
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Instance
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={15} /> {error}
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', padding: '2px 6px' }} onClick={() => setError('')}>x</button>
        </div>
      )}

      {loading ? (
        <div className="empty-state"><Loader size={24} className="spin" /></div>
      ) : !instance ? (
        <div className="card empty-state">
          <Server size={40} />
          <h3>No instance yet</h3>
          <p>Click "Add Instance" to deploy your first Odoo instance.</p>
        </div>
      ) : (
        <div className="instances-container" style={{ width: '100%' }}>
          <div className="card instance-card" style={{ padding: '24px', width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Top row: Identity and Action */}
            <div className="ic-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="ic-icon-wrap" style={{ padding: '10px', background: 'var(--primary-soft, rgba(99,102,241,.08))', borderRadius: '8px', color: 'var(--primary)' }}><Server size={24} /></div>
                <div className="ic-meta">
                  <div className="ic-name" style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {instance.nameInstance}
                    <StatusDot status={instance.status} />
                  </div>
                  <div className="ic-type" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>ID #{instance.id} — {instance.region || 'Global'}</div>
                </div>
              </div>
              
              <div className="ic-actions">
                <button className="btn btn-primary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleOpenInstance(instance.id)}>
                  <ExternalLink size={15} /> Open Instance
                </button>
              </div>
            </div>

            {/* Core Stats Overview */}
            <div className="ic-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="ic-stat" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="ic-stat-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Status</span>
                <div>
                  <span className={`badge ${
                    instance.status === 'RUNNING' ? 'badge-success' :
                    instance.status === 'STOPPED' ? 'badge-danger' : 'badge-warning'
                  }`} style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }}>{instance.status}</span>
                </div>
              </div>

              <div className="ic-stat" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="ic-stat-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Instance Owner</span>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                  {instance.firstName || instance.lastName ? `${instance.firstName} ${instance.lastName}` : 'N/A'}
                </span>
              </div>

              <div className="ic-stat" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="ic-stat-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Endpoint URL</span>
                <span style={{ fontSize: '14px', fontWeight: '500', color: instance.url ? 'var(--success)' : 'var(--text-muted)' }}>
                  {instance.url ? 'Available & Active' : 'Not configured'}
                </span>
              </div>
            </div>

            {/* Bottom Row: Installed Modules Segment */}
            {instance.modules?.length > 0 && (
              <div className="ic-modules-section" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <span className="ic-stat-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: '10px' }}>
                  Active Modules ({instance.modules.length})
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {instance.modules.map((modKey) => {
                    const localMeta = ODOO_MODULES.find(m => m.key === modKey);
                    return (
                      <span key={modKey} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: 'var(--bg-elevated, #f3f4f6)',
                        border: '1px solid var(--border, #e5e7eb)',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}>
                        {localMeta?.icon && <localMeta.icon size={14} style={{ color: 'var(--primary)' }} />}
                        {localMeta ? localMeta.label : modKey}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}

      {showAdd    && <AddInstanceModal onClose={() => setShowAdd(false)} onAdded={loadInstance} />}
      {showInvite && <InviteStaffModal onClose={() => setShowInvite(false)} />}
    </Layout>
  )
}

// ── Add Instance Modal (2-step) ───────────────────────────────────────────
function AddInstanceModal({ onClose, onAdded }) {
  const [step, setStep]           = useState(1)           // 1 | 2
  const [name, setName]           = useState('')
  const [selected, setSelected]   = useState(new Set(['saas_sso']))  // required always on
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  // Group modules by category for the grid
  const categories = [...new Set(ODOO_MODULES.map(m => m.category))]

  function toggleModule(key) {
    const mod = ODOO_MODULES.find(m => m.key === key)
    if (mod?.required) return                              // can't deselect required modules
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function handleNextStep(e) {
    e.preventDefault()
    // if (!name.trim()) return
    setError('')
    setStep(2)
  }

  async function handleDeploy() {
    setError('')
    setLoading(true)
    try {
      // Payload matches CreatedInstanceRequestDTO { name, modules }
      await api.post('/instances/create', {
        modules: [...selected],
      })
      onAdded()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Styles scoped to this modal ──────────────────────────────────────────
  const moduleGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '10px',
    marginBottom: '1rem',
  }

  const moduleCard = (isSelected, isRequired) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '12px 14px',
    borderRadius: 'var(--radius-md)',
    border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
    background: isSelected ? 'var(--primary-soft, rgba(99,102,241,.08))' : 'var(--bg-elevated)',
    cursor: isRequired ? 'default' : 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    opacity: isRequired ? 0.7 : 1,
    position: 'relative',
    userSelect: 'none',
  })

  const checkBadge = {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      {/* Wider modal for step 2 */}
      <div className="modal" style={{ maxWidth: step === 2 ? 680 : 480, width: '100%' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {step === 2 && (
              <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)} style={{ padding: '4px 6px' }}>
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 style={{ margin: 0 }}>
                {step === 1 ? 'New Instance' : 'Select Modules'}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                {step === 1
                  ? 'Deploy a new Odoo instance for your company.'
                  : `Choose the apps to install on "${name}".`}
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1.25rem' }}>
          {[1, 2].map((s, i) => (
            <>
              <div key={s} style={{
                width: 24, height: 24, borderRadius: '50%',
                background: step >= s ? 'var(--primary)' : 'var(--border)',
                color: step >= s ? '#fff' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {s}
              </div>
              {i === 0 && (
                <div key="sep" style={{
                  flex: 1, height: 2,
                  background: step === 2 ? 'var(--primary)' : 'var(--border)',
                  transition: 'background 0.2s',
                }} />
              )}
            </>
          ))}
          {/* <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>
            {step === 1 ? 'Name your instance' : `${selected.size} module${selected.size !== 1 ? 's' : ''} selected`}
          </span> */}
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* ── Step 1: Name ── */}
        {step === 1 && (
          <form onSubmit={handleNextStep}>
            {/* <div className="form-group">
              <label className="label">Instance name *</label>
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Production Server"
                required
                autoFocus
              />
            </div> */}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">
                Choose Modules <ChevronRight size={15} />
              </button>
            </div>
          </form>
        )}

        {/* ── Step 2: Module grid ── */}
        {step === 2 && (
          <div>
            {/* Scrollable area for module cards */}
            <div style={{ maxHeight: '55vh', overflowY: 'auto', paddingRight: 4 }}>
              {categories.map(cat => (
                <div key={cat} style={{ marginBottom: '1.25rem' }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em', color: 'var(--text-muted)',
                    marginBottom: 8,
                  }}>
                    {cat}
                  </div>
                  <div style={moduleGrid}>
                    {ODOO_MODULES.filter(m => m.category === cat).map(mod => {
                      const isSelected = selected.has(mod.key)
                      const Icon = mod.icon
                      return (
                        <div
                          key={mod.key}
                          style={moduleCard(isSelected, mod.required)}
                          onClick={() => toggleModule(mod.key)}
                          role="checkbox"
                          aria-checked={isSelected}
                          tabIndex={mod.required ? -1 : 0}
                          onKeyDown={e => e.key === ' ' && toggleModule(mod.key)}
                        >
                          {isSelected && (
                            <div style={checkBadge}>
                              <Check size={11} strokeWidth={3} color="#fff" />
                            </div>
                          )}
                          <Icon size={18} style={{ color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }} />
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{mod.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                            {mod.description}
                          </div>
                          {mod.required && (
                            <div style={{
                              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                              letterSpacing: '0.05em', color: 'var(--primary)', marginTop: 2,
                            }}>
                              Required
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDeploy}
                disabled={loading || selected.size === 0}
              >
                {loading
                  ? <><Loader size={14} className="spin" /> Deploying...</>
                  : <><Server size={14} /> Deploy Instance</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Invite Staff Modal ────────────────────────────────────────────────────
function InviteStaffModal({ onClose }) {
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '' })
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)
  const [inviteResult, setResult] = useState(null)

  function updateField(key, value) { setForm(prev => ({ ...prev, [key]: value })) }
  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const result = await api.post('/invitations/invite', { email: form.email, firstName: form.firstName, lastName: form.lastName })
      setResult(result); setSuccess(true)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2>Invite Staff Member</h2>
            <p style={{ margin: 0 }}>Create a staff account and generate temporary login credentials.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 6px' }}><X size={18} /></button>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={14} /> {error}</div>}

        {success ? (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0.5rem 0 1.5rem' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Check size={24} style={{ color: 'var(--success)' }} />
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Staff account created</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Credentials were sent to <strong>{inviteResult?.email || form.email}</strong></div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setSuccess(false); setForm({ email: '', firstName: '', lastName: '' }) }}><Mail size={14} /> Invite another</button>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group"><label className="label">First name *</label><input className="input" type="text" placeholder="John" value={form.firstName} onChange={e => updateField('firstName', e.target.value)} required autoFocus /></div>
              <div className="form-group"><label className="label">Last name *</label><input className="input" type="text" placeholder="Doe" value={form.lastName} onChange={e => updateField('lastName', e.target.value)} required /></div>
            </div>
            <div className="form-group">
              <label className="label">Email address *</label>
              <input className="input" type="email" placeholder="staff@company.com" value={form.email} onChange={e => updateField('email', e.target.value)} required />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <><Loader size={14} className="spin" /> Creating...</> : <><Mail size={14} /> Create Account</>}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}