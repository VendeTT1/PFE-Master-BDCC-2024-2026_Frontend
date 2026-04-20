import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../utils/api'
import { Camera, Shield, KeyRound, Loader, Check, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()

  // Company info from GET /api/company
  const [company, setCompany]         = useState(null)
  const [companyLoading, setCL]       = useState(true)
  const [profileData, setProfileData] = useState(null) 

  // Company update form
  const [companyForm, setCompanyForm] = useState({ name: '', region: '' })
  const [companyLoaderBtn, setCLB]    = useState(false)
  const [companySuccess, setCS]       = useState(false)
  const [companyError, setCE]         = useState('')

  // Password form
  const [passwords, setPasswords]     = useState({ current: '', newPass: '', confirm: '' })
  const [showPw, setShowPw]           = useState({ current: false, newPass: false, confirm: false })
  const [pwLoading, setPwL]           = useState(false)
  const [pwSuccess, setPwS]           = useState(false)
  const [pwError, setPwE]             = useState('')

  useEffect(() => {
    async function loadCompany() {
      try {
        // GET /api/company → CompanyResponseDTO { id, name, region, ownerEmail, usersCount }
        const data = await api.get('/company')
        const userData = await api.get('/company/user')
        setCompany(data)
        setProfileData(userData)
        setCompanyForm({ name: data.name || '', region: data.region || '' })
      } catch (err) {
        setCE(err.message)
      } finally {
        setCL(false)
      }
    }
    loadCompany()
  }, [])

   const displayUser = profileData || {} 

  async function handleCompanySave(e) {
    e.preventDefault()
    setCE('')
    setCS(false)
    setCLB(true)
    try {
      // PUT /api/company  body: UpdateCompanyDTO { name, region }
      const updated = await api.put('/company', { name: companyForm.name, region: companyForm.region })
      setCompany(updated)
      setCS(true)
      setTimeout(() => setCS(false), 3000)
    } catch (err) {
      setCE(err.message)
    } finally {
      setCLB(false)
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    setPwE('')
    setPwS(false)
    if (passwords.newPass !== passwords.confirm) { setPwE('Passwords do not match.'); return }
    if (passwords.newPass.length < 6) { setPwE('Password must be at least 6 characters.'); return }
    setPwL(true)
    try {
      // No password change endpoint in current Swagger — placeholder
      // TODO: connect when endpoint is available: POST /api/users/me/change-password
      await new Promise(r => setTimeout(r, 800))
      setPwS(true)
      setPasswords({ current: '', newPass: '', confirm: '' })
      setTimeout(() => setPwS(false), 3000)
    } catch (err) {
      setPwE(err.message)
    } finally {
      setPwL(false)
    }
  }

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || '??'
    : '??'

  return (
    <Layout>
      <div className="page-header">
        <h1>Profile & Company</h1>
        <p>Manage your company settings and account security.</p>
      </div>

      <div className="profile-layout">
        {/* LEFT — Company info form */}
        <div className="profile-main">
          {/* Read-only user info card */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>Account Info</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Email',      value: displayUser.email },
                { label: 'First name', value: displayUser.firstName },
                { label: 'Last name',  value: displayUser.lastName },
                { label: 'Role',       value: displayUser.role },
                { label: 'Status',     value: displayUser.status },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="label" style={{ marginBottom: 0 }}>{label}</span>
                  <span style={{ fontSize: 14 }}>{value || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Company update form */}
          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>Company Settings</div>
            {companyError && <div className="alert alert-danger"><AlertCircle size={14} /> {companyError}</div>}
            {companySuccess && <div className="alert alert-success"><Check size={14} /> Company updated successfully.</div>}

            {companyLoading ? (
              <div style={{ textAlign: 'center', padding: '1rem' }}><Loader size={20} className="spin" /></div>
            ) : (
              <form onSubmit={handleCompanySave}>
                {company && (
                  <div style={{ marginBottom: '1rem', padding: '10px 12px',
                    background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)' }}>
                    <strong>Owner:</strong> {company.ownerEmail} ·{' '}
                    <strong>Users:</strong> {company.usersCount}
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Company name</label>
                    <input className="input" value={companyForm.name}
                      onChange={e => setCompanyForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Acme Corp" required />
                  </div>
                  <div className="form-group">
                    <label className="label">Region</label>
                    <input className="input" value={companyForm.region}
                      onChange={e => setCompanyForm(p => ({ ...p, region: e.target.value }))}
                      placeholder="US" />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" disabled={companyLoaderBtn}>
                    {companyLoaderBtn ? <><Loader size={14} className="spin" /> Saving…</> : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* RIGHT — avatar + security */}
        <div className="profile-aside">
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>Profile Photo</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <div className="profile-avatar-lg">{initials}</div>
              <button className="btn btn-secondary btn-sm"><Camera size={14} /> Change</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Accepts JPG, GIF or PNG. Max 800KB.</p>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
              <Shield size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Account Security</span>
            </div>

            {pwError   && <div className="alert alert-danger"><AlertCircle size={14} /> {pwError}</div>}
            {pwSuccess && <div className="alert alert-success"><Check size={14} /> Password updated.</div>}

            <form onSubmit={handlePasswordChange}>
              {[
                { key: 'current', label: 'Current Password', placeholder: '••••••••' },
                { key: 'newPass', label: 'New Password',     placeholder: 'Min. 6 characters' },
                { key: 'confirm', label: 'Confirm Password', placeholder: 'Repeat new password' },
              ].map(({ key, label, placeholder }) => (
                <div className="form-group" key={key}>
                  <label className="label">{label}</label>
                  <div style={{ position: 'relative' }}>
                    <input className="input"
                      type={showPw[key] ? 'text' : 'password'}
                      value={passwords[key]}
                      onChange={e => setPasswords(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={{ paddingRight: '2.5rem' }}
                      required />
                    <button type="button" onClick={() => setShowPw(p => ({ ...p, [key]: !p[key] }))}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center' }}>
                      {showPw[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              ))}
              <button type="submit" className="btn btn-secondary" style={{ width: '100%' }} disabled={pwLoading}>
                {pwLoading ? <><Loader size={14} className="spin" /> Updating…</> : <><KeyRound size={14} /> Update Password</>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}
