import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { api } from '../../utils/api'
import { Search, UserPlus, Trash2, MoreHorizontal, Mail, X, Loader, AlertCircle } from 'lucide-react'

const PAGE_SIZE = 10

export default function AdminUsers() {
  const [users, setUsers]           = useState([])
  const [filtered, setFiltered]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [search, setSearch]         = useState('')
  const [openMenu, setOpenMenu]     = useState(null)
  const [showInvite, setShowInvite] = useState(false)
  const [page, setPage]             = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)

  useEffect(() => { loadUsers(page) }, [page])

  useEffect(() => {
    if (!search) { setFiltered(users); return }
    const q = search.toLowerCase()
    setFiltered(users.filter(u =>
      u.email?.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q)
    ))
  }, [users, search])

  async function loadUsers(pageNum = 0) {
    setLoading(true)
    try {
      // GET /admin/allUsers?page=0&size=10
      // Response: Page<UserDTO> { content: [...], totalElements, totalPages }
      const data = await api.get(`/admin/allUsers?page=${pageNum}&size=${PAGE_SIZE}`)
      setUsers(data.content || [])
      setTotalPages(data.totalPages ?? 0)
      setTotalUsers(data.totalElements ?? 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this user?')) return
    try {
      await api.del(`/admin/user/${id}`)
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch (err) {
      setError(err.message)
    }
    setOpenMenu(null)
  }

  function initials(u) {
    return `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase() || '??'
  }

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div><h1>Users</h1><p>Manage company members and staff accounts.</p></div>
        <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
          <UserPlus size={15} /> Invite User
        </button>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={14} /> {error}</div>}

      <div className="table-filters">
        <div className="table-search-wrap">
          <Search size={14} className="table-search-icon" />
          <input className="input" style={{ paddingLeft: '2rem', maxWidth: 260 }}
            placeholder="Search by name or email…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
          {totalUsers} user{totalUsers !== 1 ? 's' : ''} total
        </span>
      </div>

      {loading ? (
        <div className="empty-state"><Loader size={24} className="spin" /></div>
      ) : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="user-table-avatar">{initials(u)}</div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{u.firstName} {u.lastName}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${u.userRole?.includes('ADMIN') ? 'badge-accent' : u.userRole?.includes('OWNER') ? 'badge-info' : 'badge-warning'}`}
                        style={{ fontSize: 11 }}>
                        {u.userRole?.replace('ROLE_', '') || '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}
                        style={{ fontSize: 11 }}>{u.status}</span>
                    </td>
                    <td>
                      <div style={{ position: 'relative' }}>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '4px 6px' }}
                          onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}>
                          <MoreHorizontal size={15} />
                        </button>
                        {openMenu === u.id && (
                          <div className="instance-dropdown">
                            <button onClick={() => { setOpenMenu(null); alert(`Email: ${u.email}`) }}>
                              <Mail size={13} /> Email user
                            </button>
                            <button onClick={() => handleDelete(u.id)} style={{ color: 'var(--danger)' }}>
                              <Trash2 size={13} /> Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No users found.
                  </td></tr>
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

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onInvited={() => loadUsers(0)} />}
    </Layout>
  )
}

function InviteModal({ onClose, onInvited }) {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/invitations/invite', { email })
      setSuccess(true)
      setTimeout(() => { onInvited(); onClose() }, 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2>Invite User</h2>
            <p style={{ margin: 0 }}>Send an invitation email to add a new staff member.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 6px' }}><X size={18} /></button>
        </div>
        {error   && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">Invitation sent!</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Email address</label>
            <input className="input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="staff@company.com" required />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || success}>
              {loading ? <><Loader size={14} className="spin" /> Sending…</> : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}