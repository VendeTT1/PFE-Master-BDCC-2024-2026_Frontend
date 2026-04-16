import { useState } from 'react'
import { Search, Bell, Menu } from 'lucide-react'
import './Topbar.css'

// onMenuClick is called when the hamburger is pressed on mobile
export default function Topbar({ onMenuClick }) {
  const [notifications] = useState(2)

  return (
    <header className="topbar">
      {/* Hamburger — visible only on mobile */}
      <button className="topbar-menu-btn" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={20} />
      </button>

      <div className="topbar-search">
        <Search size={15} className="topbar-search-icon" />
        <input
          type="text"
          placeholder="Search..."
          className="topbar-search-input"
        />
      </div>

      <div className="topbar-actions">
        <button className="topbar-notif-btn">
          <Bell size={18} />
          {notifications > 0 && (
            <span className="topbar-notif-badge">{notifications}</span>
          )}
        </button>
      </div>
    </header>
  )
}
