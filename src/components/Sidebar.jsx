import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  LayoutDashboard, Server, CreditCard, User,
  Users, LogOut, Sun, Moon, Activity, ChevronRight, X
} from 'lucide-react'
import './Sidebar.css'

const OWNER_NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/instances',    icon: Server,           label: 'Instances'    },
  { to: '/subscription', icon: CreditCard,       label: 'Subscription' },
  { to: '/profile',      icon: User,             label: 'Profile'      },
]

const ADMIN_NAV = [
  { to: '/admin/dashboard',     icon: LayoutDashboard, label: 'Dashboard'     },
  { to: '/admin/instances',     icon: Server,           label: 'All Instances' },
  { to: '/admin/users',         icon: Users,            label: 'Users'         },
  { to: '/admin/subscriptions', icon: CreditCard,       label: 'Subscriptions' },
  { to: '/admin/health',        icon: Activity,         label: 'System Health' },
]

// mobileOpen and onClose are passed in from Layout for mobile drawer behaviour
export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const isAdmin  = user?.role === 'ADMIN'
  const navItems = isAdmin ? ADMIN_NAV : OWNER_NAV

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  // Backend sends firstName + lastName separately — no combined 'name' field
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || '??'

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={onClose} />
      )}

      <aside className={`sidebar ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
        {/* Mobile close button */}
        <button className="sidebar-mobile-close" onClick={onClose} aria-label="Close menu">
          <X size={18} />
        </button>

        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-logo"><span>M</span></div>
          <span className="sidebar-brand-name">Mono</span>
          {isAdmin && <span className="sidebar-admin-badge">Admin</span>}
        </div>

        {/* User card */}
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.firstName || 'User'}</span>
            <span className="sidebar-user-email">{user?.email || ''}</span>
          </div>
        </div>

        <div className="sidebar-divider" />

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                'sidebar-link' + (isActive ? ' sidebar-link-active' : '')
              }
            >
              <Icon size={17} />
              <span>{label}</span>
              <ChevronRight size={13} className="sidebar-chevron" />
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="sidebar-link sidebar-theme-btn" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <button className="sidebar-link sidebar-logout" onClick={handleLogout}>
            <LogOut size={17} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  )
}